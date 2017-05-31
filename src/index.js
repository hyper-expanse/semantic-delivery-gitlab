'use strict';

const _ = require(`lodash`);
const Bluebird = require(`bluebird`);
const conventionalCommitsDetector = require(`conventional-commits-detector`);
const debug = require(`debug`)(`semantic-release-gitlab`);
const fs = require(`fs`);
const gitlabNotifier = require(`semantic-release-gitlab-notifier`);
const gitlabReleaser = require(`semantic-release-gitlab-releaser`);
const latestSemverTag = Bluebird.promisify(require(`git-latest-semver-tag`));
const rawCommitsStream = require(`git-raw-commits`);
const recommendedBump = Bluebird.promisify(require(`conventional-recommended-bump`));
const streamToArray = require(`stream-to-array`);
const path = require(`path`);
const semver = require(`semver`);
const shell = require(`shelljs`);

module.exports = semanticRelease;

function semanticRelease() {
  return latestSemverTag()
    .then(_.partial(debugAndReturn, `last tag`, _))
    .then(latestTag => streamToArray(rawCommitsStream({from: latestTag})))
    .then(_.partial(_.map, _, value => value.toString()))
    .then(_.partial(debugAndReturn, `commit messages - %O`, _))
    .then(commits => {
      if (commits.length === 0) {
        return debug(`no commits to release so skipping the other release steps`);
      }

      const config = {
        data: {
          commits,
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
        .then(recommendation => {
          debug(`recommended version bump is - %O`, recommendation);

          if (recommendation.releaseType === undefined) {
            return debug(`no recommended release so skipping the other release steps`);
          }

          return latestSemverTag()
            .then(_.partial(debugAndReturn, `last tag`, _))
            .then(latestTag => latestTag === '' ? `1.0.0` : semver.inc(latestTag, recommendation.releaseType))
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
