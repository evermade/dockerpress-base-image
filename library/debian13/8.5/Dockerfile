# syntax=docker.io/docker/dockerfile-upstream:1.28.0
# Syntax via https://github.com/moby/buildkit/releases


#
# NOTE: THIS DOCKERFILE IS GENERATED VIA "generate-files.js"
#
# PLEASE DO NOT EDIT IT DIRECTLY.
#


# Versions of tools downloaded in architecture specific stages
ARG COSIGN_VERSION="3.1.4"
ARG GO_VERSION="1.27.3"

FROM docker.io/library/php:8.5.12-fpm-trixie@sha256:f665ad19c093eee54db3a03c89102d6828b1bbf4f327689e5947a8686c6585a1 AS base

# Download the nginx keyring from https://blog.nginx.org/blog/updating-pgp-key-for-nginx-software
ADD --checksum=sha256:55385da31d198fa6a5012d40ae98ecb272a6c4e8fffffba94719ffd3e87de37a --chmod=444 https://nginx.org/keys/nginx_signing.key /tmp/nginx_signing.key

# Download the latest CA Bundle from https://curl.se/docs/caextract.html
ENV CA_BUNDLE_VERSION="2026-10-20"
ADD --checksum=sha256:796f1389bfea13c0ed78f663b765baaff54a508e5483786bd6ece73c5e3e3cbe --chmod=444 https://curl.se/ca/cacert-$CA_BUNDLE_VERSION.pem /usr/local/share/ca-certificates/ca-bundle.crt

COPY --chmod=555 flush-ca-certificates /usr/local/bin

# This can be used to force rebuild below while allowing use of cache mounts
ARG BUILD_DATE="undefined"

# Builders aren't interactive
ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	flush-ca-certificates; \
	\
	apt-get update; \
	\
	apt-get upgrade -y; \
	\
	flush-ca-certificates; \
	\
	apt-get install -y --no-install-recommends \
		apt-transport-https \
		gnupg2 \
		jq \
		lsb-release \
	; \
	\
	export GNUPGHOME="$(mktemp -d)"; \
	\
	cat /tmp/nginx_signing.key | gpg --dearmor | tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null; \
	rm /tmp/nginx_signing.key; \
	\
	gpgconf --kill all; \
	rm -rf "$GNUPGHOME"; \
	\
	{ \
		echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] https://nginx.org/packages/debian $(lsb_release -cs) nginx"; \
		echo "deb-src [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] https://nginx.org/packages/debian $(lsb_release -cs) nginx"; \
	} | tee /etc/apt/sources.list.d/nginx.list; \
	{ \
		echo 'Package: nginx*'; \
		echo 'Pin: origin nginx.org'; \
		echo 'Pin: release o=nginx'; \
		echo 'Pin-Priority: 1001'; \
	} | tee /etc/apt/preferences.d/nginx; \
	\
	apt-get update

# Architecture specific downloads, the matching stage is selected via TARGETARCH.
FROM base AS fetch_cosign_amd64

# Download cosign from https://github.com/sigstore/cosign/releases
ARG COSIGN_VERSION
ADD --checksum=sha256:b1282021bf1d6f1031d5df46cba12386c9b438d56d276d72f4df184a0008512b --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-amd64-kms.sigstore.json /tmp/cosign-kms.sigstore.json
ADD --checksum=sha256:424e2c97d0b45fd7a6b608a87f090f35633f4c23ece5f092d48bba11aaf4bbfa --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-amd64 /tmp/cosign

# Download go from https://go.dev/dl/
ARG GO_VERSION
ADD --checksum=sha256:dd3a224bd98af9f050015d3f713b6f49a4cc2ba9d4b05d0b556ad419ed7dcf33 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz.asc /tmp/go.tar.gz.asc
ADD --checksum=sha256:65efbc80fdc1fa2cd2631cad5b481777a68e8725f34e89f50fc6ac714e379b40 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz /tmp/go.tar.gz

FROM base AS fetch_cosign_arm64

# Download cosign from https://github.com/sigstore/cosign/releases
ARG COSIGN_VERSION
ADD --checksum=sha256:844c90077824f8134a8ef5c0d13f60ce4b2942d97e072d7e4c211e9f1d495f76 --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-arm64-kms.sigstore.json /tmp/cosign-kms.sigstore.json
ADD --checksum=sha256:ade83b7aac62e131cacfe96d958948b2150cc9efec46a570a2649b8e27dedad2 --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-arm64 /tmp/cosign

# Download go from https://go.dev/dl/
ARG GO_VERSION
ADD --checksum=sha256:8de840c3f62a028f9e7285d287ddbb480401ba52f921c7f1cf4dd230fb2dd7aa --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-arm64.tar.gz.asc /tmp/go.tar.gz.asc
ADD --checksum=sha256:a06e99309dbcbdca1a8ccd2282c3ee146e55930886e26b4f1193269587165f49 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-arm64.tar.gz /tmp/go.tar.gz

FROM fetch_cosign_${TARGETARCH} AS build_cosign

# Download trusted root keys from https://github.com/sigstore/root-signing
ADD --checksum=sha256:836bff947925edfc23eb9ce17af66fb1e43bb5e2bdd240520985ae52b585eae9 --chmod=444 https://raw.githubusercontent.com/sigstore/root-signing/refs/heads/main/metadata/root_history/10.root.json /tmp/sigstore-root.json

ARG GO_GPG_KEYS="EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796"

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/root/go \
	--mount=type=cache,sharing=private,target=/usr/local/go \
	\
	set -eux; \
	\
	export GNUPGHOME="$(mktemp -d)"; \
	GPG_KEYS="$GO_GPG_KEYS"; \
	for key in $GPG_KEYS; do \
		gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key"; \
	done; \
	\
	# Verify signature of Go binary archive
	gpg --batch --verify /tmp/go.tar.gz.asc /tmp/go.tar.gz; \
	\
	gpgconf --kill all; \
	rm -rf "$GNUPGHOME"; \
	\
	# https://docs.sigstore.dev/cosign/system_config/installation/
	cd /tmp; \
	tar --extract --directory /usr/local --file /tmp/go.tar.gz; \
	export PATH=$PATH:/usr/local/go/bin:~/go/bin; \
	go version; \
	go install github.com/theupdateframework/go-tuf/cmd/tuf-client@latest; \
	tuf-client init https://tuf-repo-cdn.sigstore.dev sigstore-root.json; \
	tuf-client get https://tuf-repo-cdn.sigstore.dev artifact.pub > artifact.pub; \
	cat cosign-kms.sigstore.json | jq -r .messageSignature.signature | base64 -d > cosign-kms.sig.decoded; \
	openssl dgst -sha256 -verify artifact.pub -signature cosign-kms.sig.decoded cosign; \
	chmod +x cosign; \
	./cosign verify-blob --bundle cosign-kms.sigstore.json --key artifact.pub cosign; \
	mv cosign /usr/local/bin/

FROM base AS build_python

# Download the latest stable Python source from https://www.python.org/downloads/source/
ENV PYTHON_VERSION="3.14.10"
ADD --checksum=sha256:9d7c82682555f5be998a41f90c52b96e8605ba96cab61590a8ee29ebdeb24b0e --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz.sigstore /opt/python.tar.xz.sigstore
ADD --checksum=sha256:de414a57119abef52784d8993e341d53aed635fc2b05c2607d9f98a2c5b72032 --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz /opt/python.tar.xz

COPY --from=build_cosign /usr/local/bin/cosign /usr/local/bin/cosign

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	cd /opt; \
	\
	# https://www.python.org/downloads/metadata/sigstore/
	cosign verify-blob \
		--bundle /opt/python.tar.xz.sigstore \
		--certificate-identity "hugo@python.org" \
		--certificate-oidc-issuer "https://github.com/login/oauth" \
		/opt/python.tar.xz; \
	\
	apt-get update; \
	apt-get install -y --no-install-recommends \
		# Python dependencies
		libc6-dev \
		libffi-dev \
		libncursesw5-dev \
		libreadline-dev \
		libssl-dev \
		uuid-dev \
		zlib1g-dev \
	; \
	\
	mkdir -p /opt/python; \
	tar --extract --directory /opt/python --strip-components=1 --verbose --file /opt/python.tar.xz; \
	cd /opt/python; \
	./configure \
		--enable-optimizations \
		--enable-option-checking=fatal \
		--with-lto \
		--with-ensurepip \
	; \
	EXTRA_CFLAGS="$(dpkg-buildflags --get CFLAGS) -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer"; \
	LDFLAGS="$(dpkg-buildflags --get LDFLAGS)"; \
	make -j$(nproc) \
		"EXTRA_CFLAGS=${EXTRA_CFLAGS:-}" \
		"LDFLAGS=${LDFLAGS:-}" \
	; \
	rm python; \
	make -j$(nproc) \
		"EXTRA_CFLAGS=${EXTRA_CFLAGS:-}" \
		"LDFLAGS=${LDFLAGS:--Wl},-rpath='\$\$ORIGIN/../lib'" \
		python \
	; \
	make -j$(nproc) install; \
	\
	rm -rf /opt/python; \
	find /usr/local -depth \
		\( \
			\( -type d -a \( -name test -o -name tests -o -name idle_test \) \) \
			-o \( -type f -a \( -name '*.pyc' -o -name '*.pyo' -o -name 'libpython*.a' \) \) \
		\) -exec rm -rf '{}' + \
	; \
	\
	find /usr/local/bin -type f -exec sh -c 'file {} | grep "not stripped" && strip {} || true' \;; \
	find /usr/local/lib -type f -exec sh -c 'file {} | grep "not stripped" && strip {} || true' \;; \
	\
	ldconfig; \
	\
	export PYTHONDONTWRITEBYTECODE=1; \
	/usr/local/bin/python3 --version

FROM base AS build_supervisor

COPY --from=build_python /usr/local/bin/pip3.14 /usr/local/bin/pip3.14
COPY --from=build_python /usr/local/bin/python3.14 /usr/local/bin/python3.14
COPY --from=build_python /usr/local/lib/python3.14/ /usr/local/lib/python3.14/

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/tmp/pip \
	--mount=type=bind,source=./supervisor-requirements.txt,target=/opt/supervisor/requirements.txt \
	\
	set -eux; \
	\
	/usr/local/bin/python3.14 -m venv /opt/supervisor/; \
	\
	/opt/supervisor/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --only-binary :all: --upgrade pip; \
	/opt/supervisor/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --prefer-binary --require-hashes --requirement /opt/supervisor/requirements.txt; \
	\
	/opt/supervisor/bin/supervisord --version; \
	/opt/supervisor/bin/supervisord --help

FROM base AS build_certbot

COPY --from=build_python /usr/local/bin/pip3.14 /usr/local/bin/pip3.14
COPY --from=build_python /usr/local/bin/python3.14 /usr/local/bin/python3.14
COPY --from=build_python /usr/local/lib/python3.14/ /usr/local/lib/python3.14/

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/tmp/pip \
	--mount=type=bind,source=./certbot-requirements.txt,target=/opt/certbot/requirements.txt \
	\
	set -eux; \
	\
	/usr/local/bin/python3.14 -m venv /opt/certbot/; \
	\
	/opt/certbot/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --only-binary :all: --upgrade pip; \
	/opt/certbot/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --prefer-binary --require-hashes --requirement /opt/certbot/requirements.txt; \
	\
	/opt/certbot/bin/certbot --version; \
	/opt/certbot/bin/certbot --help all; \
	\
	{ \
		echo 'PATH="/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin"'; \
		echo "0 0,12 * * * root /opt/certbot/bin/python -c 'import random; import time; time.sleep(random.random() * 3600)' && /opt/certbot/bin/certbot renew -q"; \
	} | tee /opt/certbot/cron; \
	\
	mkdir /etc/letsencrypt

FROM base AS build_wp_cli

# Download WP-CLI binary, signature and bash tab completions from https://github.com/wp-cli/wp-cli/releases
ARG WP_CLI_GPG_KEYS="63AF7AA15067C05616FDDD88A3A2E8F226F0BC06"
ARG WP_CLI_VERSION="2.12.0"
ADD --checksum=sha256:9c2f9d93968d68ad2a8fa60eaf8f916f163740977be031b38d9ca6202e82b5be --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar.asc /usr/local/bin/wp.asc
ADD --checksum=sha256:ce34ddd838f7351d6759068d09793f26755463b4a4610a5a5c0a97b68220d85c --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar /usr/local/bin/wp
ADD --checksum=sha256:443ca0610ccae8d2d6aceba0ec4aa7929b87ed6cf54f666afed18d663a18a395 --chmod=444 https://raw.githubusercontent.com/wp-cli/wp-cli/v$WP_CLI_VERSION/utils/wp-completion.bash /etc/wp-completion.bash

ARG DEBIAN_FRONTEND="noninteractive"

RUN set -eux; \
	\
	export GNUPGHOME="$(mktemp -d)"; \
	GPG_KEYS="$WP_CLI_GPG_KEYS"; \
	for key in $GPG_KEYS; do \
		gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key"; \
	done; \
	\
	# Verify signature of WP-CLI binary
	gpg --batch --verify /usr/local/bin/wp.asc /usr/local/bin/wp; \
	\
	gpgconf --kill all; \
	rm -rf "$GNUPGHOME"; \
	\
	chmod +x /usr/local/bin/wp; \
	\
	wp --allow-root --version

FROM base AS build_crs

# Download the coreruleset from https://github.com/coreruleset/coreruleset
ARG MODSEC_CRS_COMMIT="58ff33b52e2a94493c64cbb7ab4fdc1aff0f82a0"
ADD --checksum=sha256:64c1bd1a0edda8bf70375f99c14179cc94df5fda94244455dc65d44c270ec088 --unpack=true https://github.com/coreruleset/coreruleset/archive/$MODSEC_CRS_COMMIT.tar.gz /usr/local/share/

RUN set -eux; \
	\
	mv "/usr/local/share/coreruleset-${MODSEC_CRS_COMMIT}" /usr/local/share/coreruleset; \
	cp /usr/local/share/coreruleset/crs-setup.conf.example /usr/local/share/coreruleset/crs-setup.conf; \
	find /usr/local/share/coreruleset \! -name '*.conf' -type f -mindepth 1 -maxdepth 1 -delete; \
	find /usr/local/share/coreruleset \! -name 'rules' -type d -mindepth 1 -maxdepth 1 | xargs rm -rf

FROM base AS build_php_exts

# Download PIE from https://github.com/php/pie/releases
ARG PIE_VERSION="1.5.3"
ADD --checksum=sha256:34a1315073b6089d4cdf4cc5a8295ecc6d36cfde683ef785582f7da0d74f127b --chmod=555 https://github.com/php/pie/releases/download/$PIE_VERSION/pie.phar /usr/local/bin/pie

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	savedAptMark="$(apt-mark showmanual)"; \
	\
	# Install the PHP extensions we need (https://make.wordpress.org/hosting/handbook/server-environment/#php-extensions)
	\
	# Install build dependencies to compile PHP extensions
	apt-get update; \
	apt-get install -y --no-install-recommends \
		# gd
		libavif-dev \
		libfreetype6-dev \
		libjpeg-dev \
		libpng-dev \
		libwebp-dev \
		libzip-dev \
		\
		# intl
		libicu-dev \
		\
		# imagick
		libmagickwand-dev \
		\
		# redis
		liblz4-dev \
		\
		# soap
		libxml2-dev \
	; \
	\
	# Configure PHP GD extension
	docker-php-ext-configure gd \
		--with-avif \
		--with-freetype \
		--with-jpeg \
		--with-webp \
	; \
	\
	# Compile and install PHP extensions
	docker-php-ext-install -j"$(nproc)" \
		bcmath \
		exif \
		gd \
		intl \
		mysqli \
		soap \
		zip \
	; \
	\
	# Compile, install and enable PECL extensions via PIE (igbinary must come before redis)
	# igbinary only has an RC with PIE support on Packagist so far, allow it until a stable is published
	pie install --no-build-tools-check --no-system-dependencies-check "igbinary/igbinary:^3.2@RC"; \
	pie install --no-build-tools-check --no-system-dependencies-check imagick/imagick; \
	pie install --no-build-tools-check --no-system-dependencies-check phpredis/phpredis \
		--enable-redis-igbinary \
		--enable-redis-lz4 \
		--with-liblz4=yes \
	; \
	find /usr/local/lib/php/extensions -type f -name '*.so' -exec strip {} \;; \
	\
	# Some misbehaving extensions end up outputting to stdout 🙈 (https://github.com/docker-library/wordpress/issues/669#issuecomment-993945967)
	out="$(php -r 'exit(0);')"; \
	[ -z "$out" ]; \
	err="$(php -r 'exit(0);' 3>&1 1>&2 2>&3)"; \
	[ -z "$err" ]; \
	\
	extDir="$(php -r 'echo ini_get("extension_dir");')"; \
	[ -d "$extDir" ]; \
	\
	# Reset apt-mark's "manual" list so that "purge --auto-remove" will remove all build dependencies
	apt-mark auto '.*' > /dev/null; \
	apt-mark manual $savedAptMark; \
	ldd "$extDir"/*.so \
		| awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) { next }; gsub("^/(usr/)?", "", so); printf "*%s\n", so }' \
		| sort -u \
		| xargs -r dpkg-query --search \
		| cut -d: -f1 \
		| sort -u \
		| xargs -rt apt-mark manual; \
	\
	apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
	\
	! { ldd "$extDir"/*.so | grep 'not found'; }; \
	\
	# Check for output like "PHP Warning:  PHP Startup: Unable to load dynamic library 'foo' (tried: ...)
	err="$(php --version 3>&1 1>&2 2>&3)"; \
	[ -z "$err" ]

FROM base AS build_modsec

# Download the ModSecurity Git repository (branch: v3/master)
ARG MODSEC_CHECKOUT="84b599623ebea596c72ddda9809298fc601d6f4f"
ADD --checksum=$MODSEC_CHECKOUT --keep-git-dir https://github.com/owasp-modsecurity/ModSecurity.git#$MODSEC_CHECKOUT /usr/src/ModSecurity

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	apt-get update; \
	apt-get install -y --no-install-recommends \
		dh-autoreconf \
		git \
		\
		# ModSecurity dependencies
		liblmdb-dev \
		libpcre2-dev \
		libyajl-dev \
	; \
	\
	cd /usr/src/ModSecurity; \
	./build.sh; \
	./configure --with-lmdb --with-yajl --enable-examples=no; \
	make -j$(nproc); \
	make -j$(nproc) install; \
	find /usr/local/modsecurity/bin -type f -exec sh -c 'file {} | grep "not stripped" && strip {} || true' \;; \
	find /usr/local/modsecurity/lib -type f -exec sh -c 'file {} | grep "not stripped" && strip {} || true' \;; \
	rm -rf /usr/local/modsecurity/lib/libmodsecurity.a /usr/local/modsecurity/lib/libmodsecurity.la /usr/local/modsecurity/lib/pkgconfig

FROM base AS build_nginx

# Download nginx brotli module from https://github.com/google/ngx_brotli
ENV NGX_BROTLI_GIT_COMMIT="53e0fb55f250f48fe80c0ddbf6c0f7103cdbaae1"
ADD --checksum=$NGX_BROTLI_GIT_COMMIT --keep-git-dir https://github.com/google/ngx_brotli.git#$NGX_BROTLI_GIT_COMMIT /opt/ngx_brotli

# Download nginx cache purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge
ENV LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT="1933c6474d9de118e7efbbd495c845ea4cde27ec"
ADD --checksum=sha256:aacf667d791e8c0e905c24d90330c4e3bafb0d56404b61ba584b85b6c28af868 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge/-/archive/$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT/libnginx-mod-http-cache-purge-$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT.tar.gz /opt/

# Download nginx geoip2 purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2
ENV LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT="17a5e04cc1ea18ecbdbdfc3bdd1504bc434fe0bf"
ADD --checksum=sha256:63e5a39c50ec03ee39eb32adef3e0273a42d4c61843b6a15acdf1a79bda45f07 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2/-/archive/$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT/libnginx-mod-http-geoip2-$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT.tar.gz /opt/

# Download nginx headers more module from https://github.com/openresty/headers-more-nginx-module
ENV HEADERS_MORE_NGINX_MODULE_GIT_COMMIT="21066f7eed72e4de4f6ec47b93e8d5f36c38b84a"
ADD --checksum=sha256:52f3f4dc1b34efa887155e92398052bf477702b2753585fe3482e2dd0136ea62 --unpack=true https://github.com/openresty/headers-more-nginx-module/archive/$HEADERS_MORE_NGINX_MODULE_GIT_COMMIT.tar.gz /opt/

# Download the ModSecurity-nginx module from https://github.com/owasp-modsecurity/ModSecurity-nginx
ARG MODSEC_NGX_CHECKOUT="b7cf44e57bc386bc5c15e5c9319e6b6b719357f2"
ADD --checksum=sha256:16f190ae434bf060dcaf5163d8272ba8dce859406c40af3aa2d5d2ab458527fe --unpack=true https://github.com/owasp-modsecurity/ModSecurity-nginx/archive/$MODSEC_NGX_CHECKOUT.tar.gz /opt/

# Copy built ModSecurity libs
COPY --from=build_modsec /usr/local/modsecurity/ /usr/local/modsecurity/

# Download the default nginx fastcgi.conf from repo
ADD --checksum=sha256:b2c3d480a58f61f3a7dc61850b461e892e36f236317765a4f2f6d558c928fa57 --chmod=444 https://raw.githubusercontent.com/nginx/nginx/413158330abf082d1c0b48b264090f3bf4e4305e/conf/fastcgi.conf /opt/fastcgi.conf
ADD --checksum=sha256:4bd3df7435a47cf1034d0d6385f4d32e1da18e08acbe3894fb10e511414dba9d --chmod=555 https://github.com/gordalina/cachetool/releases/download/12.0.0/cachetool.phar /usr/local/bin/cachetool

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	cd /opt; \
	\
	mv "libnginx-mod-http-cache-purge-${LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT}" libnginx-mod-http-cache-purge; \
	mv "libnginx-mod-http-geoip2-${LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT}" libnginx-mod-http-geoip2; \
	mv "headers-more-nginx-module-${HEADERS_MORE_NGINX_MODULE_GIT_COMMIT}" headers-more-nginx-module; \
	mv "ModSecurity-nginx-${MODSEC_NGX_CHECKOUT}" ModSecurity-nginx; \
	\
	apt-get update; \
	apt-get build-dep -y nginx; \
	apt-get install -y --no-install-recommends \
		cmake \
		git \
		\
		# geoip2 dependencies
		libmaxminddb-dev \
		\
		# ModSecurity dependencies
		liblmdb-dev \
		libpcre2-dev \
		libyajl-dev \
	; \
	\
	apt-get source nginx; \
	\
	cd /opt/ngx_brotli; \
	git submodule update --init --recursive; \
	cd /opt/ngx_brotli/deps/brotli; \
	mkdir out && cd out; \
	cmake -DCMAKE_BUILD_TYPE=Release \
		-DBUILD_SHARED_LIBS=OFF \
		-DCMAKE_C_FLAGS="-Ofast -flto -funroll-loops -ffunction-sections -fdata-sections -Wl,--gc-sections" \
		-DCMAKE_CXX_FLAGS="-Ofast -flto -funroll-loops -ffunction-sections -fdata-sections -Wl,--gc-sections" \
		-DCMAKE_INSTALL_PREFIX=./installed \
		.. \
	; \
	cmake --build . --parallel $(nproc) --config Release --target brotlienc; \
	\
	cd /opt/nginx-*/; \
	./configure \
		--with-compat \
		--add-dynamic-module=/opt/ngx_brotli \
		--add-dynamic-module=/opt/libnginx-mod-http-cache-purge \
		--add-dynamic-module=/opt/libnginx-mod-http-geoip2 \
		--add-dynamic-module=/opt/headers-more-nginx-module \
		--add-dynamic-module=/opt/ModSecurity-nginx \
	; \
	make -j"$(nproc)" modules; \
	mkdir -p /opt/nginx/modules; \
	mv objs/*.so /opt/nginx/modules/; \
	\
	find /opt/nginx/modules -type f -exec sh -c 'file {} | grep "not stripped" && strip {} || true' \;

FROM base AS final

LABEL maintainer="Evermade"

# Copy built cosign binary into the final image
COPY --from=build_cosign /usr/local/bin/cosign /usr/local/bin/cosign

# Copy built python3 into the final image
COPY --from=build_python /usr/local/bin/pip3.14 /usr/local/bin/pip3.14
COPY --from=build_python /usr/local/bin/python3.14 /usr/local/bin/python3.14
COPY --from=build_python /usr/local/lib/python3.14/ /usr/local/lib/python3.14/

# Copy built PHP extensions into the final image
COPY --from=build_php_exts /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
COPY --from=build_php_exts /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/

# Copy supervisor into the final image
COPY --from=build_supervisor /opt/supervisor/bin/ /opt/supervisor/bin/
COPY --from=build_supervisor /opt/supervisor/lib/ /opt/supervisor/lib/
COPY --from=build_supervisor /opt/supervisor/pyvenv.cfg /opt/supervisor/pyvenv.cfg

# Copy certbot into the final image
COPY --from=build_certbot /etc/letsencrypt/ /etc/letsencrypt/
COPY --from=build_certbot /opt/certbot/cron /etc/cron.d/certbot
COPY --from=build_certbot /opt/certbot/bin/ /opt/certbot/bin/
COPY --from=build_certbot /opt/certbot/lib/ /opt/certbot/lib/
COPY --from=build_certbot /opt/certbot/pyvenv.cfg /opt/certbot/pyvenv.cfg

# Copy coreruleset into the final image
COPY --from=build_crs --chmod=444 /usr/local/share/coreruleset/ /usr/local/share/coreruleset/

# @todo Copy built ModSecurity-nginx dynamic module into the final image
COPY --from=build_modsec /usr/src/ModSecurity/modsecurity.conf-recommended /etc/nginx/modsecurity/modsecurity.conf
COPY --from=build_modsec /usr/src/ModSecurity/unicode.mapping /etc/nginx/modsecurity/unicode.mapping
COPY --from=build_modsec /usr/local/modsecurity/bin/ /usr/local/modsecurity/bin/
COPY --from=build_modsec /usr/local/modsecurity/lib/ /usr/local/modsecurity/lib/

# Copy built nginx dynamic modules and fastcgi.conf into the final image
COPY --from=build_nginx --chmod=444 /opt/nginx/modules/ /usr/lib/nginx/modules/
COPY --from=build_nginx --chmod=444 /opt/fastcgi.conf /etc/nginx/fastcgi.conf

# Copy built WP-CLI binary and tab completions into the final image
COPY --from=build_wp_cli --chmod=555 /usr/local/bin/wp /usr/local/bin/wp
COPY --from=build_wp_cli --chmod=444 /etc/wp-completion.bash /etc/wp-completion.bash

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	# Install WP-CLI tab completions
	echo 'source /etc/wp-completion.bash' | tee -a /etc/bash.bashrc; \
	\
	# Create convenience symlinks for the python3 binaries
	ln -s /usr/local/bin/python3.14 /usr/local/bin/python; \
	ln -s /usr/local/bin/python3.14 /usr/local/bin/python3; \
	ln -s /usr/local/bin/pip3.14 /usr/local/bin/pip; \
	ln -s /usr/local/bin/pip3.14 /usr/local/bin/pip3; \
	\
	# Create symlinks for supervisor
	ln -s /opt/supervisor/bin/supervisord /usr/local/bin/; \
	ln -s /opt/supervisor/bin/supervisorctl /usr/local/bin/; \
	\
	# Create symlink for the modsec-rules-check binary
	ln -s /usr/local/modsecurity/bin/modsec-rules-check /usr/local/sbin/; \
	\
	# Create symlink for certbot
	ln -s /opt/certbot/bin/certbot /usr/local/bin/; \
	\
	# Install persistent apt packages
	apt-get update; \
	apt-get install -y --no-install-recommends \
		# PDF preview rendering for WordPress
		ghostscript \
		\
		# Nginx
		nginx \
		nginx-module-acme \
		nginx-module-geoip \
		nginx-module-image-filter \
		nginx-module-otel \
		\
		# Nginx GeoIP2 module
		libmaxminddb0 \
		\
		# Tools
		brotli \
		cron \
		gettext-base \
		gnupg \
		less \
		mariadb-client \
		nano \
		sudo \
		wget \
		zip \
		\
		# Logging utils
		expect \
		logrotate \
		moreutils \
		rsyslog \
		\
		# ModSecurity dependencies
		liblmdb0 \
		libpcre2-32-0 \
		libyajl2 \
		\
		# gd PHP extension dependencies
		libavif16 \
		\
		# imagick PHP extension dependencies
		libmagickcore-7.q16-10 \
		libmagickwand-7.q16-10 \
		\
		# intl PHP extension dependencies
		libicu76 \
		\
		# zip PHP extension dependencies
		libzip5 \
		\
		# soap PHP extension dependencies
		libxml2 \
	; \
	apt-get clean; \
	rm -rf /var/lib/apt/lists/*; \
	\
	mkdir /etc/nginx/modules-available /etc/nginx/modules-enabled; \
	\
	echo "load_module /usr/lib/nginx/modules/ngx_http_acme_module.so;" | tee /etc/nginx/modules-available/mod-http-acme.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so;" | tee /etc/nginx/modules-available/mod-http-brotli-filter.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_brotli_static_module.so;" | tee /etc/nginx/modules-available/mod-http-brotli-static.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_cache_purge_module.so;" | tee /etc/nginx/modules-available/mod-http-cache-purge.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_geoip_module.so;" | tee /etc/nginx/modules-available/mod-http-geoip.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_geoip2_module.so;" | tee /etc/nginx/modules-available/mod-http-geoip2.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_headers_more_filter_module.so;" | tee /etc/nginx/modules-available/mod-http-headers-more-filter.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_http_image_filter_module.so;" | tee /etc/nginx/modules-available/mod-http-image-filter.conf; \
	echo 'load_module /usr/lib/nginx/modules/ngx_http_modsecurity_module.so;' | tee /etc/nginx/modules-available/mod-http-modsecurity.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_otel_module.so;" | tee /etc/nginx/modules-available/mod-otel.conf; \
	echo "load_module /usr/lib/nginx/modules/ngx_stream_geoip_module.so;" | tee /etc/nginx/modules-available/mod-stream-geoip.conf; \
	\
	ln -s /etc/nginx/modules-available/mod-http-acme.conf /etc/nginx/modules-enabled/50-mod-http-acme.conf; \
	ln -s /etc/nginx/modules-available/mod-http-brotli-filter.conf /etc/nginx/modules-enabled/50-mod-http-brotli-filter.conf; \
	ln -s /etc/nginx/modules-available/mod-http-brotli-static.conf /etc/nginx/modules-enabled/50-mod-http-brotli-static.conf; \
	ln -s /etc/nginx/modules-available/mod-http-cache-purge.conf /etc/nginx/modules-enabled/50-mod-http-cache-purge.conf; \
	ln -s /etc/nginx/modules-available/mod-http-geoip.conf /etc/nginx/modules-enabled/50-mod-http-geoip.conf; \
	ln -s /etc/nginx/modules-available/mod-http-geoip2.conf /etc/nginx/modules-enabled/50-mod-http-geoip2.conf; \
	ln -s /etc/nginx/modules-available/mod-http-headers-more-filter.conf /etc/nginx/modules-enabled/50-mod-http-headers-more-filter.conf; \
	ln -s /etc/nginx/modules-available/mod-http-image-filter.conf /etc/nginx/modules-enabled/50-mod-http-image-filter.conf; \
	ln -s /etc/nginx/modules-available/mod-http-modsecurity.conf /etc/nginx/modules-enabled/50-mod-http-modsecurity.conf; \
	ln -s /etc/nginx/modules-available/mod-otel.conf /etc/nginx/modules-enabled/50-mod-otel.conf; \
	ln -s /etc/nginx/modules-available/mod-stream-geoip.conf /etc/nginx/modules-enabled/70-mod-stream-geoip.conf; \
	\
	rm /usr/lib/nginx/modules/*-debug.so; \
	\
	{ \
		echo '[Session]'; \
		echo 'session.upload_progress.enabled = 0'; \
		echo 'session.use_strict_mode = 1'; \
	} | tee /usr/local/etc/php/conf.d/zz-patches.ini; \
	\
	# Various backwards compatibility additions that were present previously
	chmod 755 /etc/nginx; \
	mkdir /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/snippets; \
	cat /etc/nginx/modules-enabled/50-mod-http-brotli-filter.conf /etc/nginx/modules-enabled/50-mod-http-brotli-static.conf | tee /etc/nginx/modules-enabled/50-mod-brotli.conf; \
	echo 'fastcgi_param  REMOTE_USER        $remote_user;' | tee -a /etc/nginx/fastcgi_params; \
	sed -i -e 's|}|    video/ogg                                        ogv;\n}|' /etc/nginx/mime.types; \
	sed -i -e 's|}|    video/x-matroska                                 mkv;\n}|' /etc/nginx/mime.types; \
	{ \
		echo 'proxy_set_header Host $http_host;'; \
		echo 'proxy_set_header X-Real-IP $remote_addr;'; \
		echo 'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;'; \
		echo 'proxy_set_header X-Forwarded-Proto $scheme;'; \
	} | tee /etc/nginx/proxy_params; \
	ln -s /usr/local/bin/supervisord /usr/bin/; \
	ln -s /usr/local/bin/supervisorctl /usr/bin/; \
	\
	# Some misbehaving extensions end up outputting to stdout 🙈 (https://github.com/docker-library/wordpress/issues/669#issuecomment-993945967)
	out="$(php -r 'exit(0);')"; \
	[ -z "$out" ]; \
	err="$(php -r 'exit(0);' 3>&1 1>&2 2>&3)"; \
	[ -z "$err" ]; \
	\
	extDir="$(php -r 'echo ini_get("extension_dir");')"; \
	[ -d "$extDir" ]; \
	\
	# Check for output like "PHP Warning:  PHP Startup: Unable to load dynamic library 'foo' (tried: ...)
	err="$(php --version 3>&1 1>&2 2>&3)"; \
	[ -z "$err" ]; \
	\
	# Print nginx version information
	nginx -V; \
	\
	# Test nginx configuration for failures with and without dynamic modules and print nginx config contents
	nginx -T; \
	cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak; \
	mv /etc/nginx/modules-enabled/50-mod-brotli.conf /etc/nginx/modules-enabled/50-mod-brotli.conf.disabled; \
	{ \
		echo 'include /etc/nginx/modules-enabled/*.conf;'; \
		cat /etc/nginx/nginx.conf.bak; \
	} | tee /etc/nginx/nginx.conf; \
	nginx -T; \
	mv /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf; \
	mv /etc/nginx/modules-enabled/50-mod-brotli.conf.disabled /etc/nginx/modules-enabled/50-mod-brotli.conf; \
	\
	# Print python and pip version information
	python3 --version; \
	pip3 --version; \
	\
	# Print supervisor version information
	supervisord --version; \
	supervisord --help; \
	\
	# Print certbot version information
	certbot --version; \
	certbot --help all; \
	\
	# Print WP-CLI version information
	wp --allow-root --version
