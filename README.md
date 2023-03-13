# dockerpress-base-image

A great base image for WordPress sites.


## Usage

The base image is available on both [Docker Hub](https://hub.docker.com/r/evermadefi/dockerpress-base-image) and [GitHub Container Registry](https://github.com/evermade/dockerpress-base-image/pkgs/container/dockerpress-base-image).

We provide multiple tags for images, below are some common examples:

```dockerfile
# To use a specific semantic version
FROM evermadefi/dockerpress-base-image:2.0.5

# To use a specific semantic minor version
FROM evermadefi/dockerpress-base-image:2.0

# To use a specific semantic major version
FROM evermadefi/dockerpress-base-image:2

# To use a specific tag
FROM evermadefi/dockerpress-base-image:v2.0.5

# To use a specific branch
FROM evermadefi/dockerpress-base-image:master

# To use a specific commit hash
FROM evermadefi/dockerpress-base-image:c1db184a832a62409e25a552a69dc7592ac2e114

# To use GitHub Container Registry instead of Docker Hub (you can use all the same tags described above)
FROM ghcr.io/evermade/dockerpress-base-image:2.0.5
```

To simply just pull the image or update a stale local copy, run the `docker pull` command like so with the tag you wish you pull:

`docker pull evermadefi/dockerpress-base-image:2.0.5`

And for GitHub Container Registry, same thing:

`docker pull ghcr.io/evermade/dockerpress-base-image:2.0.5`

And enjoy!


## Contributing

1. Commit any necessary changes to the [Dockerfile](./Dockerfile) on your branch

2. [Create a pull request](https://github.com/evermade/dockerpress-base-image/compare) to the appropriate branch (such as master) from your branch

3. Make sure your pull request passes the automatic build workflow and fix appropriately if needed

4. Request a pull request review

5. Have the pull request approved and merged to master

6. Once merged to master, a new build process will be automatically dispatched and once complete, the new image will be pushed to container registries with both the long and short commit hash and branch name as tags. The build process also automatically applies [Open Containers](https://opencontainers.org/) labels to the images.


## Publishing a new version

1. [Draft a new release on GitHub](https://github.com/evermade/dockerpress-base-image/releases/new) using the MAJOR.MINOR.PATCH semantic versioning scheme for the new tag with the "v" prefix (e.g. v2.0.5). You can also create and push a tag separately using your preferred Git client, but GitHub allows you to do this all at once, so it is not necessary.

2. Write a description with the changelog for the release using the following template:

    ```md
    # Changelog summary
    - Updated PHP base image to [8.0.27](https://www.php.net/ChangeLog-8.php#8.0.27)

    https://hub.docker.com/r/evermadefi/dockerpress-base-image/
    https://github.com/evermade/dockerpress-base-image/pkgs/container/dockerpress-base-image
    ```

3. Publish the new release

4. This automatically triggers the image builder GitHub Workflow and will, eventually, after some 15–30 minutes, push the new images with the appropriate tags and labels to Docker Hub and GitHub Container Registry. So, go get a cup of ☕️ while you wait.

5. Once the build workflow is complete, you can pull the new image from either of the container registries as shown in the Usage section.
