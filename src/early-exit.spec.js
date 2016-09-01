'use strict';

var chai = require('chai');
var EarlyExit = require('./early-exit');

var expect = chai.expect;

describe('early-exit', function () {

  beforeEach(function () {
    this.event = new EarlyExit('exiting early');
  });

  it('is an instance of EarlyExit', function () {
    expect(this.event).to.be.an.instanceOf(EarlyExit);
  });

  it('has the expected message', function () {
    expect(this.event.message).to.equal('exiting early');
  });

  it('has the expected name', function () {
    expect(this.event.name).to.equal('EarlyExit');
  });
});
