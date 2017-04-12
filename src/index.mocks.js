'use strict';

var proxyquire = require('proxyquire').noCallThru();
var sinon = require('sinon');

var mocks = {
  bump: sinon.stub(),
  childProcess: {
    exec: sinon.stub(),
  },
  conventionalCommitsDetector: sinon.stub(),
  gitlabNotifier: sinon.stub(),
  gitlabReleaser: sinon.stub(),
  gitLatestSemverTag: sinon.stub(),
  gitRawCommits: sinon.stub(),
  npmUtils: {
    setAuthToken: sinon.stub(),
    publish: sinon.stub(),
  },
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
    child_process: mocks.childProcess,
    'conventional-commits-detector': mocks.conventionalCommitsDetector,
    'git-latest-semver-tag': mocks.gitLatestSemverTag,
    'git-raw-commits': mocks.gitRawCommits,
    'npm-utils': mocks.npmUtils,
    'semantic-release-gitlab-notifier': mocks.gitlabNotifier,
    'semantic-release-gitlab-releaser': mocks.gitlabReleaser,
  });

  // jscs: enable
}

function reset() {
  mocks.bump.reset();
  mocks.childProcess.exec.reset();
  mocks.conventionalCommitsDetector.reset();
  mocks.gitlabNotifier.reset();
  mocks.gitlabReleaser();
  mocks.gitLatestSemverTag.reset();
  mocks.gitRawCommits.reset();
  mocks.npmUtils.setAuthToken.reset();
  mocks.npmUtils.publish.reset();
}
