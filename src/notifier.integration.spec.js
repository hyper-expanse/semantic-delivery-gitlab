'use strict';

/* eslint-disable no-unused-expressions */

const chai = require(`chai`);
const chaiAsPromised = require(`chai-as-promised`);
const {before, beforeEach, describe, it} = require(`mocha`);
const nock = require(`nock`);
const sinonChai = require(`sinon-chai`);

const semanticReleaseGitLabNotifier = require(`./notifier`);

chai.use(chaiAsPromised);
chai.use(sinonChai);
const {expect} = chai;

describe(`semantic-release-gitlab-notifier`, () => {
  before(() => {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    this.config = {
      data: {
        commits: [
          `chore(package): initial setup\n\n`,
          `docs(README): add an introduction paragraph\n\nAdd introduction paragraph
            for the \`test-project\` project.\n\nCloses #1\n\n`,
          `docs(README): add 'as is' statement\n\n`,
          `Merge branch 'docs/readme/intro' into 'master'\r\n\r\nDocs/readme/intro
            \r\n\r\nCloses #1\r\n\r\nSee merge request !1\n`,
        ],
        version: `1.0.0`,
      },
      options: {
        debug: false,
        scmToken: `TOKEN`,
      },
      pkg: {
        repository: `https://gitlab.com/hyper-expanse/semantic-release-gitlab-notifier.git`,
      },
    };
  });

  it(`will not post comments during dry run`, function () {
    this.config.options.dryRun = true;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(false);
  });

  it(`will reject if a 'pkg' object is not passed in the 'config' argument`, function () {
    delete this.config.pkg;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise).to.be.rejectedWith(Error, 'This plugin, ' +
      '`semantic-release-gitlab-notifier`, was not passed the contents of your package\'s ' +
      '`package.json` file. Please contact the user of this plugin and request that they pass ' +
      'the contents of `package.json` to the plugin.');
  });

  it(`will reject if no repository information in 'pkg' property of 'config'`, function () {
    delete this.config.pkg.repository;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error);
  });

  it(`will reject if no SCM token provided`, function () {
    delete this.config.options.scmToken;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `No SCM token provided for GitLab.`);
  });

  it(`will reject if a version is not provided`, function () {
    delete this.config.data.version;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Invalid version provided to 'semantic-release-gitlab-notifier'.`);
  });

  it(`will reject if an invalid version is provided`, function () {
    this.config.data.version = `a.b.c`;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Invalid version provided to 'semantic-release-gitlab-notifier'.`);
  });

  it(`will reject if monoRepo option isn't passed for monoRepo version`, function () {
    this.config.data.version = `my-mono-repo@1.0.0`;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Invalid version provided to 'semantic-release-gitlab-notifier'.`);
  });

  it(`will reject if an invalid version for mono repos is provided`, function () {
    this.config.options.monoRepo = true;
    this.config.data.version = `my-mono-repo@a.b.c`;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Invalid version provided to 'semantic-release-gitlab-notifier'.`);
  });

  it(`will reject if an incorrect tagSplitter is passed into options`, function () {
    this.config.options.monoRepo = true;
    this.config.options.tagSplitter = '#';
    this.config.data.version = `my-mono-repo@1.0.0`;

    const promise = semanticReleaseGitLabNotifier(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Invalid version provided to 'semantic-release-gitlab-notifier'.`);
  });

  it(`will reject if it fails to create a GitLab comment`, function () {
    const notesResponse = nock(`https://gitlab.com/`, {encodedQueryParams: true})
      .post(/.*/)
      .times(1)
      .reply(404);

    const promise = semanticReleaseGitLabNotifier(this.config);

    return promise
      .catch(error => {
        expect(error).to.an.instanceof(Error)
          .and.to.have.property(`message`, `Failed to post comment(s) to GitLab.`);

        notesResponse.done();
      });
  });

  it(`resolves with true on successful GitLab comment`, function () {
    const notesResponse = generateNotesResponse();

    const promise = semanticReleaseGitLabNotifier(this.config);

    return promise
      .then(result => {
        expect(result).to.be.true;

        notesResponse.done();
      });
  });

  describe(`alternative repository URLs`, () => {
    it(`should succeed with SSH URL - git@gitlab.com`, function () {
      this.config.pkg.repository = `git@gitlab.com/hyper-expanse/semantic-release-gitlab-notifier.git`;

      const notesResponse = generateNotesResponse();

      const promise = semanticReleaseGitLabNotifier(this.config);

      return promise
        .then(result => {
          expect(result).to.be.true;

          notesResponse.done();
        });
    });

    it(`should succeed with company deployed SSH URL - git@gitlab.company.com`, function () {
      this.config.pkg.repository = `git@gitlab.company.com/hyper-expanse/semantic-release-gitlab-notifier.git`;

      const notesResponse = generateNotesResponse(`https://gitlab.company.com`);

      const promise = semanticReleaseGitLabNotifier(this.config);

      return promise
        .then(result => {
          expect(result).to.be.true;

          notesResponse.done();
        });
    });

    it(`should succeed with company deployed non-standard TLD - git@git.ourdomain.co`, function () {
      this.config.pkg.repository = `git@git.ourdomain.co:hyper-expanse/semantic-release-gitlab-notifier.git`;

      const notesResponse = generateNotesResponse(`https://git.ourdomain.co`);

      const promise = semanticReleaseGitLabNotifier(this.config);

      return promise
        .then(result => {
          expect(result).to.be.true;

          notesResponse.done();
        });
    });

    it(`should succeed when using insecure HTTP protocol`, function () {
      this.config.options.insecureApi = true;

      const notesResponse = generateNotesResponse(`http://gitlab.com`);

      const promise = semanticReleaseGitLabNotifier(this.config);

      return promise
        .then(result => {
          expect(result).to.be.true;

          notesResponse.done();
        });
    });
  });
});

function generateNotesResponse(customUrl) {
  const url = customUrl || `https://gitlab.com`;

  return nock(url, {encodedQueryParams: true})
    .post(
      `/api/v4/projects/hyper-expanse%2Fsemantic-release-gitlab-notifier/issues/1/notes`,
      `{"body":"Version [1.0.0](${url}/hyper-expanse/semantic-release-gitlab-notifier/tags/1.0.0) has been released."}`
    )
    .reply(201);
}
