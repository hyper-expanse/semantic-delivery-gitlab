# semantic-release-gitlab

[![build status](https://gitlab.com/hyper-expanse/semantic-release-gitlab/badges/master/build.svg)](https://gitlab.com/hyper-expanse/semantic-release-gitlab/commits/master)
[![codecov.io](https://codecov.io/gitlab/hyper-expanse/semantic-release-gitlab/coverage.svg?branch=master)](https://codecov.io/gitlab/hyper-expanse/semantic-release-gitlab?branch=master)

> Automatically generate a release, along with a corresponding git tag, for GitLab-hosted source code.

Releasing GitLab-hosted source code may include:
* Getting a list of all commits to a project that have not been formally released.
* Determining the appropriate [semantic version](http://semver.org/) to release.
* Generating a git tag for the repository on GitLab with that version.
* Publishing a [GitLab release page](https://docs.gitlab.com/ce/workflow/releases.html) containing a list of changes included in that version.
* Informing people subscribed to GitLab issues, or merge requests, about the release.

By automating these steps `semantic-release-gitlab` alleviates some of the overhead in managing a project, allowing you to quickly and consistently release enhancements that provide value to your consumers.

This idea, however, is not new. `semantic-release-gitlab` was heavily inspired by the work of [semantic-release](https://www.npmjs.com/package/semantic-release).

## Features

* [&#x2713;] Get a list of unreleased commits using [ggit](https://www.npmjs.com/package/ggit).
* [&#x2713;] Detect commit message convention used by a project with [conventional-commits-detector](https://www.npmjs.com/package/conventional-commits-detector).
* [&#x2713;] Determine appropriate version to release with [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump).
* [&#x2713;] Publish a [GitLab release](http://docs.gitlab.com/ce/workflow/releases.html) using [conventional-gitlab-releaser](https://www.npmjs.com/package/conventional-gitlab-releaser) through the [semantic-release-gitlab-releaser](https://www.npmjs.com/package/semantic-release-gitlab-releaser) plugin.
* [&#x2713;] Create an annotated [git tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging) on GitLab.
* [&#x2713;] Post a comment to GitLab issues closed by changes included in a release through the [semantic-release-gitlab-notifier](https://www.npmjs.com/package/semantic-release-gitlab-notifier) plugin.

## Installation

To install the `semantic-release-gitlab` tool for use in your project's release process please run the following command:

```bash
yarn add --dev semantic-release-gitlab
```

If you are using the `npm` package manager:

```bash
npm install --save-dev semantic-release-gitlab
```

## Usage

Setup the environment variable described in the _Required Environment Variable_ section.

Then call `semantic-release-gitlab` from within your project's top folder:

```bash
$(yarn bin)/semantic-release-gitlab
```

If you're using the `npm` package manager:

```bash
$(npm bin)/semantic-release-gitlab
```

To learn how `semantic-release-gitlab` can be used to automatically release your project when new changes are pushed to your repository, which we highly recommend, please see the _Continuous Integration and Delivery (CID) Setup_ section below.

### How the Release Happens

First step of `semantic-release-gitlab` is to get a list of commits made to your project after the latest semantic version tag. If no commits are found, which typically occurs if the latest commit in your project is pointed to by a semantic version tag, then `semantic-release-gitlab` will exit cleanly and indicate that no changes can be released. This ensures you can run the release process multiple times, only releasing new versions if there are unreleased commits. If commits are available, `semantic-release-gitlab` will proceed to the next step.

Then `semantic-release-gitlab` determines the commit convention used by your project with `conventional-commits-detector`. Once we have determined your commit message convention we pass that information on to `conventional-recommended-bump` to determine the appropriate version to release. For more information on how versions are determined, please see the _Version Selection_ section below.

Once a version has been determined by `conventional-recommended-bump`, we generate a new [GitLab release page](http://docs.gitlab.com/ce/workflow/releases.html), with a list of all the changes made since the last version. Creating a GitLab release also creates an annotated git tag (Which you can then `git fetch`).

Lastly, a comment will be posted to every issue that is referenced in a released commit, informing subscribers to that issue of the recent release, including version number.

### Required Environment Variable

For `semantic-release-gitlab` to publish a release to GitLab a [GitLab Private Token](https://gitlab.com/profile/account) must be setup within your environment.

**Environment variable name** - `GITLAB_AUTH_TOKEN`

The account associated with the GitLab private token must have _Developer_ permissions. That account must be a member of the project you're wanting to automatically release.

> The permissions are required by the `semantic-release-gitlab-releaser` plugin.

> GitLab permissions are documented on the [GitLab Permissions](http://docs.gitlab.com/ce/user/permissions.html) site.

### Required GitLab CE/EE Edition

Version [8.2](https://about.gitlab.com/2015/11/22/gitlab-8-2-released/), or higher, of GitLab CE/EE is required for `semantic-release-gitlab`.

Core features used:
* [GitLab release page](http://docs.gitlab.com/ce/workflow/releases.html)
* [API v3](https://gitlab.com/gitlab-org/gitlab-ce/blob/8-16-stable/doc/api/README.md)

> This only applies to you if you're running your own instance of GitLab. GitLab.com is always the latest version of the GitLab application.

#### Setting HTTP Protocol for GitLab Integration

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
    - yarn install --freeze-lockfile
  image: node:6
  only:
    - master@<GROUP>/<PROJECT>
  script:
    - $(yarn bin)/semantic-release-gitlab
  stage: release
```

Full documentation for GitLab CI is available on the [GitLab CI](http://docs.gitlab.com/ce/ci/yaml/README.html) site.

You may also take a look at our [.gitlab-ci.yml](https://gitlab.com/hyper-expanse/semantic-release-gitlab/blob/master/.gitlab-ci.yml) file as an example.

In addition to publishing a new release on every new commit, which is the strategy shown above, you may use use any number of other strategies, such as publishing a release on a given schedule. Please see the _Release Strategies_ section below for a few such alternative approaches.

## How to Publish Project to an npm Registry

Once `semantic-release-gitlab` has created a release on GitLab, the next step for an `npm` package is to publish that package to an `npm`-compatible registry. To publish your project to an `npm`-compatible registry, please use [npm-publish-git-tag](https://www.npmjs.com/package/npm-publish-git-tag).

## Version Selection

As noted earlier `semantic-release-gitlab` uses [conventional-recommended-bump](https://www.npmjs.com/package/conventional-recommended-bump) to determine the version to use when releasing. If `conventional-recommended-bump` indicates that no new release should be made then `semantic-release-gitlab` will **not** release a new version of your project.

Rules used by `conventional-recommended-bump` are housed in it's repository. If you have any questions or concerns regarding those rules, or the version recommended by `conventional-recommended-bump`, please reach out to their project.

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

You may also print debug messages for the underlying HTTP request library, [request](https://www.npmjs.com/package/request), by setting the `NODE_DEBUG` environment variable to `request`, as [shown in their documentation](https://www.npmjs.com/package/request#debugging).

As an example:

```bash
NODE_DEBUG=request semantic-release-gitlab
```

## Node Support Policy

We only support [Long-Term Support](https://github.com/nodejs/LTS) versions of Node.

We specifically limit our support to LTS versions of Node, not because this package won't work on other versions, but because we have a limited amount of time, and supporting LTS offers the greatest return on that investment.

It's possible this package will work correctly on newer versions of Node. It may even be possible to use this package on older versions of Node, though that's more unlikely as we'll make every effort to take advantage of features available in the oldest LTS version we support.

As each Node LTS version reaches its end-of-life we will remove that version from the `node` `engines` property of our package's `package.json` file. Removing a Node version is considered a breaking change and will entail the publishing of a new major version of this package. We will not accept any requests to support an end-of-life version of Node. Any merge requests or issues supporting an end-of-life version of Node will be closed.

We will accept code that allows this package to run on newer, non-LTS, versions of Node. Furthermore, we will attempt to ensure our own changes work on the latest version of Node. To help in that commitment, our continuous integration setup runs against all LTS versions of Node in addition the most recent Node release; called _current_.

JavaScript package managers should allow you to install this package with any version of Node, with, at most, a warning if your version of Node does not fall within the range specified by our `node` `engines` property. If you encounter issues installing this package, please report the issue to your package manager.

## Contributing

Please read our [contributing guide](https://gitlab.com/hyper-expanse/semantic-release-gitlab/blob/master/CONTRIBUTING.md) to see how you may contribute to this project.
