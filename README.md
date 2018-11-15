# semantic-release-gitlab

> Automatically generate a release, along with a corresponding git tag, for GitLab-hosted source code.

When you create a new release for your GitLab project, you probably do several of the steps listed below:
* Get a list of all commits to the project that have not been released.
* Determine the appropriate [semantic version](http://semver.org/) to use for the release.
* Generate a git tag for the repository on GitLab with that version.
* Publish a [GitLab release page](https://docs.gitlab.com/ce/workflow/releases.html) with a list of changes  in that version.
* Inform people subscribed to GitLab issues, or merge requests, about the release.

Well, `semantic-release-gitlab` streamlines all those steps into a single command line tool.

Since `semantic-release-gitlab` is a command line tool, you can call `semantic-release-gitlab` yourself whenever you want, or you can setup your project to automatically call `semantic-release-gitlab` after every commit to your repository, or set it up to run on a regular schedule.

This idea, however, is not new. `semantic-release-gitlab` was heavily inspired by the work of [semantic-release](https://www.npmjs.com/package/semantic-release).

## Table of Contents
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [How the Release Happens](#how-the-release-happens)
  - [Required Environment Variable](#required-environment-variable)
  - [Required GitLab CE/EE Edition](#required-gitlab-ceee-edition)
  - [Preset](#preset)
  - [Using HTTP for GitLab](#using-http-for-gitlab)
  - [Continuous Integration and Delivery (CID) Setup](#continuous-integration-and-delivery-cid-setup)
- [How to Publish Project to an npm Registry](#how-to-publish-project-to-an-npm-registry)
- [Version Selection](#version-selection)
  - [Major Version Zero](#major-version-zero)
- [Release Strategies](#release-strategies)
  - [On Every Push To A Repository With New Commits](#on-every-push-to-a-repository-with-new-commits)
  - [On A Schedule](#on-a-schedule)
- [Common Issues](#common-issues)
  - [GitLabError: 404 Project Not Found (404)](#gitlaberror-404-project-not-found-404)
- [Debugging](#debugging)
- [Node Support Policy](#node-support-policy)
- [Contributing](#contributing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

* [x] Get a list of unreleased commits using [git-raw-commits](https://www.npmjs.com/package/git-raw-commits).
* [x] Detect commit message convention used by a project with [conventional-commits-detector](https://www.npmjs.com/package/conventional-commits-detector).
* [x] Determine appropriate version to release, or whether to release at all, with [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump).
* [x] Publish a [GitLab release](http://docs.gitlab.com/ce/workflow/releases.html) using [conventional-gitlab-releaser](https://www.npmjs.com/package/conventional-gitlab-releaser) through the [semantic-release-gitlab-releaser](https://www.npmjs.com/package/semantic-release-gitlab-releaser) plugin.
* [x] Create an annotated [git tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging) on GitLab.
* [x] Post a comment to GitLab issues closed by changes included in a release through the [semantic-release-gitlab-notifier](https://www.npmjs.com/package/semantic-release-gitlab-notifier) plugin.

## Installation

To install the `semantic-release-gitlab` tool for use in your project's release process please run the following command:

```bash
yarn add --dev semantic-release-gitlab
```

## Usage

Setup the environment variable described in the [_Required Environment Variable_](#required-environment-variable) section.

Then call `semantic-release-gitlab` from within your project's top folder:

```bash
$(yarn bin)/semantic-release-gitlab
```

To learn how `semantic-release-gitlab` can be used to automatically release your project on new changes to your repository, please see the [_Continuous Integration and Delivery (CID) Setup_](#continuous-integration-and-delivery-cid-setup) section below.

### How the Release Happens

First step of `semantic-release-gitlab` is to get a list of commits made to your project after the latest semantic version tag. If no commits are found, which typically happens if the latest commit in your project is pointed to by a semantic version tag, then `semantic-release-gitlab` will exit cleanly and indicate no changes can be released. This ensures you can run the release process multiple times and only release new versions if there are unreleased commits. If unreleased commits are available, `semantic-release-gitlab` will proceed to the next step.

Unless you have configured a [preset](#preset), the convention used by your project will be determined by `conventional-commits-detector`. Once we have determined your convention, we pass along the preset package associated with that convention to `conventional-recommended-bump`. `conventional-recommended-bump` will determine the appropriate version to release. For more information on how versions are determined, please see the [_Version Selection_](#version-selection) section below.

Once a recommendation has been provided by `conventional-recommended-bump`, we generate a new [GitLab release page](http://docs.gitlab.com/ce/workflow/releases.html), with a list of all the changes made since the last version, using the authentication token configured in the [_Required Environment Variables_](#required-environment-variable) section below. Creating a GitLab release also creates an annotated git tag (You can retrieve the annotated tag using `git fetch`).

Lastly, a comment will be posted to every issue that is referenced in a released commit, informing subscribers to that issue of the recent release and version number.

### Required Environment Variable

For `semantic-release-gitlab` to publish a release to GitLab you must setup a [GitLab Personal Access Token](https://gitlab.com/profile/personal_access_tokens) in your environment with the following environment variable name:

**Environment variable name** - `GITLAB_AUTH_TOKEN`

The personal access token must have the following scope set:
* `api`

The personal access token must be setup on an account for a member of the project you're wanting to automatically release.

> The permissions are required by the `semantic-release-gitlab-releaser` plugin.

> GitLab permissions are documented on the [GitLab Permissions](http://docs.gitlab.com/ce/user/permissions.html) site.

### Required GitLab CE/EE Edition

Version [9.0](https://about.gitlab.com/2017/03/22/gitlab-9-0-released/#api-v4-ce-ees-eep), or higher, of GitLab CE/EE is required for `semantic-release-gitlab`.

Core features used:
* [GitLab release page](http://docs.gitlab.com/ce/workflow/releases.html)
* [API v4](https://docs.gitlab.com/ce/api/README.html)

> This only applies to you if you're running your own instance of GitLab. GitLab.com is always the latest version of the GitLab application.

### Preset

[Version selection](#version-selection), the format of the release notes, among other things, are configured through a `conventional-changelog` preset package.

For example, to use the [ESLint release conventions](https://www.npmjs.com/package/conventional-changelog-eslint), first install their preset package along-side `semantic-release-gitlab`:

```bash
yarn add --dev conventional-changelog-eslint
```

Then pass the name, minus `conventional-changelog-`, of the preset package to `semantic-release-gitlab`:

```bash
$(yarn bin)/semantic-release-gitlab --preset eslint
```

If a preset is not provided `semantic-release-gitlab` will use [`conventional-changelog-angular`](https://www.npmjs.com/package/conventional-changelog-angular).

### Using HTTP for GitLab

By default all API calls to GitLab are made over HTTPS. To use HTTP set the environment variable `GITLAB_INSECURE_API` to `true`. Other values, including not setting the environment variable, will cause `semantic-release-gitlab` to use HTTPS.

> We strongly advise against communicating with GitLab over HTTP, but this option is supported for those cases where configuring SSL for GitLab is not feasible.

### Continuous Integration and Delivery (CID) Setup

Since `semantic-release-gitlab` relies on a GitLab token, and a package published to the public npm registry, `semantic-release-gitlab` works on any GitLab-compatible continuous integration platform.

However, given the enormous number of CI providers available, we will only cover the CI system built into GitLab.

Configuring a GitLab CI job is facilitated through a `.gitlab-ci.yml` configuration file kept at the root of your project. To publish changes using `semantic-release-gitlab` you will need to create a dedicated build stage that executes only after all other builds and tests have completed successfully.

That can be done with GitLab CI by creating a dedicated `release` stage and adding it as the last item under `stages`. Next, create a job called `release` and add it to the `release` stage. Within `release` call `semantic-release-gitlab`.

You can see a snippet of a `.gitlab-ci.yml` file below with this setup:

```yaml
stages:
  - build
  - test
  - release

release:
  before_script:
    - yarn install --frozen-lockfile
  image: node:8
  only:
    - master@<GROUP>/<PROJECT>
  script:
    - $(yarn bin)/semantic-release-gitlab
  stage: release
```

Full documentation for GitLab CI is available on the [GitLab CI](http://docs.gitlab.com/ce/ci/yaml/README.html) site.

You may also take a look at our [.gitlab-ci.yml](https://gitlab.com/hyper-expanse/open-source/semantic-release-gitlab/blob/master/.gitlab-ci.yml) file as an example.

In addition to publishing a new release on every new commit, which is the strategy shown above, you may use use any number of other strategies, such as publishing a release on a given schedule. Please see the _Release Strategies_ section below for a few such alternative approaches.

## How to Publish Project to an npm Registry

Once `semantic-release-gitlab` has created a release on GitLab, the next step for an `npm` package is to publish that package to an `npm`-compatible registry. To publish your project to an `npm`-compatible registry, please use [npm-publish-git-tag](https://www.npmjs.com/package/npm-publish-git-tag).

## Version Selection

As noted earlier `semantic-release-gitlab` uses [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump) to determine if a release is needed, and whether that should be a `major`, `minor`, or `patch` release.

The process involves `semantic-release-gitlab` passing the list of all unreleased commits, along with your project's commit message convention, to `conventional-recommended-bump`. `conventional-recommended-bump` will either report that no new release is recommended, or it will recommend a new `major`, `minor`, or `patch` release.

If `conventional-recommended-bump` indicates that no new release should be made, `semantic-release-gitlab` will **not** release a new version of your project.

If a release is recommended, and no previous version exists, we will always set the first version to `1.0.0`.

If a previous version exists, we take that version and increment it according to the recommendation using the default behavior of the [`inc`](https://www.npmjs.com/package/semver#functions) function provided by the [`semver`](https://www.npmjs.com/package/semver) package.

If the project's existing major version is zero, we follow the version incrementing behavior outlined in the [_Major Version Zero_](#major-version-zero) section below.

### Major Version Zero

When the `major` version, the first number in `major.minor.patch`, of a [semantic version](http://semver.org/) string, is zero, `semantic-release-gitlab` will increment the version number following a different set of rules.

In this scenario, incrementing the `major` version will increment what is traditionally the `minor` number in the semantic version string, while incrementing the `minor` or `patch` version will increment the `patch` number in the semantic version string.

**Note:** To release a version `1.0.0` of your library you must create a `1.0.0` tag manually on your [GitLab project](https://docs.gitlab.com/ee/workflow/releases.html).

When the major version is greater than zero, `semantic-release-gitlab` will switch back to it's default behavior of following [semantic versioning](http://semver.org/). (Which uses the [inc](https://www.npmjs.com/package/semver#functions) function provided by the [semver](https://www.npmjs.com/package/semver) package.)


## Release Strategies

You can employ many different release strategies using an automated tool such as `semantic-release-gitlab`.

Below we document a few release strategies. Please don't consider this list exhaustive. There are likely many other ways to decide when it's best to generate a new release for your project.

### On Every Push To A Repository With New Commits

Publishing a new release on every push to a repository with new commits is the approach taken by this project. If you take this approach, you can push a single commit, leading to a release for that one change, or you can create multiple commits and push them all at once, leading to a single release containing all those changes.

An example our setup for GitLab CI can be seen in the _Continuous Integration and Delivery (CID) Setup_ section above.

### On A Schedule

You may also release your changes on a schedule. For example, using a CI platform like [Jenkins CI](https://jenkins.io/), you can create and configure a job to run on a given schedule, such as once every two weeks, and, as part of a _Post Build Action_, run the release tool.

Other CI platforms besides Jenkins also allow you to run a particular action on a given schedule, allowing you to schedule releases as you could with Jenkins CI.

With this strategy all commits that have accumulated in your repository since the last scheduled job run will be incorporated into a single new release. Because this release tool uses `conventional-recommended-bump`, which recommends an appropriate new version based on all commits targeted for release, you can be assured that each scheduled release will use a version appropriate for the changes accumulated in that release.

## Common Issues

A collection of common issues encountered while using `semantic-release-gitlab`.

### GitLabError: 404 Project Not Found (404)

In some instances you may see the following error after running `semantic-release-gitlab`:

```bash
semantic-release-gitlab failed for the following reason - GitLabError: 404 Project Not Found (404)
```

That error can be caused by one of several reasons.

First, the project, or at least the project URL used by `semantic-release-gitlab`, is not valid. Please make sure the [repository field](https://docs.npmjs.com/files/package.json#repository) in your `package.json` is correct. If it is correct, please consider running `semantic-release-gitlab` in [debug mode](#debugging) to see what URL is being used to interact with GitLab.

Second, you have not set the [required environment variable](#required-environment-variable), or the access token assigned to that environment variable does not have access to your project's repository.

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

## Node Support Policy

We only support [Long-Term Support](https://github.com/nodejs/LTS) versions of Node.

We specifically limit our support to LTS versions of Node, not because this package won't work on other versions, but because we have a limited amount of time, and supporting LTS offers the greatest return on that investment.

It's possible this package will work correctly on newer versions of Node. It may even be possible to use this package on older versions of Node, though that's more unlikely as we'll make every effort to take advantage of features available in the oldest LTS version we support.

As each Node LTS version reaches its end-of-life we will remove that version from the `node` `engines` property of our package's `package.json` file. Removing a Node version is considered a breaking change and will entail the publishing of a new major version of this package. We will not accept any requests to support an end-of-life version of Node. Any merge requests or issues supporting an end-of-life version of Node will be closed.

We will accept code that allows this package to run on newer, non-LTS, versions of Node. Furthermore, we will attempt to ensure our own changes work on the latest version of Node. To help in that commitment, our continuous integration setup runs against all LTS versions of Node in addition the most recent Node release; called _current_.

JavaScript package managers should allow you to install this package with any version of Node, with, at most, a warning if your version of Node does not fall within the range specified by our `node` `engines` property. If you encounter issues installing this package, please report the issue to your package manager.

## Contributing

Please read our [contributing guide](https://gitlab.com/hyper-expanse/open-source/semantic-release-gitlab/blob/master/CONTRIBUTING.md) to see how you may contribute to this project.
