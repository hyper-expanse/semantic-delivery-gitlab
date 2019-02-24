'use strict';

const _ = require(`lodash`);
const Bluebird = require(`bluebird`);
const debug = require(`debug`)(`semantic-release-gitlab`);
const {escape} = require(`querystring`);
const getPkgRepo = require(`get-pkg-repo`);
const glGot = require(`gl-got`);
const parser = require(`conventional-commits-parser`);
const semver = require(`semver`);
const streamify = require(`stream-array`);
const through = require(`through2`);

module.exports = notifier;

function notifier(config) {
  return new Bluebird((resolve, reject) => {
    if (!_.has(config, `pkg`)) {
      return reject(new Error('This plugin, `semantic-release-gitlab-notifier`, was not ' +
        'passed the contents of your package\'s `package.json` file. Please contact the user of ' +
        'this plugin and request that they pass the contents of `package.json` to the plugin.'));
    }

    let repoUrl;
    try {
      repoUrl = getPkgRepo(config.pkg);
      debug(`parsed repository URL using the 'get-pkg-repo' package - %O`, repoUrl);
    } catch (err) {
      return reject(err);
    }

    if (typeof config.options.scmToken !== `string` || config.options.scmToken.length === 0) {
      debug(`no SCM token provided for GitLab`);
      return reject(new Error(`No SCM token provided for GitLab.`));
    }

    let semverVersion = config.data.version;

    if (config.options.monoRepo) {
      // Default to Lerna standard of using `@` if no tagSplitter provided
      const tagSplitter = config.options.tagSplitter || '@';
      semverVersion = _.get(config, 'data.version', `${tagSplitter}`).split(tagSplitter)[1];
    }

    if (semver.valid(semverVersion) === null) {
      debug(`invalid version provided to 'semantic-release-gitlab-notifier'`);
      return reject(new Error(`Invalid version provided to 'semantic-release-gitlab-notifier'.`));
    }

    const domain = `${config.options.insecureApi ? `http` : `https`}://${repoUrl.domain}`;
    debug(`domain - ${domain}`);

    // Placed after all other code so that sanity checking has had a chance to run.
    if (config.options.dryRun) {
      return resolve(false);
    }

    const issueIds = new Set();
    streamify(config.data.commits)
      .pipe(parser())
      .pipe(through.obj((commit, enc, cb) => {
        _.forEach(_.map(commit.references, `issue`), issueIds.add.bind(issueIds));
        cb();
      }))
      .on(`finish`, () => {
        const commentPromises = generateIssueComments(
          domain,
          config.options.scmToken,
          config.data.version,
          `${repoUrl.user}/${repoUrl.project}`,
          issueIds
        );

        Bluebird.all(commentPromises)
          .then(_.ary(_.partial(resolve, true)))
          .catch(() => {
            debug('failed to post comments to GitLab. Set `NODE_DEBUG` environment variable ' +
              'to include `request` and re-run the tool to debug the issue');

            return reject(new Error(`Failed to post comment(s) to GitLab.`));
          });
      });
  });
}

// eslint-disable-next-line max-params
function generateIssueComments(domain, token, version, projectID, issueIds) {
  debug(`posting notifications to the following issues - %o`, Array.from(issueIds));

  const endpoint = `${domain}/api/v4/`;
  debug(`api endpoint - ${endpoint}`);

  return _.map(Array.from(issueIds), iid => {
    debug(`posting notification to issue ${iid}`);

    return glGot.post(`projects/${escape(projectID)}/issues/${iid}/notes`, {
      body: {
        body: `Version [${version}](${domain}/${projectID}/tags/${version}) has been released.`,
      }, endpoint, token,
    });
  });
}
