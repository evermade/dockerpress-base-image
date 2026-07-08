const fs = require("node:fs");
const path = require("node:path");

const nunjucks = require("nunjucks");

const defaultDebianVersion = "debian13";
const defaultPHPVersion = "8.3";

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
      // https://hub.docker.com/layers/library/php/8.2.32-fpm-bookworm/
      image:
        "docker.io/library/php:8.2.32-fpm-bookworm@sha256:a335d57be82b3a392fe5c6287571de29d0b11c491826c783318ccb785dc0f262",
      version: "8.2.32",
    },
    8.3: {
      // https://hub.docker.com/layers/library/php/8.3.32-fpm-bookworm/
      image:
        "docker.io/library/php:8.3.32-fpm-bookworm@sha256:1e01582867762752354f3f4befb53a3108e46d41cefb026fd789f6083d9e61a9",
      version: "8.3.32",
    },
    8.4: {
      // https://hub.docker.com/layers/library/php/8.4.23-fpm-bookworm/
      image:
        "docker.io/library/php:8.4.23-fpm-bookworm@sha256:a32abe131158310756d3a1ac25322954f4bc922af563fd697ed177e7f4f908cb",
      version: "8.4.23",
    },
    8.5: {
      // https://hub.docker.com/layers/library/php/8.5.8-fpm-bookworm/
      image:
        "docker.io/library/php:8.5.8-fpm-bookworm@sha256:d68c995fab89d4f14df813e72f65f3b9abae6e6f88e91beb39e37dd6414e24fa",
      version: "8.5.8",
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
      // https://hub.docker.com/layers/library/php/8.2.32-fpm-trixie/
      image:
        "docker.io/library/php:8.2.32-fpm-trixie@sha256:0cb0ccc62ee5ee47909b52b74fe180c852439533a83dd7a01c8a65dc069e2591",
      version: "8.2.32",
    },
    8.3: {
      // https://hub.docker.com/layers/library/php/8.3.32-fpm-trixie/
      image:
        "docker.io/library/php:8.3.32-fpm-trixie@sha256:efaea017a0c269b359a5db12987d221eac127e192f98b60bb849538d2d9a3253",
      version: "8.3.32",
    },
    8.4: {
      // https://hub.docker.com/layers/library/php/8.4.23-fpm-trixie/
      image:
        "docker.io/library/php:8.4.23-fpm-trixie@sha256:1c3585e1e99f3fd7fbfed9db21601534082c9e1def91aa02e06e85fff0bc57ae",
      version: "8.4.23",
    },
    8.5: {
      // https://hub.docker.com/layers/library/php/8.5.8-fpm-trixie/
      image:
        "docker.io/library/php:8.5.8-fpm-trixie@sha256:3e0bf6c361c37c903745abe8942083b441d105232445f0d4dc4c08d53a75d8ea",
      version: "8.5.8",
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
  { defaultDebianVersion, defaultPHPVersion, versions },
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
