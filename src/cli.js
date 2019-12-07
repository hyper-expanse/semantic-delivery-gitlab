#!/usr/bin/env node

'use strict';

const pkg = require('../package.json');
const program = require('commander');
const semanticDeliveryGitlab = require('../');

program
  .description(pkg.description)
  .version(pkg.version)
  .option('-d, --dry-run', 'Dry run without creating a deliverable or commenting on issues and merge requests')
  .option('-p, --preset <convention>', 'Preset package name [angular, @scope/angular, ...]. See \'conventional-recommended-bump\' for preset package requirements.')
  .option('-t, --token <token>', 'Personal access token for creating a GitLab release.')
  .parse(process.argv);

(async () => {
  try {
    const version = await semanticDeliveryGitlab({ dryRun: program.dryRun, preset: program.preset, token: program.token });

    const message = program.dryRun
      ? 'No release created during dry run.'
      : version !== undefined
        ? `Released version ${version}`
        : 'No changes are available to release.';

    console.log(message);
  } catch (error) {
    console.error(`semantic-delivery-gitlab failed for the following reason - ${error}`);
    process.exit(1);
  }
})();
