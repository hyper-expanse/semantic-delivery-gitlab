'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
require('sinon-as-promised');

var mocks = {
  bump: sinon.stub(),
  childProcess: {
    exec: sinon.stub(),
  },
  conventionalCommitsDetector: sinon.stub(),
  gitlabReleaser: sinon.stub(),
  gitLatestSemverTag: sinon.stub(),
  gitRawCommits: sinon.stub(),
};

module.exports = {
  createSemanticRelease: createSemanticRelease,
  mocks: mocks,
  reset: reset,
};

function createSemanticRelease() {
  // jscs: disable
  return proxyquire('./index', {
    './bump': mocks.bump,
    'child_process': mocks.childProcess,
    'conventional-commits-detector': mocks.conventionalCommitsDetector,
    'git-latest-semver-tag': mocks.gitLatestSemverTag,
    'git-raw-commits': mocks.gitRawCommits,
    'semantic-release-gitlab-releaser': mocks.gitlabReleaser,
  });

  // jscs: enable
}

function reset() {
  mocks.bump.reset();
  mocks.childProcess.exec.reset();
  mocks.conventionalCommitsDetector.reset();
  mocks.gitlabReleaser();
  mocks.gitLatestSemverTag.reset();
  mocks.gitRawCommits.reset();
}
