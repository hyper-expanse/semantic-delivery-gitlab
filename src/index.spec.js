'use strict';

var mock = require('./index.mock');
var chai = require('chai');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);
var expect = chai.expect;

describe('semantic-release-gitlab', function () {
  var mocks = mock.mocks;
  var semanticRelease = mock.createSemanticRelease();

  beforeEach(function () {
    mocks.conventionalCommitsDetector.returns('angular');
    mocks.gitlabNotifier.resolves(true);
    mocks.gitlabReleaser.resolves(true);
  });

  afterEach(function () {
    mock.reset();
  });

  describe('when a tag exists', function () {

    beforeEach(function () {
      mocks.gitLatestSemverTag.yields(null, '1.0.0');
    });

    describe('when there are commits', function () {

      it('resolves with released version if there are commits to release', function () {
        mocks.gitRawCommits.returns(createCommitStream());
        mocks.childProcess.exec.yields(null);
        mocks.bump.resolves('1.1.0');

        return semanticRelease().then(function (releasedVersion) {
          expect(releasedVersion).to.equal('1.1.0');
          expect(mocks.childProcess.exec.firstCall)
            .to.have.been.calledWith('npm publish');
          expect(mocks.childProcess.exec.secondCall)
            .to.have.been.calledWith('git tag 1.1.0');
        });
      });

      it('rejects if npm publish fails', function () {
        mocks.gitRawCommits.returns(createCommitStream());
        mocks.childProcess.exec.yields('Unable to publish.');
        mocks.bump.resolves('1.1.0');

        return semanticRelease().catch(function (err) {
          expect(err instanceof Error).to.be.true;
          expect(err.message).to.equal('Unable to publish.');
        });
      });

      it('resolves with a patch if there are no valid commits for release', function () {
        mocks.gitRawCommits.returns(createPointlessCommitStream());
        mocks.childProcess.exec.yields(null);
        mocks.bump.resolves('1.0.1');

        return semanticRelease().then(function (releasedVersion) {
          expect(releasedVersion).to.equal('1.0.1');
        });
      });
    });

    describe('when there are no new commits', function () {

      it('rejects', function () {
        mocks.gitRawCommits.returns(createEmptyCommitStream());
        mocks.bump.rejects(new Error('No commits to process.'));

        return semanticRelease().catch(function (err) {
          expect(err instanceof Error).to.be.true;
          expect(err.message).to.equal('No commits to process.');
        });
      });
    });
  });

  describe('when a tag does not exist', function () {

    beforeEach(function () {
      mocks.gitLatestSemverTag.yields(null, '');
    });

    it('resolves with released version if there are commits to release', function () {
      mocks.gitRawCommits.returns(createCommitStream());
      mocks.childProcess.exec.yields(null);
      mocks.bump.resolves('1.0.0');

      return semanticRelease().then(function (releasedVersion) {
        expect(releasedVersion).to.equal('1.0.0');
      });
    });

    it('rejects if npm publish fails', function () {
      mocks.gitRawCommits.returns(createCommitStream());
      mocks.childProcess.exec.yields('Unable to publish.');
      mocks.bump.resolves('1.0.0');

      return semanticRelease().catch(function (err) {
        expect(err instanceof Error).to.be.true;
        expect(err.message).to.equal('Unable to publish.');
      });
    });

    it('resolves with a patch if there are no valid commits for release', function () {
      mocks.gitRawCommits.returns(createPointlessCommitStream());
      mocks.childProcess.exec.yields(null);
      mocks.bump.resolves('1.0.0');

      return semanticRelease().then(function (releasedVersion) {
        expect(releasedVersion).to.equal('1.0.0');
      });
    });
  });

  describe('when `git describe` fails', function () {

    beforeEach(function () {
      mocks.gitLatestSemverTag.yields('Not a git repo.', '');
    });

    it('rejects', function () {
      return semanticRelease().catch(function (err) {
        expect(err instanceof Error).to.be.true;
        expect(err.message).to.equal('Not a git repo.');
      });
    });
  });
});

function createCommitStream() {
  var Readable = require('stream').Readable;
  var commitStream;

  commitStream = new Readable();
  commitStream.push('feat(widget): Add feature.');
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
