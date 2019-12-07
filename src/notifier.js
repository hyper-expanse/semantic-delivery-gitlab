'use strict';

const debug = require('debug')('semantic-delivery-gitlab');
const { escape } = require('querystring');
const got = require('got');
const parser = require('conventional-commits-parser');

module.exports = notifier;

async function notifier ({ commits, dryRun, repository, token, version }) {
  const { domain, user, project } = repository;
  const issueIds = new Set();

  for (const rawCommit of commits) {
    parser.sync(rawCommit).references.forEach(reference => issueIds.add(reference.issue));
  }

  debug('posting to the following issues - %O', Array.from(issueIds));
  for (const issueID of Array.from(issueIds)) {
    debug(`posting comment to - https://${domain}/api/v4/projects/${escape(`${user}/${project}`)}/issues/${issueID}/notes`);

    // Placed after all other code so that sanity checking has had a chance to run.
    if (dryRun) {
      continue;
    }

    try {
      await got.post(`https://${domain}/api/v4/projects/${escape(`${user}/${project}`)}/issues/${issueID}/notes`, {
        json: true,
        headers: {
          'PRIVATE-TOKEN': token
        },
        body: {
          body: `Version [${version}](https://${domain}/${user}/${project}/tags/${version}) has been released.`
        }
      });
    } catch (error) {
      throw new Error(`Failed to post comment to GitLab: ${error.message}`);
    }
  }
}
