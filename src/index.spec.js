'use strict';

/* eslint-disable no-unused-expressions */

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var mocha = require('mocha');
var mock = require('./index.mocks');
var nock = require('nock');
var sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);
var expect = chai.expect;

var afterEach = mocha.afterEach;
var before = mocha.before;
var beforeEach = mocha.beforeEach;
var describe = mocha.describe;
var it = mocha.it;

describe('semantic-release-gitlab', function () {
  before(function () {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    this.mocks = mock.mocks;
    this.semanticRelease = mock.createSemanticRelease();

    this.mocks.conventionalCommitsDetector.returns('angular');
    this.mocks.gitlabNotifier(true);
    this.mocks.gitlabReleaser.resolves(true);
    this.mocks.npmUtils.setAuthToken.resolves(true);
    this.mocks.npmUtils.publish.resolves(true);
  });

  afterEach(function () {
    mock.reset();
  });

  describe('when a tag exists', function () {
    beforeEach(function () {
      this.mocks.gitLatestSemverTag.yields(null, '1.0.0');
    });

    describe('when there are commits', function () {
      it('resolves with released version if there are commits to release', function () {
        this.mocks.gitRawCommits.returns(createCommitStream());
        this.mocks.childProcess.exec.yields(null);
        this.mocks.bump.resolves('1.1.0');

        var promise = this.semanticRelease();

        var _this = this;

        return expect(promise).to.be.fulfilled
          .and.to.eventually.equal('1.1.0')
          // eslint-disable-next-line max-nested-callbacks
          .then(function () {
            expect(_this.mocks.childProcess.exec)
              .to.have.been.calledOnce;
            expect(_this.mocks.childProcess.exec.firstCall)
              .to.have.been.calledWith('git tag 1.1.0');
          });
      });

      it('rejects if npm publish fails', function () {
        this.mocks.gitRawCommits.returns(createCommitStream());
        this.mocks.childProcess.exec.yields(null);
        this.mocks.bump.resolves('1.1.0');
        this.mocks.npmUtils.publish.rejects(new Error('Unable to publish.'));

        var promise = this.semanticRelease();

        return expect(promise).to.be.rejectedWith(Error, 'Unable to publish.');
      });

      it('resolves with a patch if there are no valid commits for release', function () {
        this.mocks.gitRawCommits.returns(createPointlessCommitStream());
        this.mocks.childProcess.exec.yields(null);
        this.mocks.bump.resolves('1.0.1');

        var promise = this.semanticRelease();

        return expect(promise).to.be.fulfilled
          .and.to.eventually.equal('1.0.1');
      });
    });

    describe('when there are no new commits', function () {
      it('resolves with null', function () {
        this.mocks.gitRawCommits.returns(createEmptyCommitStream());

        var promise = this.semanticRelease();

        var _this = this;
        return expect(promise).to.be.fulfilled
          .and.to.eventually.equal(null)
          // eslint-disable-next-line max-nested-callbacks
          .then(function () {
            expect(_this.mocks.bump).to.not.have.been.called;
          });
      });
    });
  });

  describe('when a tag does not exist', function () {
    beforeEach(function () {
      this.mocks.gitLatestSemverTag.yields(null, '');
    });

    it('resolves with released version if there are commits to release', function () {
      this.mocks.gitRawCommits.returns(createCommitStream());
      this.mocks.childProcess.exec.yields(null);
      this.mocks.bump.resolves('1.0.0');

      var promise = this.semanticRelease();

      return expect(promise).to.be.fulfilled
        .and.to.eventually.equal('1.0.0');
    });

    it('rejects if npm publish fails', function () {
      this.mocks.gitRawCommits.returns(createCommitStream());
      this.mocks.childProcess.exec.yields('Unable to publish.');
      this.mocks.bump.resolves('1.0.0');

      var promise = this.semanticRelease();

      return expect(promise).to.be.rejectedWith(Error, 'Unable to publish.');
    });

    it('resolves with a patch if there are no valid commits for release', function () {
      this.mocks.gitRawCommits.returns(createPointlessCommitStream());
      this.mocks.childProcess.exec.yields(null);
      this.mocks.bump.resolves('1.0.0');

      var promise = this.semanticRelease();

      return expect(promise).to.be.fulfilled
        .and.to.eventually.equal('1.0.0');
    });
  });

  describe('when `git describe` fails', function () {
    beforeEach(function () {
      this.mocks.gitLatestSemverTag.yields('Not a git repo.', '');
    });

    it('rejects', function () {
      var promise = this.semanticRelease();

      return expect(promise).to.be.rejectedWith(Error, 'Not a git repo.');
    });
  });
});

function createCommitStream() {
  var Readable = require('stream').Readable;
  var commitStream;

  commitStream = new Readable();
  commitStream.push('feat(widget): Add feature.\n\nCloses #1');
  commitStream.push('fix(sprocket): Parse input correctly.');
  commitStream.push(null);

  return commitStream;
}

function createEmptyCommitStream() {
  var Readable = require('stream').Readable;
  var commitStream;

  commitStream = new Readable();
  commitStream.push(null);

  return commitStream;
}

function createPointlessCommitStream() {
  var Readable = require('stream').Readable;
  var commitStream;

  commitStream = new Readable();
  commitStream.push('invalid(widget): Add non-publishable content.');
  commitStream.push(null);

  return commitStream;
}
