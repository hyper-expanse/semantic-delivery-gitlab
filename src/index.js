'use strict';

var Bluebird = require('bluebird');
var bump = require('./bump');
var conventionalCommitsDetector = require('conventional-commits-detector');
var exec = Bluebird.promisify(require('child_process').exec);
var gitlabReleaser = require('semantic-release-gitlab-releaser');
var gitRawCommits = require('git-raw-commits');
var gitLatestSemverTag = Bluebird.promisify(require('git-latest-semver-tag'));
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
          config.options.scmToken = process.env.GH_TOKEN;
          config.options.preset = conventionalCommitsDetector(commits);
          config.pkg = require(path.join(process.cwd(), 'package.json'));

          var releasedVersion;
          bump(lastTag, config.options.preset)
            .then(function (toBeReleasedVersion) {
              releasedVersion = toBeReleasedVersion;
              console.log(releasedVersion);
              return true; //exec('npm publish');
            })
            .then(function () {
              return exec('git tag ' + releasedVersion);
            })
            .then(function () {
              return gitlabReleaser(config);
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
