const fs = require("node:fs");
const path = require("node:path");

const nunjucks = require("nunjucks");

const defaultDebianVersion = "debian13";

const versions = {
	debian11: {
		defaultPHPVersion: "8.1",
		phpVersions: {
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
	},
	debian12: {
		defaultPHPVersion: "8.3",
		phpVersions: {
			8.1: {
				// https://hub.docker.com/layers/library/php/8.1.34-fpm-bookworm/
				image:
					"docker.io/library/php:8.1.34-fpm-bookworm@sha256:e3893eeb8f6fb719b6efa7e011e76a65cb1322054226250cedac1138b406aba4",
				version: "8.1.34",
			},
			8.2: {
				// https://hub.docker.com/layers/library/php/8.2.33-fpm-bookworm/
				image:
					"docker.io/library/php:8.2.33-fpm-bookworm@sha256:5623a1f394cfc9ec9710efc975db6d746618f1c3e047649232d5432a0b2f942c",
				version: "8.2.33",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.33-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.33-fpm-bookworm@sha256:78a4d3237f558785f4345538354470c4a736d2ffc05e6e8ee30cea161045a865",
				version: "8.3.33",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.24-fpm-bookworm/
				image:
					"docker.io/library/php:8.4.24-fpm-bookworm@sha256:c5fb7a0c02f4efe280691910c8b734995fa83598cdcf3115ef5dcb2e4617681c",
				version: "8.4.24",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.9-fpm-bookworm/
				image:
					"docker.io/library/php:8.5.9-fpm-bookworm@sha256:7b1deadd1d73c72d2eb952ebb494cd3e902d7b6ae4e4b3cd1113a1041b530c2c",
				version: "8.5.9",
			},
		},
	},
	debian13: {
		defaultPHPVersion: "8.3",
		phpVersions: {
			8.1: {
				// https://hub.docker.com/layers/library/php/8.1.34-fpm-trixie/
				image:
					"docker.io/library/php:8.1.34-fpm-trixie@sha256:a3118db1911fdd3b3ac66605122ddc859286688ced86fc860fec6d19cc2d6c55",
				version: "8.1.34",
			},
			8.2: {
				// https://hub.docker.com/layers/library/php/8.2.33-fpm-trixie/
				image:
					"docker.io/library/php:8.2.33-fpm-trixie@sha256:07da04f452476c49f810c2081a2ce38536003041d5b70383350c66e49e4485f8",
				version: "8.2.33",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.33-fpm-trixie/
				image:
					"docker.io/library/php:8.3.33-fpm-trixie@sha256:b7b2846437277f3d0a6f43161e4e91f82f3649c3e773d36509d53ca6519e2446",
				version: "8.3.33",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.24-fpm-trixie/
				image:
					"docker.io/library/php:8.4.24-fpm-trixie@sha256:9467f10bf42897dec0abb73ee20c747ebd45463ec9d6fcc4044cb83eba6dade7",
				version: "8.4.24",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.9-fpm-trixie/
				image:
					"docker.io/library/php:8.5.9-fpm-trixie@sha256:32ef9f35b567a741f24c5d2c3312f803fe6c9e34b7db46212f95fce675e1d13f",
				version: "8.5.9",
			},
		},
	},
};

const phpVersions = Object.values(versions)
	.map((v) => v.phpVersions)
	.reduce((acc, phpVersions) => {
		const versions = Object.keys(phpVersions);
		const uniqueVersions = versions.filter((value) => !acc.includes(value));
		return acc.concat(uniqueVersions);
	}, []);

// Generate Dockerfiles for each PHP variant.
fs.rmSync(path.resolve(__dirname, "library"), { recursive: true, force: true });

for (const debianVersion in versions) {
	for (const phpMajorMinorVersion in versions[debianVersion].phpVersions) {
		const php = versions[debianVersion].phpVersions[phpMajorMinorVersion];

		nunjucks.render(
			path.resolve(__dirname, "Dockerfile.template.njk"),
			{
				baseImage: php.image,
				debianVersion,
				phpMajorMinorVersion,
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
	{
		defaultDebianVersion,
		phpVersions,
		versions,
	},
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
