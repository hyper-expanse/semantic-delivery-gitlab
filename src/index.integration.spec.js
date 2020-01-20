'use strict';

/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const fs = require('fs');
const { afterEach, before, beforeEach, describe, it } = require('mocha');
const shelljs = require('shelljs');
const tmp = require('tmp');
const nock = require('nock');
const semanticDeliveryGitlab = require('../');

shelljs.config.silent = true;

describe('semantic-delivery-gitlab', function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  before(() => {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    // Switch into a temporary directory to isolate the behavior of this tool from the rest of the environment.
    this.cwd = process.cwd();
    this.tmpDir = tmp.dirSync();
    process.chdir(this.tmpDir.name);

    // Empty `package.json` file for our publish pipeline to write a version into.
    fs.writeFileSync('package.json', `{ "name": "test",
      "repository": { "type": "git", "url": "https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab.git" }}`);

    // Create git repository and then generate two commits, tagging each commit with a unique
    // semantic version valid tag. The second tag should be the one pulled by the pipeline.
    shelljs.exec('git init');
    shelljs.exec('git config user.email "you@example.com"');
    shelljs.exec('git config user.name "Your Name"');

    // `init` comment is special as it forces the commit parser to return an "unknown" convention type.
    shelljs.exec('git commit --allow-empty -m "init" --no-gpg-sign');

    this.config = {
      token: 'token'
    };
  });

  afterEach(function () {
    process.chdir(this.cwd);
  });

  it('should do nothing when conducting a dry run', async function () {
    expect(await semanticDeliveryGitlab({ dryRun: true })).to.equal(undefined);
    expect(shelljs.exec('git tag').stdout).to.equal('');
  });

  it('should throw an error when no token provided', async function () {
    delete this.config.token;

    try {
      await semanticDeliveryGitlab(this.config);
    } catch (error) {
      expect(error.message).to.equal('No token provided for GitLab.');
      expect(shelljs.exec('git tag').stdout).to.equal('');
      return;
    }

    throw new Error();
  });

  describe('no existing tag', () => {
    it('should fetch remote repository from \'git remote\'', async function () {
      fs.unlinkSync('package.json');
      shelljs.exec('git remote add origin https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab-remote.git');

      const scope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab-remote/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        }).reply(201);

      expect(await semanticDeliveryGitlab(this.config)).to.equal('1.0.0');
      scope.isDone();
    });

    it('should set initial version to 1.0.0', async function () {
      const scope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        }).reply(201);

      expect(await semanticDeliveryGitlab(this.config)).to.equal('1.0.0');
      scope.isDone();
    });

    it('should clean up newly created tag if there\'s a failure', async function () {
      const scope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        }).reply(400);

      try {
        await semanticDeliveryGitlab(this.config);
      } catch (error) {
        expect(error.message).to.equal('Failed to create GitLab release through API: Response code 400 (Bad Request)');
        expect(shelljs.exec('git tag').stdout).to.equal('');
        scope.isDone();
        return;
      }

      throw new Error();
    });
  });

  describe('existing tag', () => {
    beforeEach(() => {
      shelljs.exec('git tag 1.0.0');
    });

    it('should return undefined since no commit has happened since last tag', async function () {
      expect(await semanticDeliveryGitlab(this.config)).to.equal(undefined);
    });

    it('should increment last tag with a patch', async function () {
      const scope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.1',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.1'
        }).reply(201);
      shelljs.exec('git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign');

      expect(await semanticDeliveryGitlab(this.config)).to.equal('1.0.1');
      scope.isDone();
    });

    it('should increment last tag with a patch when provided a valid preset', async function () {
      const scope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.1',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.1'
        })
        .reply(200);

      shelljs.exec('git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign');

      expect(await semanticDeliveryGitlab({ preset: 'angular', ...this.config })).to.equal('1.0.1');
      scope.isDone();
    });

    it('should fail when given an invalid preset', async function () {
      shelljs.exec('git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign');

      try {
        await semanticDeliveryGitlab({ preset: 'noSuchPreset', ...this.config });
      } catch (error) {
        expect(error.message).to.equal('Unable to load the "noSuchPreset" preset package. Please make sure it\'s installed.');
        return;
      }

      throw new Error();
    });
  });

  describe('commenting on references', () => {
    beforeEach(() => {
      shelljs.exec('git commit --allow-empty -m "fix(git): extract different URLs\n\nFixes #1" --no-gpg-sign');
    });

    it('should not post comments when conducting a dry run', async function () {
      expect(await semanticDeliveryGitlab({ dryRun: true, ...this.config })).to.equal(undefined);
      expect(shelljs.exec('git tag').stdout).to.equal('');
    });

    it('should not post comments when skipping notifications', async function () {
      const releaseScope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        })
        .reply(200);

      const referenceScope = nock('https://gitlab.com')
        .post(
          '/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/issues/1/notes',
          '{"body":"Version [1.0.0](https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab/tags/1.0.0) has been released."}'
        )
        .reply(404);

      await semanticDeliveryGitlab({ skipNotifications: true, ...this.config });
      expect(releaseScope.isDone()).to.be.true;
      expect(referenceScope.isDone()).to.be.false; // Returns false because we never post to the notes end-point.
      nock.cleanAll(); // Clear out the uncalled reference scope.
    });

    it('should throw an error when it fails to post a comment', async function () {
      const releaseScope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        })
        .reply(200);

      const referenceScope = nock('https://gitlab.com')
        .post(
          '/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/issues/1/notes',
          '{"body":"Version [1.0.0](https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab/tags/1.0.0) has been released."}'
        )
        .reply(404);

      try {
        await semanticDeliveryGitlab(this.config);
      } catch (error) {
        expect(error.message).to.equal('Failed to post comment to GitLab: Response code 404 (Not Found)');
        expect(shelljs.exec('git tag').stdout).to.equal('');
        releaseScope.isDone();
        referenceScope.isDone();
        return;
      }

      throw new Error();
    });

    it('should post a comment on related issues', async function () {
      const releaseScope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        })
        .reply(200);

      const referenceScope = nock('https://gitlab.com')
        .post(
          '/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/issues/1/notes',
          '{"body":"Version [1.0.0](https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab/tags/1.0.0) has been released."}'
        )
        .reply(201);

      await semanticDeliveryGitlab(this.config);
      releaseScope.isDone();
      referenceScope.isDone();
    });

    it.skip('should post a comment on related merge requests', async function () {
      shelljs.exec('Merge branch \'fix/git/urls\' into \'master\'\r\n\r\nFix/git/urls\r\n\r\nCloses #1\r\n\r\nSee merge request !2\n');

      const releaseScope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.0',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.0'
        })
        .reply(200);

      const referenceScope = nock('https://gitlab.com')
        .post(
          '/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/issues/1/notes',
          '{"body":"Version [1.0.0](https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab/tags/1.0.0) has been released."}'
        )
        .reply(201);

      await semanticDeliveryGitlab(this.config);
      releaseScope.isDone();
      referenceScope.isDone();
    });
  });

  describe('releasing patches and minor versions off of a branch', () => {
    // We want to test the ability to run `semantic-delivery-gitlab` off of a branch.

    // Occasionally people will encounter the following scenario:

    // Someone has released a new major version of their project. A consumer of that project reports a bug in the
    // earlier major version, and can't, for whatever reason, upgrade to the latest major version at this time. That
    // consumer would greatly benefit if the project could quickly submit a patch against the earlier major version
    // and have `semantic-delivery-gitlab` automatically release that version to GitLab.

    // The owner of the project should be able to create a dedicated branch off of the latest code for the previous
    // major version, push a bug fix to that branch, and have `semantic-delivery-gitlab` automatically release a new
    // patch version.

    beforeEach(() => {
      shelljs.exec('git tag 1.0.1');
      shelljs.exec('git commit --allow-empty -m "feat(index): major change\n\nBREAKING CHANGE: change" --no-gpg-sign');

      // Tag a new major version for this test package.
      shelljs.exec('git tag 2.0.0');

      // Checkout the package at an earlier version so that we can release a patch, or bug fix, on top of the code
      // released as part of the version 1.x.x range.
      shelljs.exec('git checkout -b fix/package 1.0.1');
    });

    it('should release patch version within 1.x.x range instead of on the recent 2.x.x version range', async function () {
      const scope = nock('https://gitlab.com')
        .post('/api/v4/projects/hyper-expanse%2Fopen-source%2Fsemantic-delivery-gitlab/repository/tags', {
          message: 'Release 1.0.2',
          release_description: /.*/,
          ref: /.*/,
          tag_name: '1.0.2'
        }).reply(201);
      shelljs.exec('git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign');

      expect(await semanticDeliveryGitlab(this.config)).to.equal('1.0.2');
      scope.isDone();
    });
  });
});
