'use strict';

/* eslint-disable no-unused-expressions */

const chai = require(`chai`);
const chaiAsPromised = require(`chai-as-promised`);
const fs = require(`fs`);
const mocha = require(`mocha`);
const shell = require(`shelljs`);
const tmp = require(`tmp`);
const nock = require('nock');

const semanticReleaseGitlab = require(`./index`);

chai.use(chaiAsPromised);
var expect = chai.expect;

const afterEach = mocha.afterEach;
const before = mocha.before;
const beforeEach = mocha.beforeEach;
const describe = mocha.describe;
const it = mocha.it;

describe('semantic-release-gitlab', function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  before(function () {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    // Switch into a temporary directory to isolate the behavior of this tool from
    // the rest of the environment.
    this.cwd = process.cwd();
    this.tmpDir = tmp.dirSync();
    process.chdir(this.tmpDir.name);

    this.oldToken = process.env.GITLAB_AUTH_TOKEN;
    process.env.GITLAB_AUTH_TOKEN = `token`;

    // Empty `package.json` file for our publish pipeline to write a version into.
    fs.writeFileSync(`package.json`, `{ "name": "test",
      "repository": { "type": "git", "url": "https://gitlab.com/hyper-expanse/semantic-release-gitlab.git" },
      "version": "1.0.0" }`);

    // Do not console print output from tools invoked by `shelljs`.
    shell.config.silent = true;

    // Create git repository and then generate two commits, tagging each commit with a unique
    // semantic version valid tag. The second tag should be the one pulled by the pipeline.
    shell.exec(`git init`);
    shell.exec(`git config user.email "you@example.com"`);
    shell.exec(`git config user.name "Your Name"`);
    shell.exec(`git commit --allow-empty -m "init" --no-gpg-sign`);
  });

  afterEach(function () {
    process.env.GITLAB_AUTH_TOKEN = this.oldToken;
    process.chdir(this.cwd);
  });

  describe(`no existing tag`, function () {
    it(`should set initial version to 1.0.0`, function () {
      const scope = nock(`https://gitlab.com`, {encodedQueryParams: true})
        .post(`/api/v3/projects/hyper-expanse%2Fsemantic-release-gitlab/repository/tags`, {
          id: `hyper-expanse/semantic-release-gitlab`,
          tag_name: `1.0.0`,
          message: `Release 1.0.0`,
        })
        .reply(200)
      ;

      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(`1.0.0`)
        .then(() => scope.isDone())
      ;
    });
  });

  describe(`existing tag`, function () {
    beforeEach(function () {
      shell.exec(`git tag 1.0.1`);
    });

    it(`should return undefined since no commit has happened since last tag`, function () {
      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(undefined)
      ;
    });

    it(`should increment last tag with a patch`, function () {
      const scope = nock(`https://gitlab.com`, {encodedQueryParams: true})
        .post(`/api/v3/projects/hyper-expanse%2Fsemantic-release-gitlab/repository/tags`, {
          id: `hyper-expanse/semantic-release-gitlab`,
          tag_name: `1.0.2`,
          message: `Release 1.0.2`,
        })
        .reply(200)
      ;

      shell.exec(`git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign`);

      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(`1.0.2`)
        .then(() => scope.isDone())
      ;
    });
  });
});
