# dockerpress-base-image

A great base image for WordPress sites.

## Usage

The base image is available on both [Docker Hub](https://hub.docker.com/r/evermadefi/dockerpress-base-image).

We provide multiple tags for images, below are some common examples:

```dockerfile
# To use a specific semantic version
FROM evermadefi/dockerpress-base-image:3.0.0
FROM evermadefi/dockerpress-base-image:3.0
FROM evermadefi/dockerpress-base-image:3

# You can specify the Debian and PHP versions as well
FROM evermadefi/dockerpress-base-image:3.0.0-php8.3-debian13
FROM evermadefi/dockerpress-base-image:3.0.0-php8.3
FROM evermadefi/dockerpress-base-image:3.0.0-debian13

# To use a specific tag or branch
FROM evermadefi/dockerpress-base-image:v3.0.0
FROM evermadefi/dockerpress-base-image:master

# To use a specific commit hash
FROM evermadefi/dockerpress-base-image:d005a63181510de433588c80a7fd0d729a8296a3
```

To simply just pull the image or update a stale local copy, run the `docker pull` command like so with the tag you wish you pull:

`docker pull evermadefi/dockerpress-base-image:3.0.0`

And enjoy!

## Contributing

1. Commit any necessary changes to the [Dockerfile](./Dockerfile) on your branch

2. [Create a pull request](https://github.com/evermade/dockerpress-base-image/compare) to the appropriate branch (such as master) from your branch

3. Make sure your pull request passes the automatic build workflow and fix appropriately if needed

4. Request a pull request review

5. Have the pull request approved and merged to master

6. Once merged to master, a new build process will be automatically dispatched and once complete, the new image will be pushed to container registries with both the long and short commit hash and branch name as tags. The build process also automatically applies [Open Containers](https://opencontainers.org/) labels to the images.

## Publishing a new version

1. [Draft a new release on GitHub](https://github.com/evermade/dockerpress-base-image/releases/new) using the MAJOR.MINOR.PATCH semantic versioning scheme for the new tag with the "v" prefix (e.g. v3.0.99). You can also create and push a tag separately using your preferred Git client, but GitHub allows you to do this all at once, so it is not necessary.

2. Write a description with the changelog for the release.

3. Publish the new release

4. This automatically triggers the image builder GitHub Workflow and will eventually, after some 30 minutes, push the new images with the appropriate tags and labels to Docker Hub. So, go get a cup of ☕️ while you wait.

5. Once the build is complete, you can pull the new image from either of the container registries as shown in the Usage section.

## Adding third party downloads

1. Check the integrity of the source yourself, that the contents are correct.

2. Install an `ADD` instruction with the checksum and appropriate owner and permissions.

3. If available, verify the file signatures with a known good GPG key.

If the build is throwing a checksum mismatch error, the file contents must have changed and must be re-verified.

If the signature cannot be verified, the file is not signed by a known good GPG key. If the GPG key used to sign the file looks valid, you should add it to the GPG key list.

## Updating Python packages

Python is currently used by certbot (certbot-requirements.in) and supervisor (supervisor-requirements.in).

1. Additional dependencies may be added to the \*-requirements.in file if required.

2. Run the Docker command commented in \*-requirements.in to generate the \*-requirements.txt file.

3. Verify that the \*-requirements.txt is legit.

## Dependency checklist

The following dependencies should be checked every so often for updates.

### Actions

- https://github.com/actions/checkout
- https://github.com/docker/metadata-action
- https://github.com/docker/login-action
- https://github.com/docker/setup-buildx-action
- https://github.com/docker/build-push-action

### Dockerfile

- Dockerfile syntax: https://github.com/moby/buildkit
- Base image
    - Official PHP Docker base image: https://hub.docker.com/_/php
    - Official WordPress Docker base image (for reference): https://github.com/docker-library/wordpress
- CA certificates: https://curl.se/docs/caextract.html
- Cosign: https://github.com/sigstore/cosign
- Go: https://go.dev/dl/
- Python: https://www.python.org/downloads/source/
- WP-CLI: https://github.com/wp-cli/wp-cli
- Core Rule Set: https://github.com/coreruleset/coreruleset
- ModSecurity: https://github.com/owasp-modsecurity/ModSecurity
- Nginx modules
    - ngx_brotli: https://github.com/google/ngx_brotli
    - libnginx-mod-http-cache-purge: https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge
    - libnginx-mod-http-geoip2: https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2
    - headers-more-nginx-module: https://github.com/openresty/headers-more-nginx-module
    - ModSecurity-nginx: https://github.com/owasp-modsecurity/ModSecurity-nginx
- Python dependencies
    - [certbot-requirements.in](/certbot-requirements.in)
    - [supervisor-requirements.in](/supervisor-requirements.in)
