'use strict';

const { promisify } = require('util');
const conventionalGitlabReleaser = promisify(require('conventional-gitlab-releaser'));
const debug = require('debug')('semantic-delivery-gitlab');

module.exports = releaser;

async function releaser ({ dryRun, preset, repository, token }) {
  const { domain, user, project } = repository;

  const auth = {
    url: `https://${domain}/api/v4/`,
    token
  };

  debug('posting release to \'%s\' using preset \'%s\'', auth.url, preset);

  // Placed after all other code so that sanity checking has had a chance to run.
  if (dryRun) {
    return;
  }

  try {
    // TODO: Use `conventional-changelog` directly to generate changelog, and then use `got` to post it to GitLab.
    await conventionalGitlabReleaser(auth, { preset }, { owner: user, repository: project }, { merges: null });
  } catch (error) {
    throw new Error(`Failed to create GitLab release through API: ${error.message}`);
  }
}
