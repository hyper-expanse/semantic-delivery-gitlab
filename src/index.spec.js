'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var mock = require('./index.mocks');
var nock = require('nock');
var sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);
var expect = chai.expect;

describe('semantic-release-gitlab', function () {
  var mocks = mock.mocks;
  var semanticRelease = mock.createSemanticRelease();

  before(function () {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    mocks.conventionalCommitsDetector.returns('angular');
    mocks.gitlabNotifier(true);
    mocks.gitlabReleaser.resolves(true);
    mocks.npmUtils.setAuthToken.resolves(true);
    mocks.npmUtils.publish.resolves(true);
  });

  afterEach(function () {
    mock.reset();
  });

  describe('when a tag exists', function () {

    beforeEach(function () {
      mocks.gitLatestSemverTag.yields(null, '1.0.0');
    });

    describe('when there are commits', function () {

      it('resolves with released version if there are commits to release', function (done) {
        mocks.gitRawCommits.returns(createCommitStream());
        mocks.childProcess.exec.yields(null);
        mocks.bump.resolves('1.1.0');

        semanticRelease().then(function (releasedVersion) {
          expect(releasedVersion).to.equal('1.1.0');
          expect(mocks.childProcess.exec)
            .to.have.been.calledOnce;
          expect(mocks.childProcess.exec.firstCall)
            .to.have.been.calledWith('git tag 1.1.0');

          done();
        });
      });

      it('rejects if npm publish fails', function (done) {
        mocks.gitRawCommits.returns(createCommitStream());
        mocks.childProcess.exec.yields(null);
        mocks.bump.resolves('1.1.0');
        mocks.npmUtils.publish.rejects(new Error('Unable to publish.'));

        semanticRelease().catch(function (err) {
          expect(err instanceof Error).to.be.true;
          expect(err.message).to.equal('Unable to publish.');

          done();
        });
      });

      it('resolves with a patch if there are no valid commits for release', function (done) {
        mocks.gitRawCommits.returns(createPointlessCommitStream());
        mocks.childProcess.exec.yields(null);
        mocks.bump.resolves('1.0.1');

        semanticRelease().then(function (releasedVersion) {
          expect(releasedVersion).to.equal('1.0.1');

          done();
        });
      });
    });

    describe('when there are no new commits', function () {

      it('resolves with null', function () {
        mocks.gitRawCommits.returns(createEmptyCommitStream());

        return expect(semanticRelease()).to.eventually.equal(null)
          .then(function () {
            expect(mocks.bump).to.not.have.been.called;
          });
      });
    });
  });

  describe('when a tag does not exist', function () {

    beforeEach(function () {
      mocks.gitLatestSemverTag.yields(null, '');
    });

    it('resolves with released version if there are commits to release', function (done) {
      mocks.gitRawCommits.returns(createCommitStream());
      mocks.childProcess.exec.yields(null);
      mocks.bump.resolves('1.0.0');

      semanticRelease().then(function (releasedVersion) {
        expect(releasedVersion).to.equal('1.0.0');

        done();
      });
    });

    it('rejects if npm publish fails', function (done) {
      mocks.gitRawCommits.returns(createCommitStream());
      mocks.childProcess.exec.yields('Unable to publish.');
      mocks.bump.resolves('1.0.0');

      semanticRelease().catch(function (err) {
        expect(err instanceof Error).to.be.true;
        expect(err.message).to.equal('Unable to publish.');

        done();
      });
    });

    it('resolves with a patch if there are no valid commits for release', function (done) {
      mocks.gitRawCommits.returns(createPointlessCommitStream());
      mocks.childProcess.exec.yields(null);
      mocks.bump.resolves('1.0.0');

      semanticRelease().then(function (releasedVersion) {
        expect(releasedVersion).to.equal('1.0.0');

        done();
      });
    });
  });

  describe('when `git describe` fails', function () {

    beforeEach(function () {
      mocks.gitLatestSemverTag.yields('Not a git repo.', '');
    });

    it('rejects', function (done) {
      semanticRelease().catch(function (err) {
        expect(err instanceof Error).to.be.true;
        expect(err.message).to.equal('Not a git repo.');

        done();
      });
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
