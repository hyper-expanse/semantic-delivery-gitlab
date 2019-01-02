# Use Alpine Linux as our base image so that we minimize the overall size our final container, and minimize the surface area of packages that could be out of date.
FROM node:11.3.0-alpine@sha256:6fb75f9947e17826c41a7621cead11eb4ec88df50a26a9ba9b5a4124522958f8

# Container metadata describing the image, where it's configuration is housed, and its maintainer.
LABEL description="Docker image for executing `semantic-release-gitlab`."
LABEL homepage="https://gitlab.com/hyper-expanse/open-source/semantic-release-gitlab"
LABEL maintainer="Hutson Betts <hutson@hyper-expanse.net>"
LABEL repository="https://gitlab.com/hyper-expanse/open-source/semantic-release-gitlab.git"

# The Alpine base image does not have a standard collection of CA root certificates installed. As a result all HTTPS requests will fail with 'x509: failed to load system roots and no root provided'.
# We install the `ca-certificates` package to have access to a standard collection of CA root certificates for HTTPS operations that the `semantic-release-gitlab` tool executes to interact with the GitLab API.
# We install the `git` package for Git operations that the `semantic-release-gitlab` tool executes.
RUN apk update && \
    apk add --no-cache --progress ca-certificates && \
    apk add --no-cache --progress git

# Copy only those files required in production.
COPY package.json /tmp/semantic-release-gitlab/package.json
COPY yarn.lock /tmp/semantic-release-gitlab/yarn.lock
COPY src/ /tmp/semantic-release-gitlab/src/

# Install only production dependencies for the `semantic-release-gitlab` package.
# We create a symbolic link in the global binary directory that points to the `semantic-release-gitlab` executable.
RUN yarn global add file:/tmp/semantic-release-gitlab/

# Command to execute within the Docker container when executed by `docker run`, and unless overriden by `--entrypoint`.
# This command causes the container to automatically run the release tool, `semantic-release-gitlab`, within the working directory.
# We assume the contents of a project, including it's `.git` directory, has been mounted inside of the container at the `WORKDIR` specified above.
ENTRYPOINT ["semantic-release-gitlab"]
