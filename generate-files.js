const fs = require("node:fs");
const path = require("node:path");

const nunjucks = require("nunjucks");

const defaultDebianVersion = "debian13";

// Each architecture is built on a native runner and merged into a single multi-arch tag.
const architectures = [
	{ name: "amd64", os: "ubuntu-latest", platform: "linux/amd64" },
	{ name: "arm64", os: "ubuntu-24.04-arm", platform: "linux/arm64" },
];

const versions = {
	debian12: {
		defaultPHPVersion: "8.3",
		phpVersions: {
			8.2: {
				// https://hub.docker.com/layers/library/php/8.2.36-fpm-bookworm/
				image:
					"docker.io/library/php:8.2.36-fpm-bookworm@sha256:88befb856b24c643c3c7db53f4c72674ee565d6a5c73a92719db3907d9ae4725",
				version: "8.2.36",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.37-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.37-fpm-bookworm@sha256:ff3db7724750bf02a3c7d65be2790feb63f6173c2fb201328eb0a2295ca32041",
				version: "8.3.37",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.28-fpm-bookworm/
				image:
					"docker.io/library/php:8.4.28-fpm-bookworm@sha256:f79355c16ef38d4dacae8517290ce23c29f39e08b43b3394512cfa4079e4c70b",
				version: "8.4.28",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.13-fpm-bookworm/
				image:
					"docker.io/library/php:8.5.13-fpm-bookworm@sha256:bad1d3498eaa489efe88c1d532e47e2f4111304c3f0b19fbc428842c39ec155c",
				version: "8.5.13",
			},
		},
	},
	debian13: {
		defaultPHPVersion: "8.3",
		phpVersions: {
			8.2: {
				// https://hub.docker.com/layers/library/php/8.2.36-fpm-trixie/
				image:
					"docker.io/library/php:8.2.36-fpm-trixie@sha256:8e86eb23f37833babf060879b07b4eebb8683e4a04f5573acb494ff891359aa5",
				version: "8.2.36",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.37-fpm-trixie/
				image:
					"docker.io/library/php:8.3.37-fpm-trixie@sha256:a216054d3de38bc1e45704ef75402a6c43b659ef84f6adc0fa494b2233c195e0",
				version: "8.3.37",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.28-fpm-trixie/
				image:
					"docker.io/library/php:8.4.28-fpm-trixie@sha256:9185c66c60705ef5775fc2f9f92bcda1a3645b3d195abaccecc37485c28eded8",
				version: "8.4.28",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.13-fpm-trixie/
				image:
					"docker.io/library/php:8.5.13-fpm-trixie@sha256:52ba6f178d0a08f348578b03595661b7ff13defafacf4c823d045f2ecba8db8f",
				version: "8.5.13",
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
		architectures,
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
