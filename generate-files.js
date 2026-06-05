const fs = require("node:fs");
const path = require("node:path");

const nunjucks = require("nunjucks");

const versions = {
  debian11: {
    7.4: {
      // https://hub.docker.com/layers/library/php/7.4.33-fpm-bullseye/
      image:
        "docker.io/library/php:7.4.33-fpm-bullseye@sha256:3ac7c8c74b2b047c7cb273469d74fc0d59b857aa44043e6ea6a0084372811d5b",
      version: "7.4.33",
    },
    "8.0": {
      // https://hub.docker.com/layers/library/php/8.0.30-fpm-bullseye/
      image:
        "docker.io/library/php:8.0.30-fpm-bullseye@sha256:b07b8df17506cdb370945d942c5f12356af2d078005ded8b195f7e17129de9d1",
      version: "8.0.30",
    },
    8.1: {
      // https://hub.docker.com/layers/library/php/8.1.33-fpm-bullseye/
      image:
        "docker.io/library/php:8.1.33-fpm-bullseye@sha256:bf963a103241b5f9db812bacc101022d3af7584054e865c9cc13f597f3a3e252",
      version: "8.1.33",
    },
  },
  debian12: {
    8.1: {
      // https://hub.docker.com/layers/library/php/8.1.34-fpm-bookworm/
      image:
        "docker.io/library/php:8.1.34-fpm-bookworm@sha256:e3893eeb8f6fb719b6efa7e011e76a65cb1322054226250cedac1138b406aba4",
      version: "8.1.34",
    },
    8.2: {
      // https://hub.docker.com/layers/library/php/8.2.31-fpm-bookworm/
      image:
        "docker.io/library/php:8.2.31-fpm-bookworm@sha256:e3a4ddf518fea2f046548444346b1ca94e60e8ca6aad1877d6e50af3e8f60f39",
      version: "8.2.31",
    },
    8.3: {
      // https://hub.docker.com/layers/library/php/8.3.31-fpm-bookworm/
      image:
        "docker.io/library/php:8.3.31-fpm-bookworm@sha256:d41f4e57e97732698eddc7e17dcc75027ebf4f549aaf3724894a9f9ff062f8ba",
      version: "8.3.31",
    },
    8.4: {
      // https://hub.docker.com/layers/library/php/8.4.21-fpm-bookworm/
      image:
        "docker.io/library/php:8.4.21-fpm-bookworm@sha256:3c0ba05ebf0674d59d40e121391bd0568198386b01ea204211fb2506597d6d18",
      version: "8.4.21",
    },
    8.5: {
      // https://hub.docker.com/layers/library/php/8.5.7-fpm-bookworm/
      image:
        "docker.io/library/php:8.5.7-fpm-bookworm@sha256:00a076dde4eed73a297282a54a53084f24c71f00d5a9ab0fcd070cedca65bba5",
      version: "8.5.7",
    },
  },
  debian13: {
    8.1: {
      // https://hub.docker.com/layers/library/php/8.1.34-fpm-trixie/
      image:
        "docker.io/library/php:8.1.34-fpm-trixie@sha256:a3118db1911fdd3b3ac66605122ddc859286688ced86fc860fec6d19cc2d6c55",
      version: "8.1.34",
    },
    8.2: {
      // https://hub.docker.com/layers/library/php/8.2.31-fpm-trixie/
      image:
        "docker.io/library/php:8.2.31-fpm-trixie@sha256:ea44c48c4612a224d0a5dbe95bb924d9017447d851f0cc38cfee7d571ab3f758",
      version: "8.2.31",
    },
    8.3: {
      // https://hub.docker.com/layers/library/php/8.3.31-fpm-trixie/
      image:
        "docker.io/library/php:8.3.31-fpm-trixie@sha256:b1a1333bc68ab2b55f6422e31a34d3feefa0865f486fc14004b22f87236aa2d3",
      version: "8.3.31",
    },
    8.4: {
      // https://hub.docker.com/layers/library/php/8.4.21-fpm-trixie/
      image:
        "docker.io/library/php:8.4.21-fpm-trixie@sha256:a716f65fe59bef017615761fd0147cebba3956d65879000aa4432180ae43ae47",
      version: "8.4.21",
    },
    8.5: {
      // https://hub.docker.com/layers/library/php/8.5.7-fpm-trixie/
      image:
        "docker.io/library/php:8.5.7-fpm-trixie@sha256:38224fb4402c1ad445128304b45f99375f86f29a4a39a446eb09eb1991f299ef",
      version: "8.5.7",
    },
  },
};

// Generate Dockerfiles for each PHP variant.
fs.rmSync(path.resolve(__dirname, "library"), { recursive: true, force: true });

for (const debianVersion in versions) {
  for (const phpMajorMinorVersion in versions[debianVersion]) {
    const php = versions[debianVersion][phpMajorMinorVersion];

    nunjucks.render(
      path.resolve(__dirname, "Dockerfile.template.njk"),
      {
        baseImage: php.image,
        debianVersion,
        phpMajorMinorVersion,
        phpVersion: php.version,
      },
      (err, res) => {
        if (err) {
          throw err;
        }

        const versionDirPath = path.resolve(
          __dirname,
          "library",
          debianVersion,
          phpMajorMinorVersion,
        );

        if (!fs.existsSync(versionDirPath)) {
          fs.mkdirSync(versionDirPath, { recursive: true });
        }

        fs.writeFileSync(path.resolve(versionDirPath, "Dockerfile"), res);
      },
    );
  }
}

// Generate build.yml that includes all of the PHP variants.
nunjucks.render(
  path.resolve(__dirname, ".github/workflows/build.yml.template.njk"),
  { versions },
  (err, res) => {
    if (err) {
      throw err;
    }

    fs.writeFileSync(
      path.resolve(__dirname, ".github/workflows/build.yml"),
      res,
    );
  },
);
