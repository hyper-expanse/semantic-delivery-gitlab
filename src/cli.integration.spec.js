'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { afterEach, beforeEach, describe, it } = require('mocha');
const shelljs = require('shelljs');
const tmp = require('tmp');

shelljs.config.silent = true;

const preparations = [
  () => fs.writeFileSync('package.json', '{ "name": "test", "version": "1.0.0", "repository": "https://gitlab.com/hyper-expanse/open-source/semantic-release-gitlab.git" }'),
  () => {
    shelljs.exec('git init');
    shelljs.exec('git config user.email "you@example.com"');
    shelljs.exec('git config user.name "Your Name"');
  },
  () => shelljs.exec('git commit --allow-empty -m "init" --no-gpg-sign')
];

const runNPreparations = n => {
  for (let i = 0; i < n; ++i) {
    preparations[i]();
  }
};

describe('cli', function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  beforeEach(function () {
    this.binPath = path.resolve('src/cli.js');
    this.cwd = process.cwd();
    this.tmpDir = tmp.dirSync();
    process.chdir(this.tmpDir.name);
  });

  afterEach(function () {
    process.chdir(this.cwd);
  });

  describe('when releasing fails', () => {
    it('returns a non-zero code when the current directory does not contain package.json', function () {
      const cliResponse = shelljs.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string('semantic-delivery-gitlab failed for the following reason');
      expect(cliResponse.stderr).to.have.string('Error: no gitconfig to be found at');
    });

    it('returns a non-zero code when called from outside a git repository', function () {
      runNPreparations(1);
      const cliResponse = shelljs.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string('semantic-delivery-gitlab failed for the following reason');
      expect(cliResponse.stderr).to.match(/fatal: not a git repository/i);
    });

    it('returns a non-zero code when the current branch does not have commits', function () {
      runNPreparations(2);
      const cliResponse = shelljs.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string('semantic-delivery-gitlab failed for the following reason');

      // The "does not have any commits yet" message was introduced in git version 2.5.2, replacing the
      // other text.
      // - https://github.com/git/git/commit/ce113604672fed9b429b1c162b1005794fff6a17
      expect(cliResponse.stderr).to.match(/(bad default revision|does not have any commits yet)/i);
    });

    it('returns a non-zero code when there is no environment variable GITLAB_TOKEN', function () {
      runNPreparations(3);

      const oldToken = process.env.GITLAB_TOKEN;
      delete process.env.GITLAB_TOKEN;

      const cliResponse = shelljs.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string('semantic-delivery-gitlab failed for the following reason');
      expect(cliResponse.stderr).to.have.string('Error: No token provided for GitLab.');

      process.env.GITLAB_TOKEN = oldToken;
    });
  });
});
