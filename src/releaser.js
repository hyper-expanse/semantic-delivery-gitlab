'use strict';

const _ = require(`lodash`);
const Bluebird = require(`bluebird`);
const conventionalGitlabReleaser = Bluebird.promisify(require(`conventional-gitlab-releaser`));
const debug = require(`debug`)(`semantic-release-gitlab`);
const getPkgRepo = require(`get-pkg-repo`);

module.exports = releaser;

function releaser(config) {
  if (!_.has(config, `pkg`)) {
    return Bluebird.reject(new Error('This plugin, `semantic-release-gitlab-releaser`, was not ' +
      'passed the contents of your package\'s `package.json` file. Please contact the user of ' +
      'this plugin and request that they pass the contents of `package.json` to the plugin.'));
  }

  let repoUrl;
  try {
    repoUrl = getPkgRepo(config.pkg);
    debug(`parsed repository URL using the 'get-pkg-repo' package - %O`, repoUrl);
  } catch (err) {
    return Bluebird.reject(err);
  }

  if (repoUrl.domain === undefined) {
    debug(`no domain found in parsed repository URL while using the 'get-pkg-repo' package`);
    return Bluebird.reject(new Error(`Unable to parse the repository URL.`));
  }

  if (typeof config.options.scmToken !== `string` || config.options.scmToken.length === 0) {
    debug(`no SCM token provided for GitLab`);
    return Bluebird.reject(new Error(`No SCM token provided for GitLab.`));
  }

  const auth = {
    url: `${config.options.insecureApi ? `http` : `https`}://${repoUrl.domain}/api/v4/`,
    token: config.options.scmToken,
  };

  // Placed at the end so that all GitLab code has had a chance to be invoked, including sanity
  // checking for required input, like a GitLab token.
  if (config.options.debug) {
    debug(`config - %O`, {
      auth: {
        url: auth.url,
      },
      options: {
        preset: config.options.preset,
      },
    });
    return Bluebird.resolve(false);
  }

  return conventionalGitlabReleaser(auth, {
    preset: config.options.preset || `angular`,
  }, {
    owner: repoUrl.user,
    repository: repoUrl.project,
  }, {
    merges: null,
  })
    .then(() => {
      debug(`successfully generated GitLab release`);

      return true;
    });
}
