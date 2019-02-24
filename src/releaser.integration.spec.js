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

const semanticReleaseGitLabReleaser = proxyquire(`./releaser`, {
  'conventional-gitlab-releaser': conventionalGitlabReleaserMock,
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
  });

  describe(`unknown git host`, () => {
    beforeEach(function () {
      this.config = {
        options: {
          debug: false,
          scmToken: `TOKEN`,
        },
        pkg: {
          repository: `git@git.ourdomain.co:group/project.git`,
        },
      };
    });

    it(`uses default preset`, function () {
      conventionalGitlabReleaserMock.yields(null, []);

      const promise = semanticReleaseGitLabReleaser(this.config);

      return expect(promise).to.be.fulfilled
        .and.to.eventually.equal(true)
        .then(() => {
          expect(conventionalGitlabReleaserMock).to.have.been.calledOnce
            .and.calledWith(
              {url: `https://git.ourdomain.co/api/v4/`, token: this.config.options.scmToken},
              {preset: `angular`},
              {owner: `group`, repository: `project`},
              {merges: null}
            );
        });
    });
  });
});
