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
				// https://hub.docker.com/layers/library/php/8.2.34-fpm-bookworm/
				image:
					"docker.io/library/php:8.2.34-fpm-bookworm@sha256:deaf4ad0247d3b1581432245a04b8cc601ff546e2676fac8ab8911cc11e0837d",
				version: "8.2.34",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.35-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.35-fpm-bookworm@sha256:536a1188a926efe7e6f927b7ca01f3a043c63d0a527567c6d4d3bf9fbd637866",
				version: "8.3.35",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.26-fpm-bookworm/
				image:
					"docker.io/library/php:8.4.26-fpm-bookworm@sha256:43e1ac38217031dbbecae60e84ccf8593722031559178d199bf56adb0145d5d0",
				version: "8.4.26",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.11-fpm-bookworm
				image:
					"docker.io/library/php:8.5.11-fpm-bookworm@sha256:53eab56a8f43f51a92119f6c29b3448af98eec288ff17f92829354a4b4c9ca05",
				version: "8.5.11",
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
				// https://hub.docker.com/layers/library/php/8.2.34-fpm-trixie/
				image:
					"docker.io/library/php:8.2.34-fpm-trixie@sha256:826288d9afa65c1d0774769db02bd8b54afe35ad68bcc56eaf035c620c1b9386",
				version: "8.2.34",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.35-fpm-trixie/
				image:
					"docker.io/library/php:8.3.35-fpm-trixie@sha256:e436b5b6ce4a4e632f97a66ea0ea14c5d001e229e2adc5c8ed2f7b5b5fe5c989",
				version: "8.3.35",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.26-fpm-trixie/
				image:
					"docker.io/library/php:8.4.26-fpm-trixie@sha256:b0d7dff8f2d57155aebb5150dfcb5056a8c8d977aac3c2e21cfce32b8a4b004d",
				version: "8.4.26",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.11-fpm-trixie/
				image:
					"docker.io/library/php:8.5.11-fpm-trixie@sha256:584e584083bada479f0ee733a3025722a68e366eb721e618d1b6a252e4ff45c5",
				version: "8.5.11",
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
