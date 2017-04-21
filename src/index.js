'use strict';

const _ = require(`lodash`);
const Bluebird = require(`bluebird`);
const commits = require(`ggit`).commits;
const conventionalCommitsDetector = require(`conventional-commits-detector`);
const debug = require(`debug`)(`semantic-release-gitlab`);
const fs = require(`fs`);
const gitlabNotifier = require(`semantic-release-gitlab-notifier`);
const gitlabReleaser = require(`semantic-release-gitlab-releaser`);
const recommendedBump = Bluebird.promisify(require(`conventional-recommended-bump`));
const path = require(`path`);
const semver = require(`semver`);
const shell = require(`shelljs`);
const tags = require(`ggit`).tags;

module.exports = semanticRelease;

function semanticRelease() {
  return commits.afterLastTag(false)
    .then(_.partial(_.map, _, `message`))
    .then(function (commits) {
      debug(`commit messages - %O`, commits);

      if (commits.length === 0) {
        return debug(`no commits to release so skipping the other release steps`);
      }

      const config = {
        data: {
          commits: commits,
        },
        pkg: JSON.parse(fs.readFileSync(path.join(process.cwd(), `package.json`))),
        options: {
          scmToken: process.env.GITLAB_AUTH_TOKEN,
          insecureApi: process.env.GITLAB_INSECURE_API === `true`,
          preset: conventionalCommitsDetector(commits),
        },
      };

      debug(`detected ${config.options.preset} commit convention`);

      config.options.preset = config.options.preset === `unknown` ?
        `angular` : config.options.preset;

      debug(`using ${config.options.preset} commit convention`);

      return recommendedBump({ignoreReverted: false, preset: config.options.preset})
        .then(function (recommendation) {
          debug(`recommended version bump is - %O`, recommendation);

          if (recommendation.releaseType === undefined) {
            return debug(`no recommended release so skipping the other release steps`);
          }

          return tags()
            .then(_.partial(debugAndReturn, `tags`, _))
            .then(_.last)
            .then(_.partial(_.get, _, `tag`))
            .then(_.partial(debugAndReturn, `last tag`, _))
            .then(latestTag => latestTag === undefined ? `1.0.0` : semver.inc(latestTag, recommendation.releaseType))
            .then(_.partial(debugAndReturn, `version to be released`, _))
            .then(_.partial(_.set, config, `data.version`, _))
            .then(config => shell.exec(`git tag ${config.data.version}`))
            .then(_.partial(gitlabReleaser, config))
            .then(_.partial(gitlabNotifier, config))
            .then(() => config.data.version)
          ;
        })
      ;
    })
  ;
}

function debugAndReturn(message, value) {
  debug(message, value);
  return value;
}
