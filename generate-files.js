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
					"docker.io/library/php:8.2.35-fpm-bookworm@sha256:a34985e5d46df8d1cba0c509f870413886a29e3fe7f1edf17f64a7babf306d09",
				version: "8.2.35",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.36-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.36-fpm-bookworm@sha256:873477b804576792889aac5b055e8e92077596b19d42747c0cf85a12229d06dd",
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
					"docker.io/library/php:8.2.35-fpm-trixie@sha256:c4790315a6c550b759f971677deaca83bbd7543dd3d233fbd920e529b1fe4ddb",
				version: "8.2.35",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.36-fpm-trixie/
				image:
					"docker.io/library/php:8.3.36-fpm-trixie@sha256:a2d39885e245cdf5120b9eafada552cd49c73edc53285179148dd3e2ec42c2a6",
				version: "8.3.36",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.27-fpm-trixie/
				image:
					"docker.io/library/php:8.4.27-fpm-trixie@sha256:64aff665308e23ba8804a6c43f75837e9bcdcc31735fc0f74af8899fe5304b07",
				version: "8.4.27",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.12-fpm-trixie/
				image:
					"docker.io/library/php:8.5.12-fpm-trixie@sha256:8b4b4a764f7985137b13e4cb49dd59e967d9daa7946a731f9d06e31e748e39bb",
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
