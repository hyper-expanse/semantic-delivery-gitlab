# Use Alpine Linux as our base image so that we minimize the size our final container and minimize the surface area of packages that could be out of date.
FROM node:11.15.0-alpine@sha256:914ff2c2145de019a19c080a9e42b5763c826194110ec8e02c8e92845799fba6

# Container metadata describing the image, where it's configuration is housed, and its maintainer.
LABEL description="Docker image for executing `@hutson/semantic-delivery-gitlab`."
LABEL homepage="https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab"
LABEL maintainer="Hutson Betts <hutson@hyper-expanse.net>"
LABEL repository="https://gitlab.com/hyper-expanse/open-source/semantic-delivery-gitlab.git"

# The Alpine base image does not have a standard collection of CA root certificates installed. As a result all HTTPS requests will fail with 'x509: failed to load system roots and no root provided'.
# We install the `ca-certificates` package to have access to a standard collection of CA root certificates for HTTPS operations that the `@hutson/semantic-delivery-gitlab` tool executes to interact with the GitLab API.
# We install the `git` package for Git operations that the `@hutson/semantic-delivery-gitlab` tool executes.
RUN apk update && \
  apk add --no-cache --progress ca-certificates && \
  apk add --no-cache --progress git

# Copy only those files required in production.
COPY package.json /tmp/semantic-delivery-gitlab/package.json
COPY yarn.lock /tmp/semantic-delivery-gitlab/yarn.lock
COPY src/ /tmp/semantic-delivery-gitlab/src/

# Install only production dependencies for the `@hutson/semantic-delivery-gitlab` package.
# We create a symbolic link in the global binary directory that points to the `@hutson/semantic-delivery-gitlab` executable.
RUN yarn global add file:/tmp/semantic-delivery-gitlab/

# Command to execute within the Docker container when executed by `docker run`, and unless overriden by `--entrypoint`.
# This command causes the container to automatically run the delivery tool, `@hutson/semantic-delivery-gitlab`, within the working directory.
# We assume the contents of a project, including it's `.git` directory, has been mounted inside of the container at the `WORKDIR` specified above.
ENTRYPOINT exec semantic-delivery-gitlab
