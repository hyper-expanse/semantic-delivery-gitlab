'use strict';

var Bluebird = require('bluebird');
var EarlyExit = require('./early-exit');
var fs = require('fs');
var path = require('path');
var recommendedBump = Bluebird.promisify(require('conventional-recommended-bump'));
var semver = require('semver');
var debug = require('debug')('semantic-release-gitlab');

module.exports = bump;

function bump(lastTag, commitConvention) {
  return recommendedBump({ preset: commitConvention }).then(function (recommendation) {
    debug('recommended version bump - ' + JSON.stringify(recommendation));

    if (recommendation.releaseType === undefined) {
      throw new EarlyExit('No changes are available to release.');
    }

    // If the project has never been released before,
    // no git tag exists, then start the project at version 1.0.0.
    var nextRelease = lastTag.length === 0 ?
      '1.0.0' :
      semver.inc(lastTag, recommendation.releaseType);

    var packageFilePath = path.join(process.cwd(), 'package.json');
    var packageJson = JSON.parse(fs.readFileSync(packageFilePath));
    packageJson.version = nextRelease;
    fs.writeFileSync(packageFilePath, JSON.stringify(packageJson, null, 2) + '\n');

    debug('wrote version %s into package file %s', nextRelease, packageFilePath);

    return nextRelease;
  });
}
