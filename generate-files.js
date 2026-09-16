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
					"docker.io/library/php:8.2.33-fpm-bookworm@sha256:babbe39d11a6c79895a3155953de5415bd450bab4fa74869e8f786110f359546",
				version: "8.2.33",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.33-fpm-bookworm/
				image:
					"docker.io/library/php:8.3.33-fpm-bookworm@sha256:1547a7b6fc3509870fc732f73aebeee62e73af3365858b075d4aad78e983920f",
				version: "8.3.33",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.25-fpm-bookworm/
				image:
					"docker.io/library/php:8.4.25-fpm-bookworm@sha256:a6d6f0b794dfd212886d3278498f8dc37f66890eddfa428b1cd87796438ecef6",
				version: "8.4.25",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.10-fpm-bookworm/
				image:
					"docker.io/library/php:8.5.10-fpm-bookworm@sha256:8e780a6e59508f418c7729681468322a2ce7d7cfe4266025054f41bbe85e3928",
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
					"docker.io/library/php:8.2.33-fpm-trixie@sha256:14d6b4b4b213f28579c12a5c57ed5fa3881bc576b2e48be37f7789f9d52cd75a",
				version: "8.2.33",
			},
			8.3: {
				// https://hub.docker.com/layers/library/php/8.3.33-fpm-trixie/
				image:
					"docker.io/library/php:8.3.33-fpm-trixie@sha256:c583af3594fdb0658f9a3e1a350b53fb68e6382d1430db914859fcfb7cb744b0",
				version: "8.3.33",
			},
			8.4: {
				// https://hub.docker.com/layers/library/php/8.4.25-fpm-trixie/
				image:
					"docker.io/library/php:8.4.25-fpm-trixie@sha256:c27f0d1c15968d17f40cd6f2755fbaca234474899583611afab46ae869da0c0e",
				version: "8.4.25",
			},
			8.5: {
				// https://hub.docker.com/layers/library/php/8.5.10-fpm-trixie/
				image:
					"docker.io/library/php:8.5.10-fpm-trixie@sha256:f697f5e5a02534fff868345cc77e29925a852bbea339c2ad53b690d28dba2868",
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
