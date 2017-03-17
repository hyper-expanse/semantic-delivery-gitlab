'use strict';

var chai = require('chai');
var EarlyExit = require('./early-exit');
var mocha = require('mocha');

var expect = chai.expect;

var beforeEach = mocha.beforeEach;
var describe = mocha.describe;
var it = mocha.it;

describe('early-exit', function () {
  beforeEach(function () {
    this.event = new EarlyExit('exiting early');
  });

  it('is an instance of EarlyExit', function () {
    expect(this.event).to.be.an.instanceOf(EarlyExit);
  });

  it('has the expected message', function () {
    expect(this.event).to.have.ownProperty('message', 'exiting early');
  });

  it('has the expected name', function () {
    expect(this.event).to.have.ownProperty('name', 'EarlyExit');
  });
});
