'use strict';

var chai = require('chai');
var EarlyExit = require('./early-exit');
var path = require('path');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);
var expect = chai.expect;

describe('bumping a package version', function () {

  before(function () {
    this.mocks = {
      fs: {
        readFileSync: sinon.stub(),
        writeFileSync: sinon.spy(),
      },
      recommendedBump: sinon.stub(),
    };

    this.bump = proxyquire('./bump', {
      'conventional-recommended-bump': this.mocks.recommendedBump,
      fs: this.mocks.fs,
    });
  });

  beforeEach(function () {
    this.mocks.fs.readFileSync.returns('{"version": "0.0.0"}');
    this.mocks.recommendedBump.yields(null, {
      level: 1,
      reason: 'There are 0 BREAKING CHANGES and 1 features',
      releaseType: 'minor',
    });
  });

  afterEach(function () {
    this.mocks.fs.readFileSync.reset();
    this.mocks.fs.writeFileSync.reset();
    this.mocks.recommendedBump.reset();
  });

  it('bump version if a tag already exists', function () {
    var promise = this.bump('1.2.3', 'angular');

    var _this = this;
    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal('1.3.0')
      .then(function () {
        expect(_this.mocks.recommendedBump).to.have.been.calledOnce
          .and.to.have.been.calledWith({ ignoreReverted: false, preset: 'angular' });
        expect(_this.mocks.fs.writeFileSync).to.have.been.calledOnce
          .and.to.have.been.calledWith(
            path.join(process.cwd(), 'package.json'),
            '{\n  "version": "1.3.0"\n}\n'
          );
      });
  });

  it('sets version to 1.0.0 if a tag did not already exist', function () {
    var promise = this.bump('', 'angular');

    var _this = this;
    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal('1.0.0')
      .then(function () {
        expect(_this.mocks.recommendedBump).to.have.been.calledOnce
          .and.to.have.been.calledWith({ ignoreReverted: false, preset: 'angular' });
        expect(_this.mocks.fs.writeFileSync).to.have.been.calledOnce
          .and.to.have.been.calledWith(
            path.join(process.cwd(), 'package.json'),
            '{\n  "version": "1.0.0"\n}\n'
          );
      });
  });

  it('throws an early exit if no changes are available for release', function () {
    this.mocks.recommendedBump.yields(null, {});

    var promise = this.bump('', 'angular');

    var _this = this;
    return promise.catch(function (error) {
      expect(error).to.be.an.instanceOf(EarlyExit)
        .and.to.have.ownProperty('message', 'No changes are available to release.');
      expect(_this.mocks.recommendedBump).to.have.been.calledOnce
        .and.to.have.been.calledWith({ ignoreReverted: false, preset: 'angular' });
      expect(_this.mocks.fs.writeFileSync).to.not.have.been.called;
    });
  });
});
