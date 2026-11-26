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
	debian13: {
		defaultPHPVersion: "8.3",
		phpVersions: {
			8.2: {
				// https://hub.docker.com/layers/library/php/8.2.36-fpm-trixie/
				image:
					"docker.io/library/php:8.2.36-fpm-trixie@sha256:66247f3e15ad735951c06af08e8b4bedb20874ea9464039146f2f0fad0ca9616",
				version: "8.2.36",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.37-fpm-trixie/
				image:
					"docker.io/library/php:8.3.37-fpm-trixie@sha256:e8d97ebb4e9c47c71993ed9367a96374c2d033facf16ff2e930e4e4a7c06ca6f",
				version: "8.3.37",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.28-fpm-trixie/
				image:
					"docker.io/library/php:8.4.28-fpm-trixie@sha256:495ab94788034640ddd6fb313476e75570261622c42704e5ae02047b8d934ea0",
				version: "8.4.28",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.13-fpm-trixie/
				image:
					"docker.io/library/php:8.5.13-fpm-trixie@sha256:7fd2766bd3bb6efcfb49591e4bf014e123c18f01149093bd508525c6bdf0cf9f",
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
