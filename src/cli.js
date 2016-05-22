#!/usr/bin/env node

'use strict';

var program = require('commander');
var semanticRelease = require('./index.js');

program
  .version(require('../package.json').version)
  .parse(process.argv)
;

semanticRelease()
  .then(function (releasedVersion) {
    console.log('Released version ' + releasedVersion);
    process.exit(0);
  })
  .catch(function (err) {
    console.error(err.message);
    process.exit(1);
  });
