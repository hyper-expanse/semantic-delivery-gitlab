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
var debug = require('debug')('semantic-release-gitlab');

module.exports = semanticRelease;

var config = {data: {}, options: {}};

function semanticRelease() {
  return gitLatestSemverTag()
    .then(function (lastTag) {
      if (lastTag) {
        debug('%s is latest version of project', lastTag);
      } else {
        debug('no previous version found for this project');
      }

      return lastTag;
    })
    .then(processLastTag);
}

function processLastTag(lastTag) {
  return new Bluebird(function (resolve, reject) {
    // If a tag exists get commits since the latest tag. If no tag exists then get all commits.
    var commits = [];
    gitRawCommits({from: lastTag.length === 0 ? '' : lastTag})
      .pipe(through(
        function (buffer, enc, cb) {
          commits.push(buffer.toString());
          cb();
        },

        function (cb) {
          debug('fetched %d commits', commits.length);

          if (commits.length === 0) {
            debug('no commits to release so terminating release process now');

            return resolve(null);
          }

          config.data.commits = commits;
          config.options.debug = false;
          config.options.scmToken = process.env.GITLAB_AUTH_TOKEN;
          config.options.insecureApi = process.env.GITLAB_INSECURE_API === 'true';
          config.options.preset = conventionalCommitsDetector(commits);

          debug('detected %s commit convention', config.options.preset);

          config.options.preset = config.options.preset === 'unknown' ?
            'angular' : config.options.preset;

          debug('using %s commit convention', config.options.preset);

          config.pkg = require(path.join(process.cwd(), 'package.json'));

          bump(lastTag, config.options.preset)
            .then(function (toBeReleasedVersion) {
              config.data.version = toBeReleasedVersion;
            })
            .then(npmUtils.setAuthToken)
            .then(function () {
              debug('publishing to npm');
            })
            .then(npmUtils.publish)
            .then(function () {
              debug('tagging git commit');

              return exec('git tag ' + config.data.version);
            })
            .then(function () {
              debug('running semantic-release-gitlab-releaser plugin');

              return gitlabReleaser(config);
            })
            .then(function () {
              debug('running semantic-release-gitlab-notifier plugin');

              return gitlabNotifier(config);
            })
            .then(function () {
              debug('finished releasing version %s', config.data.version);

              resolve(config.data.version);
            })
            .catch(reject);

          cb();
        }
    ));
  });
}
