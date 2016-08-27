# semantic-release-gitlab

[![build status](https://gitlab.com/hutson/semantic-release-gitlab/badges/master/build.svg)](https://gitlab.com/hutson/semantic-release-gitlab/commits/master)
[![codecov.io](https://codecov.io/gitlab/hutson/semantic-release-gitlab/coverage.svg?branch=master)](https://codecov.io/gitlab/hutson/semantic-release-gitlab?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.gitlab.io/cz-cli/)

> Automatically publish packages to the npm registry for source code hosted on GitLab.

`semantic-release-gitlab` is designed to automate the process of releasing GitLab-hosted code to an npm registry.

Releasing GitLab-hosted code to an npm registry may include:
* Determining the appropriate [semantic version](http://semver.org/) to release.
* Generating a git tag for the repository on GitLab with that version.
* Publishing a list of changes included in that version.
* Publishing an npm package containing those changes to an npm registry.
* Informing people subscribed to GitLab issues or merge requests about the release.

By automating these steps `semantic-release-gitlab` alleviates some of the overhead associated with managing a project, while providing consistency in how your project is published.

This idea is not new. `semantic-release-gitlab` was heavily inspired by the work accomplished by [semantic-release](https://www.npmjs.com/package/semantic-release). If you have a GitHub project you're highly encouraged to check out `semantic-release`.

## Features

* [&#x2713;] Detect commit message convention used by a project with [conventional-commits-detector](https://www.npmjs.com/package/conventional-commits-detector).
* [&#x2713;] Determine appropriate version to publish with [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump).
* [&#x2713;] Publish package to the npm registry.
* [&#x2713;] Publish a [GitLab release](http://docs.gitlab.com/ce/workflow/releases.html) using [conventional-gitlab-releaser](https://www.npmjs.com/package/conventional-gitlab-releaser) through the [semantic-release-gitlab-releaser](https://www.npmjs.com/package/semantic-release-gitlab-releaser) plugin.
* [&#x2713;] Create an annotated [git tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging) that can be fetched from GitLab.
* [&#x2713;] Post a comment to GitLab issues closed by changes included in a package release through [semantic-release-gitlab-notifier](https://www.npmjs.com/package/semantic-release-gitlab-notifier) plugin.

## Installation

To install the `semantic-release-gitlab` tool for use in your project's release process please run the following command:

```bash
npm install --save-dev semantic-release-gitlab
```

## Usage

Once installed `semantic-release-gitlab` may be invoked by executing the CLI tool exported by the package. Installed into your project's `node_modules` `bin` directory is the `semantic-release-gitlab` executable. It can be invoked directly by calling `$(npm bin)/semantic-release-gitlab`. To learn how `semantic-release-gitlab` can be used as part of your project's release process please see the _Continuous Integration and Delivery (CID) Setup_ section below.

As noted under _Features_ we determine the commit convention used by your project with `conventional-commits-detector`. Once we have determined your commit message convention we pass that information on to `conventional-recommended-bump` to determine the appropriate version to publish.

By default `conventional-recommended-bump` will recommend at least a `patch` release. Depending on the commit convention you follow, commits may be released as a `major` or `minor` release instead. For more information on how versions are determined, please see the _Version Selection_ section below.

For more on the meanings of `patch`, `minor`, and `major`, please see [Semantic Versioning](http://semver.org/).

### Required Environment Settings

For `semantic-release-gitlab` to publish packages to the npm registry, and a changelog to GitLab, several environment variables must be setup within your continuous integration job.

| **Required Token** | **Environment Variable Name** |
| ------------------ | ----------------------------- |
| [npm token](http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules) | `NPM_TOKEN` |
| [GitLab Private Token](https://gitlab.com/profile/account) | `GITLAB_AUTH_TOKEN` |

The account associated with the GitLab private token must have _Developer_ permissions on the project to be released to meet the requirements of `semantic-release-gitlab-releaser`. GitLab permissions are documented on the [GitLab Permissions](http://docs.gitlab.com/ce/user/permissions.html) site.

### Continuous Integration and Delivery (CID) Setup

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

You may also take a look at our [.gitlab-ci.yml](https://gitlab.com/hutson/semantic-release-gitlab/blob/master/.gitlab-ci.yml) file as an example.

## Publishing Elsewhere Besides Public npm Registry

It's possible to publish your package to any npm registry, not just the official public registry. When publishing a package `semantic-release-gitlab` uses the built-in `publish` command of npm. Any features supported by `npm publish` are available. For example, you may specify, on a per-project basis, which registry to publish your package to by setting the [publishConfig](https://docs.npmjs.com/misc/registry#i-dont-want-my-package-published-in-the-official-registry-its-private) property in your project's `package.json` file.

Alternative registries may include on-premise solutions such as [Artifactory](https://www.jfrog.com/artifactory/) and [npm enterprise](https://www.npmjs.com/enterprise).

## Version Selection

As noted earlier `semantic-release-gitlab` uses [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump) to determine the version to use when publishing a package. If `conventional-recommended-bump` indicates that no valid version could be determined, typically because it believes no new version should be released, then `semantic-release-gitlab` will **not** publish the package.

Rules used by `conventional-recommended-bump` are housed in it's repository. If you have any questions or concerns regarding those rules, or the version provided by `conventional-recommended-bump`, please reach out to their project on GitHub.

## Debugging

To assist users of `semantic-release-gitlab` with debugging the behavior of this module we use the [debug](https://www.npmjs.com/package/debug) utility package to print information about the release process to the console. To enable debug message printing, the environment variable `DEBUG`, which is the variable used by the `debug` package, must be set to a value configured by the package containing the debug messages to be printed.

To print debug messages on a unix system set the environment variable `DEBUG` with the name of this package prior to executing `semantic-release-gitlab`:

```bash
DEBUG=semantic-release-gitlab semantic-release-gitlab
```

On the Windows command line you may do:

```bash
set DEBUG=semantic-release-gitlab
semantic-release-gitlab
```

All `semantic-release-gitlab` plugins use `debug` to print information to the console. You can instruct all plugins, and `semantic-release-gitlab`, to print their debugging information by using `semantic-release-gitlab*` as the value of the `DEBUG` environment variable.

```bash
DEBUG=semantic-release-gitlab* semantic-release-gitlab
```

`semantic-release-gitlab` uses numerous other npm packages and many of those use the `debug` utility package as well. For example to print the debug messages from [npm-utils](https://www.npmjs.com/package/npm-utils) you may assign `semantic-relesae-gitlab` and `npm-utils` to the `DEBUG` environment variable like so:

```bash
DEBUG=semantic-release-gitlab,npm-utils semantic-release-gitlab
```

You may also print debug messages for the underlying HTTP request library, [request](https://www.npmjs.com/package/request), by setting the `NODE_DEBUG` environment variable to `request`, as [shown in their documentation](https://www.npmjs.com/package/request#debugging).

## Contributing

Please read our [contributing](https://gitlab.com/hutson/semantic-release-gitlab/blob/master/CONTRIBUTING.md) guide on how you can help improve this project.
