# semantic-release-gitlab

[![build status](https://gitlab.com/hutson/semantic-release-gitlab/badges/master/build.svg)](https://gitlab.com/hutson/semantic-release-gitlab/commits/master)
[![codecov.io](https://codecov.io/gitlab/hutson/semantic-release-gitlab/coverage.svg?branch=master)](https://codecov.io/gitlab/hutson/semantic-release-gitlab?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.gitlab.io/cz-cli/)

> Automatically publish packages to the npm registry for source code hosted on GitLab.

`semantic-release-gitlab` is designed to help automate releasing GitLab-hosted code to the [npm](https://www.npmjs.com/) registry for public consumption.

Releasing GitLab-hosted code to npm may include:
* Determining the appropriate [semantic version](http://semver.org/) to release.
* Generating a git tag for the repository on GitLab with that version.
* Publishing a list of changes included in that version.
* Publishing an npm package containing those changes to the npm registry.

By automating these steps `semantic-release-gitlab` alleviates some of the overhead associated with managing a project, while providing consistency in how your project is published to the web.

This idea is not new. `semantic-release-gitlab` was heavily inspired by the work accomplished by [semantic-release](https://www.npmjs.com/package/semantic-release). If you have a GitHub project you're highly encouraged to check out `semantic-release`.

## Features

* [&#x2713;] Detect commit message convention used by a project with [conventional-commits-detector](https://www.npmjs.com/package/conventional-commits-detector).
* [&#x2713;] Determine appropriate version to publish with [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump).
* [&#x2713;] Publish package to the npm registry.
* [&#x2713;] Publish a [GitLab release](http://docs.gitlab.com/ce/workflow/releases.html) using [conventional-gitlab-releaser](https://www.npmjs.com/package/conventional-gitlab-releaser) through the [semantic-release-gitlab-releaser](https://www.npmjs.com/package/semantic-release-gitlab-releaser) plugin.
* [&#x2713;] Create an annotated [git tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging<Paste>) that can be fetched from GitLab.

## Installation

To install the `semantic-release-gitlab` tool as a development dependency please run the following command:

```bash
npm install --save-dev semantic-release-gitlab
```

## Usage

As noted under _Features_ we determine the commit convention used by your project with `conventional-commits-detector`. Once your commit message convention has been determined we pass that information on to `conventional-recommended-bump` to determine the appropriate version to publish.

By default `conventional-recommended-bump` will recommend at least a `patch` release. Depending on the commit convention you follow, commits may be released as a `major` or `minor` release instead.

For more on the meanings of `patch`, `minor`, and `major`, please see [Semantic Versioning](http://semver.org/).

### Required Environment Settings

For `semantic-release-gitlab` to publish packages to the npm registry, and a changelog to GitLab, several environment variables must be setup within your continuous integration job.

| **Required Token** | **Environment Variable Name** |
| ------------------ | ----------------------------- |
| [npm token](http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules) | `NPM_TOKEN` |
| [GitLab Private Token](https://gitlab.com/profile/account) | `GITLAB_AUTH_TOKEN` |

### Continuous Integration (CI) Setup

Since `semantic-release-gitlab` relies solely on a few environment variables and a publicly accessible npm package. Therefore `semantic-release-gitlab` should be compatible with all continuous integration platforms that work with GitLab.

However, given the enormous number of CI providers available I will only cover the CI system built into GitLab.

Managing GitLab CI builds is made possible through a `.gitlab-ci.yml` configuration file. To publish changes using `semantic-release-gitlab` you will need to create a dedicate build stage that happens only after all other build and test tasks are completed.

In GitLab CI that is possible by creating a dedicated `deploy` stage and adding it as the last item under `stages`. Next, create a job called `publish` that belongs to the `deploy` stage. Within `publish` we call `semantic-release-gitlab`.

You can see a snippet of a `.gitlab-ci.yml` file with this setup below:

```yaml
stages:
	- build
	- test
	- deploy

publish:
  before_script:
    - npm install
  only:
    - master@hutson/semantic-release-gitlab
  script:
    - $(npm bin)/semantic-release-gitlab
  stage: deploy
```

Full documentation for GitLab CI is available on the [GitLab CI](http://docs.gitlab.com/ce/ci/yaml/README.html) website.

You may also take a look at our [.gitlab-ci.yml](./.gitlab-ci.yml) file as an example.

## Contributing

Read [CONTRIBUTING](CONTRIBUTING.md).
