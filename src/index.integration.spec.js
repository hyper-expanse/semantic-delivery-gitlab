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
      "repository": { "type": "git", "url": "https://gitlab.com/hyper-expanse/semantic-release-gitlab.git" }}`);

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

  describe(`existing major zero tag`, function () {
    // Some project owners prefer to start their project using a _Major Version Zero_ release, where the leading
    // zero of a Semantic Version number is the value _zero_. According to the Semantic Version (http://semver.org/)
    // standard: "Major version zero (0.y.z) is for initial development. Anything may change at any time. The public
    // API should not be considered stable."

    // By starting with major version zero, a project owner can prototype the functionality of their package, quickly
    // changing their API as they flush out the purpose and goals of their project, without committing to a publicly
    // accessible stable interface.

    // TODO: Work with upstream packages to allow `semantic-release-gitlab` to support major version zero releases.

    // At this time `semantic-release-gitlab` cannot support major version zero releases because `semver` will bump
    // a version from `0.1.0` to `1.0.0` for a `major` release which is not typically expected when using major version
    // zero. Instead, most would expect the version to increment to `0.2.0`.
    // Fixing this should happen upstream.
    // `conventional-recommended-bump` issue
    //   - https://github.com/conventional-changelog-archived-repos/conventional-recommended-bump/issues/24
    // `semver` issue
    //   - https://github.com/npm/node-semver/issues/177

    // Example:
    //   > semver.inc(`0.1.0`, `major`)
    //   '1.0.0'

    it(`should increment last tag with a patch for a fix (patch-worthy)`, function () {
      const scope = nock(`https://gitlab.com`, {encodedQueryParams: true})
        .post(`/api/v3/projects/hyper-expanse%2Fsemantic-release-gitlab/repository/tags`, {
          id: `hyper-expanse/semantic-release-gitlab`,
          tag_name: `0.1.1`,
          message: `Release 0.1.1`,
        })
        .reply(200)
      ;

      shell.exec(`git tag 0.1.0`);
      shell.exec(`git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign`);

      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(`0.1.1`)
        .then(() => scope.isDone())
      ;
    });

    it.skip(`should increment last tag with a patch for a feature (minor-worthy)`, function () {
      const scope = nock(`https://gitlab.com`, {encodedQueryParams: true})
        .post(`/api/v3/projects/hyper-expanse%2Fsemantic-release-gitlab/repository/tags`, {
          id: `hyper-expanse/semantic-release-gitlab`,
          tag_name: `0.1.1`,
          message: `Release 0.1.1`,
        })
        .reply(200)
      ;

      shell.exec(`git tag 0.1.0`);
      shell.exec(`git commit --allow-empty -m "feat(index): add cool new method" --no-gpg-sign`);

      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(`0.1.1`)
        .then(() => scope.isDone())
      ;
    });

    it.skip(`should increment last tag with a minor for a breaking change (major-worthy)`, function () {
      const scope = nock(`https://gitlab.com`, {encodedQueryParams: true})
        .post(`/api/v3/projects/hyper-expanse%2Fsemantic-release-gitlab/repository/tags`, {
          id: `hyper-expanse/semantic-release-gitlab`,
          tag_name: `0.2.0`,
          message: `Release 0.2.0`,
        })
        .reply(200)
      ;

      shell.exec(`git tag 0.1.0`);
      shell.exec(`git commit --allow-empty -m "feat(index): major change\n\nBREAKING CHANGE: change" --no-gpg-sign`);

      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(`0.2.0`)
        .then(() => scope.isDone())
      ;
    });
  });

  describe(`existing tag`, function () {
    beforeEach(function () {
      shell.exec(`git tag 1.0.0`);
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
          tag_name: `1.0.1`,
          message: `Release 1.0.1`,
        })
        .reply(200)
      ;

      shell.exec(`git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign`);

      return expect(semanticReleaseGitlab()).to.be.fulfilled
        .and.to.eventually.equal(`1.0.1`)
        .then(() => scope.isDone())
      ;
    });
  });

  describe(`releasing patches and minor versions off of a branch`, function () {
    // We want to test the ability to run `semantic-release-gitlab` off of a branch.

    // Occasionally people will encounter the following scenario:

    // Someone has released a new major version of their project. A consumer of that project reports a bug in the
    // earlier major version, and can't, for whatever reason, upgrade to the latest major version at this time. That
    // consumer would greatly benefit if the project could quickly submit a patch against the earlier major version
    // and have `semantic-release-gitlab` automatically release that version to GitLab.

    // The owner of the project should be able to create a dedicated branch off of the latest code for the previous
    // major version, push a bug fix to that branch, and have `semantic-release-gitlab` automatically release a new
    // patch version.

    beforeEach(function () {
      shell.exec(`git tag 1.0.1`);
      shell.exec(`git commit --allow-empty -m "feat(index): major change\n\nBREAKING CHANGE: change" --no-gpg-sign`);

      // Tag a new major version for this test package.
      shell.exec(`git tag 2.0.0`);

      // Checkout the package at an earlier version so that we can release a patch, or bug fix, on top of the code
      // released as part of the version 1.x.x range.
      shell.exec(`git checkout -b fix/package 1.0.1`);
    });

    it(`should release patch version within 1.x.x range instead of on the recent 2.x.x version range`, function () {
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
