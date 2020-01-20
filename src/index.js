'use strict';

const { promisify } = require('util');
const conventionalCommitsDetector = require('conventional-commits-detector');
const debug = require('debug')('semantic-delivery-gitlab');
const gitRemoteOriginUrl = require('git-remote-origin-url');
const fs = require('fs');
const notifier = require('./notifier');
const releaser = require('./releaser');
const gitSemverTags = promisify(require('git-semver-tags'));
const gitRawCommits = require('git-raw-commits');
const getPkgRepo = require('get-pkg-repo');
const conventionalRecommendedBump = promisify(require('conventional-recommended-bump'));
const streamToArray = require('stream-to-array');
const path = require('path');
const semver = require('semver');
const shelljs = require('shelljs');

module.exports = semanticRelease;

async function semanticRelease ({ preset, token, dryRun = false, skipNotifications = false }) {
  const config = { dryRun, token };

  let packageData;
  try {
    packageData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')));
  } catch (error) {
    /**
     * Failed to retrieve the repository URL from the project's `package.json`. Perhaps because the project does
     * not have a `package.json` file, such as a Python project.
     */
    packageData = {
      repository: await gitRemoteOriginUrl()
    };
  }

  config.repository = getPkgRepo(packageData);

  const tags = await gitSemverTags();
  if (tags.length === 0) {
    debug('no tags found');
  } else {
    debug('latest tag', tags[0]);
  }

  config.commits = await streamToArray(gitRawCommits({ from: tags[0] || '' })).then(rawCommits => rawCommits.map(value => value.toString()));

  if (config.commits.length === 0) {
    return debug('no commits to release so skipping the other release steps');
  }

  debug('commit messages - %O', config.commits);

  // Only validate existence of token when we're not conducting a dry run.
  if (config.dryRun === false && (typeof config.token !== 'string' || config.token.length === 0)) {
    throw new Error('No token provided for GitLab.');
  }

  config.preset = preset || conventionalCommitsDetector(config.commits);

  debug(`detected ${config.preset} commit convention`);

  config.preset = config.preset === 'unknown' ? 'angular' : config.preset;

  debug(`using ${config.preset} commit convention`);

  const recommendation = await conventionalRecommendedBump({ ignoreReverted: false, preset: config.preset });

  debug('recommended version bump is - %O', recommendation);

  // Difficult to test this particular conditional because the default preset always recommends a release.
  // However, users of this package can use a preset that could choose not to recommend a release.
  /* istanbul ignore if */
  if (recommendation.releaseType === undefined) {
    return debug('no recommended release so skipping the other release steps');
  }

  config.version = tags[0] === undefined ? '1.0.0' : semver.inc(tags[0], recommendation.releaseType);

  debug('version to be released', config.version);

  shelljs.exec(`git tag ${config.version}`);

  try {
    await releaser(config);

    if (skipNotifications === false) {
      await notifier(config);
    }
  } catch (error) {
    shelljs.exec(`git tag -d ${config.version}`);
    throw error;
  }

  if (dryRun) {
    shelljs.exec(`git tag -d ${config.version}`);
    return;
  }

  return config.version;
}

/**
 * Filter Out Reverted Commits - If a commit is made to a project, followed by another commit that reverts it, the first commit is still used by conventional-recommended-bump to determine what version bump to make. Instead, revert commits should be used to filter out other commits, to prevent their consideration by conventional-recommended-bump.
 * Support Merge Request Comments - Support posting release information to merge requests. Because merge requests use different IDs than issues, we need to duplicate our posting logic for those IDs.
 * Remove Git Tagging - Remove the functionality that generates a git tag on disk.
 * Document How to Revert Change - Document how to revert a change successfully. semantic-release documentation - https://github.com/semantic-release/semantic-release/pull/850
 * Switch all `isDone()` to `done()` so they act as their own assertions, or wrap `isDone()` in `expect` statements so they act as assertions.
 * Release notes not getting generated - I believe `\n\n\n` is intended by `conventional-gitlab-releaser`. It has a template that it renders using a list of changes (features or bug fixes). If there are no changes to include in the release notes, then the release notes would be nothing but blank lines. However, I'm surprised GitLab is not creating the Release page for this change. I think it may be related to this reported bug - `gitlab-org/gitlab#27880`
 * Add readme docs for `--skip-notifications` CLI flag.
 */
