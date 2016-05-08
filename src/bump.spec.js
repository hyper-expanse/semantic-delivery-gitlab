'use strict';

var chai = require('chai');
var path = require('path');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);
var expect = chai.expect;

describe('bumping a package version', function () {
  var bump;
  var mocks;

  before(function () {
    mocks = {
      fs: {
        readFileSync: sinon.stub(),
        writeFileSync: sinon.spy(),
      },
      recommendedBump: sinon.stub(),
    };

    bump = proxyquire('./bump', {
      'conventional-recommended-bump': mocks.recommendedBump,
      fs: mocks.fs,
    });
  });

  beforeEach(function () {
    mocks.fs.readFileSync.returns('{"version": "0.0.0"}');
    mocks.recommendedBump.yields(null, {
      level: 1,
      reason: 'There are 0 BREAKING CHANGES and 1 features',
      releaseAs: 'minor',
    });
  });

  afterEach(function () {
    mocks.fs.readFileSync.reset();
    mocks.fs.writeFileSync.reset();
    mocks.recommendedBump.reset();
  });

  it('bump version if a tag already exists', function () {
    return bump('1.2.3', 'angular').then(function (nextRelease) {
      expect(mocks.recommendedBump).to.have.been.calledOnce
        .and.to.have.been.calledWith({ preset: 'angular' });
      expect(mocks.fs.writeFileSync).to.have.been.calledOnce
        .and.to.have.been.calledWith(
          path.join(process.cwd(), 'package.json'),
          '{\n  "version": "1.3.0"\n}\n'
        );
      expect(nextRelease).to.equal('1.3.0');
    });
  });

  it('sets version to 1.0.0 if a tag did not already exist', function () {
    return bump('', 'angular').then(function (nextRelease) {
      expect(mocks.recommendedBump).to.have.been.calledOnce
        .and.to.have.been.calledWith({ preset: 'angular' });
      expect(mocks.fs.writeFileSync).to.have.been.calledOnce
        .and.to.have.been.calledWith(
          path.join(process.cwd(), 'package.json'),
          '{\n  "version": "1.0.0"\n}\n'
        );
      expect(nextRelease).to.equal('1.0.0');
    });
  });
});
