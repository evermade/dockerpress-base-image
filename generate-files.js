const fs = require("node:fs");
const path = require("node:path");

const nunjucks = require("nunjucks");

const defaultDebianVersion = "debian13";

// Each architecture is built on a native runner and merged into a single multi-arch tag.
const architectures = [
	{ name: "amd64", os: "ubuntu-latest", platform: "linux/amd64" },
	// { name: "arm64", os: "ubuntu-24.04-arm", platform: "linux/arm64" },
];

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
				// https://hub.docker.com/layers/library/php/8.2.35-fpm-bookworm/
				image:
					"docker.io/library/php:8.2.35-fpm-bookworm@sha256:df02d5357c8c1cd645c9a7e7d87efb278c8e2628016ae4556fdab24da7030c1e",
				version: "8.2.35",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.36-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.36-fpm-bookworm@sha256:53cec4b54c747a101329e475ae86d5f7421bc5783a2868ceec07f871ee1a959a",
				version: "8.3.36",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.27-fpm-bookworm/
				image:
					"docker.io/library/php:8.4.27-fpm-bookworm@sha256:6d2c08c2ce0548e9bc55e21aab68f5a2613e635e4225fdea84290459728995e7",
				version: "8.4.27",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.12-fpm-bookworm/
				image:
					"docker.io/library/php:8.5.12-fpm-bookworm@sha256:740a5adab5af19504d8aa0754e903e20b40b0153cfd4013c11e4df2029a7b73c",
				version: "8.5.12",
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
				// https://hub.docker.com/layers/library/php/8.2.35-fpm-trixie/
				image:
					"docker.io/library/php:8.2.35-fpm-trixie@sha256:9df26a5a4ead75adc0a2e688716588c5109e55dd840c7b97208a696373d261eb",
				version: "8.2.35",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.36-fpm-trixie/
				image:
					"docker.io/library/php:8.3.36-fpm-trixie@sha256:0cd1acdea990e98f36f6605d01ce55f47eb7d49eb0f23c0765bd8b5621056f75",
				version: "8.3.36",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.27-fpm-trixie/
				image:
					"docker.io/library/php:8.4.27-fpm-trixie@sha256:070c5a1dac19c108905c09093e3f5cf228ece8feaea84e33135b3da99de32946",
				version: "8.4.27",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.12-fpm-trixie/
				image:
					"docker.io/library/php:8.5.12-fpm-trixie@sha256:f665ad19c093eee54db3a03c89102d6828b1bbf4f327689e5947a8686c6585a1",
				version: "8.5.12",
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
