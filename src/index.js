'use strict';

var Bluebird = require('bluebird');
var bump = require('./bump');
var conventionalCommitsDetector = require('conventional-commits-detector');
var exec = Bluebird.promisify(require('child_process').exec);
var gitlabNotifier = require('semantic-release-gitlab-notifier');
var gitlabReleaser = require('semantic-release-gitlab-releaser');
var gitRawCommits = require('git-raw-commits');
var gitLatestSemverTag = Bluebird.promisify(require('git-latest-semver-tag'));
var npmUtils = require('npm-utils');
var path = require('path');
var through = require('through2');

module.exports = semanticRelease;

var config = { data: {}, options: {} };

function semanticRelease() {
  return gitLatestSemverTag()
    .then(processLastTag);
}

function processLastTag(lastTag) {
  return new Bluebird(function (resolve, reject) {

    // If a tag exists get commits since the latest tag. If no tag exists then get all commits.
    var commits = [];
    gitRawCommits({ from: lastTag.length === 0 ? '' : lastTag })
      .pipe(through(
        function (buffer, enc, cb) {
          commits.push(buffer.toString());
          cb();
        },

        function (cb) {
          config.data.commits = commits;
          config.options.debug = false;
          config.options.scmToken = process.env.GITLAB_AUTH_TOKEN;
          config.options.preset = conventionalCommitsDetector(commits);
          config.options.preset = config.options.preset === 'unknown' ?
            undefined : config.options.preset;
          config.pkg = require(path.join(process.cwd(), 'package.json'));

          var releasedVersion;
          bump(lastTag, config.options.preset)
            .then(function (toBeReleasedVersion) {
              releasedVersion = toBeReleasedVersion;
            })
            .then(npmUtils.setAuthToken)
            .then(npmUtils.publish)
            .then(function () {
              return exec('git tag ' + releasedVersion);
            })
            .then(function () {
              return gitlabReleaser(config);
            })
            .then(function () {
              return gitlabNotifier(config);
            })
            .then(function () {
              resolve(releasedVersion);
            })
            .catch(reject);

          cb();
        }
    ));
  });
}
