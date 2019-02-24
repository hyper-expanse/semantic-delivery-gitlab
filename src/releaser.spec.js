'use strict';

/* eslint-disable no-unused-expressions */

const chai = require(`chai`);
const chaiAsPromised = require(`chai-as-promised`);
const {before, beforeEach, describe, it} = require(`mocha`);
const nock = require(`nock`);
const proxyquire = require(`proxyquire`).noCallThru();
const sinon = require(`sinon`);
const sinonChai = require(`sinon-chai`);

const conventionalGitlabReleaserMock = sinon.stub();

const getPkgRepoMock = sinon.stub();

const semanticReleaseGitLabReleaser = proxyquire(`./releaser`, {
  'conventional-gitlab-releaser': conventionalGitlabReleaserMock,
  'get-pkg-repo': getPkgRepoMock,
});

chai.use(chaiAsPromised);
chai.use(sinonChai);
const {expect} = chai;

describe(`semantic-release-gitlab-releaser`, () => {
  before(() => {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    this.config = {
      options: {
        debug: false,
        scmToken: `TOKEN`,
      },
      pkg: {
        repository: `https://gitlab.com/hyper-expanse/semantic-release-gitlab-releaser.git`,
      },
    };

    conventionalGitlabReleaserMock.resetHistory();
    getPkgRepoMock.resetHistory();

    getPkgRepoMock.returns({
      domain: `gitlab.com`,
      user: `hyper-expanse`,
      project: `semantic-release-gitlab-releaser`,
    });
  });

  it(`does not run in debug mode`, function () {
    this.config.options.debug = true;

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(false);
  });

  it(`will reject if a 'pkg' object is not passed in the 'config' argument`, function () {
    delete this.config.pkg;

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.rejectedWith(Error, 'This plugin, ' +
      '`semantic-release-gitlab-releaser`, was not passed the contents of your package\'s ' +
      '`package.json` file. Please contact the user of this plugin and request that they pass ' +
      'the contents of `package.json` to the plugin.');
  });

  it(`will reject if no repository information in 'pkg' property of 'config'`, function () {
    getPkgRepoMock.throws(new Error(`No repository`));

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `No repository`);
  });

  it(`throws error if get-pkg-repo returns no repository domain`, function () {
    getPkgRepoMock.returns({});

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Unable to parse the repository URL.`);
  });

  it(`will reject if no SCM token provided`, function () {
    delete this.config.options.scmToken;

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `No SCM token provided for GitLab.`);
  });

  it(`gets oauth credentials`, function () {
    conventionalGitlabReleaserMock.yields(null, []);

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(true)
      .then(() => {
        expect(conventionalGitlabReleaserMock).to.have.been.calledOnce
          .and.calledWith({
            url: `https://gitlab.com/api/v4/`,
            token: this.config.options.scmToken,
          });
      });
  });

  it(`uses default preset`, function () {
    conventionalGitlabReleaserMock.yields(null, []);

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(true)
      .then(() => {
        expect(conventionalGitlabReleaserMock).to.have.been.calledOnce
          .and.calledWith(
            {url: `https://gitlab.com/api/v4/`, token: this.config.options.scmToken},
            {preset: `angular`},
            {owner: `hyper-expanse`, repository: `semantic-release-gitlab-releaser`},
            {merges: null}
          );
      });
  });

  it(`uses custom preset`, function () {
    conventionalGitlabReleaserMock.yields(null, []);
    this.config.options.preset = `crazy`;

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(true)
      .then(() => {
        expect(conventionalGitlabReleaserMock).to.have.been.calledOnce
          .and.calledWith(
            {url: `https://gitlab.com/api/v4/`, token: this.config.options.scmToken},
            {preset: `crazy`},
            {owner: `hyper-expanse`, repository: `semantic-release-gitlab-releaser`},
            {merges: null}
          );
      });
  });

  it(`uses http api protocol when set`, function () {
    conventionalGitlabReleaserMock.yields(null, []);
    this.config.options.insecureApi = true;

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(true)
      .then(() => {
        expect(conventionalGitlabReleaserMock).to.have.been.calledOnce
          .and.calledWith(
            {url: `http://gitlab.com/api/v4/`, token: this.config.options.scmToken},
            {preset: `angular`},
            {owner: `hyper-expanse`, repository: `semantic-release-gitlab-releaser`},
            {merges: null}
          );
      });
  });

  it(`returns true if conventional-gitlab-releaser succeeds`, function () {
    conventionalGitlabReleaserMock.yields(null, []);

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise).to.be.fulfilled
      .and.to.eventually.equal(true);
  });

  it(`will reject if conventional-gitlab-releaser fails`, function () {
    conventionalGitlabReleaserMock.yields(new Error(`Failure.`), []);

    const promise = semanticReleaseGitLabReleaser(this.config);

    return expect(promise)
      .to.be.rejectedWith(Error, `Failure.`);
  });
});
