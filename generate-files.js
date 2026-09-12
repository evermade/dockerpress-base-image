const fs = require("node:fs");
const path = require("node:path");

const nunjucks = require("nunjucks");

const defaultDebianVersion = "debian13";

const versions = {
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
					"docker.io/library/php:8.2.33-fpm-bookworm@sha256:cf628d5395be83cadf709178525db7e541217032c122a0db008085ee2a7dba74",
				version: "8.2.33",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.33-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.33-fpm-bookworm@sha256:84ffb6f84362cd0cc74d6dea47cc1b376b4d7477f97c84b0e5bb287ab9df056c",
				version: "8.3.33",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.25-fpm-bookworm/
				image:
					"docker.io/library/php:8.4.25-fpm-bookworm@sha256:075b11566518bfa979bb9f2fe2e5359148326d659b15a2f414c2c305a0479a4e",
				version: "8.4.25",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.10-fpm-bookworm/
				image:
					"docker.io/library/php:8.5.10-fpm-bookworm@sha256:81b9c405b013ebda0c9b8cd7a1a61424cf3627ca96348d93752a9b0539ce9a25",
				version: "8.5.10",
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
					"docker.io/library/php:8.2.33-fpm-trixie@sha256:596175799ca76a93d5d0c3cda7d5f70fccfc86dfdaf97580c1c27e665aba991f",
				version: "8.2.33",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.33-fpm-trixie/
				image:
					"docker.io/library/php:8.3.33-fpm-trixie@sha256:5ad27201cf5cdf1704e147218e64fa0db2155ecda26edbe2b3eeb7b90cbf9328",
				version: "8.3.33",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.25-fpm-trixie/
				image:
					"docker.io/library/php:8.4.25-fpm-trixie@sha256:59fa733c9af643a122f8a9976119460e35ce76dd0a3f2b9c8f75af8e361a54e2",
				version: "8.4.25",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.10-fpm-trixie/
				image:
					"docker.io/library/php:8.5.10-fpm-trixie@sha256:70076c1cae0cd0ba6761832417e3a1df3e5560f0544eb0fe40357373e54420fe",
				version: "8.5.10",
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
