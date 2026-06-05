# syntax=docker.io/docker/dockerfile-upstream:1.24-labs
# Syntax via https://github.com/moby/buildkit/releases


#
# NOTE: THIS DOCKERFILE IS GENERATED VIA "generate-files.js"
#
# PLEASE DO NOT EDIT IT DIRECTLY.
#


FROM docker.io/library/php:8.2.31-fpm-bookworm@sha256:e3a4ddf518fea2f046548444346b1ca94e60e8ca6aad1877d6e50af3e8f60f39 AS base

# Download the nginx keyring from https://blog.nginx.org/blog/updating-pgp-key-for-nginx-software
ADD --checksum=sha256:55385da31d198fa6a5012d40ae98ecb272a6c4e8fffffba94719ffd3e87de37a --chmod=444 https://nginx.org/keys/nginx_signing.key /tmp/nginx_signing.key

# Download the latest CA Bundle from https://curl.se/docs/caextract.html
ENV CA_BUNDLE_VERSION="2026-05-14"
ADD --checksum=sha256:86a1f3366afac7c6f8ae9f3c779ac221129328c43f0ab2b8817eb2f362a5025c --chmod=444 https://curl.se/ca/cacert-$CA_BUNDLE_VERSION.pem /usr/local/share/ca-certificates/ca-bundle.crt

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

FROM base AS build_cosign

# Download cosign from https://github.com/sigstore/cosign/releases and trusted root keys from https://github.com/sigstore/root-signing
ARG COSIGN_VERSION="3.0.6"
ADD --checksum=sha256:836bff947925edfc23eb9ce17af66fb1e43bb5e2bdd240520985ae52b585eae9 --chmod=444 https://raw.githubusercontent.com/sigstore/root-signing/refs/heads/main/metadata/root_history/10.root.json /tmp/sigstore-root.json
ADD --checksum=sha256:9f2728c7876e82561d1f4d2837e2a14180ff0fba1aeffd59163c48aea68cd519 --chmod=444 https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64-kms.sigstore.json /tmp/cosign-kms.sigstore.json
ADD --checksum=sha256:c956e5dfcac53d52bcf058360d579472f0c1d2d9b69f55209e256fe7783f4c74 --chmod=444 https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64 /tmp/cosign

# Download go from https://go.dev/dl/
ARG GO_GPG_KEYS="EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796"
ARG GO_VERSION="1.26.4"
ADD --checksum=sha256:6ca78e8304ce56dbdad1a25260c66385c0c5c2acbcc7bec7d7c2dbd1b8be9576 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz.asc /tmp/go.tar.gz.asc
ADD --checksum=sha256:1153d3d50e0ac764b447adfe05c2bcf08e889d42a02e0fe0259bd47f6733ad7f --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz /tmp/go.tar.gz

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
ENV PYTHON_VERSION="3.14.5"
ADD --checksum=sha256:b8da8fd56e69a8579d783e361ce47159dee6a1599bb6eee1a22c7c31f27c28f7 --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz.sigstore /opt/python.tar.xz.sigstore
ADD --checksum=sha256:7e32597b99e5d9a39abed35de4693fa169df3e5850d4c334337ffd6a19a36db6 --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz /opt/python.tar.xz

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

# Download WP-CLI binary, signature and bash tab completions
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

FROM base AS build_php_exts

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/tmp/pear \
	--mount=type=cache,sharing=private,target=/var/cache/apt \
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
		opcache \
		zip \
	; \
	\
	\
	pecl update-channels; \
	export MAKEFLAGS="-j$(nproc)"; \
	pecl install \
		--onlyreqdeps \
		--configureoptions='enable-redis-igbinary="yes" enable-redis-lzf="no" enable-redis-zstd="no" enable-redis-msgpack="no" enable-redis-lz4="yes" with-liblz4="yes"' \
		\
		igbinary \
		imagick \
		redis \
	; \
	find /usr/local/lib/php/extensions -type f -name '*.so' -exec strip {} \;; \
	docker-php-ext-enable \
		igbinary \
		imagick \
		redis \
	; \
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

FROM base AS build_nginx

# Download nginx brotli module from https://github.com/google/ngx_brotli
ENV NGX_BROTLI_GIT_COMMIT="a71f9312c2deb28875acc7bacfdd5695a111aa53"
ADD --checksum=$NGX_BROTLI_GIT_COMMIT --keep-git-dir https://github.com/google/ngx_brotli.git#master /opt/ngx_brotli

# Download nginx cache purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge
ENV LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT="847225d476013d80733730e08cecf58fa427249e"
ADD --checksum=sha256:40c4e74aabfca3831924d03bac835ba6d778e0dca3d6ff7f1d222d82bb00abc8 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge/-/archive/$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT/libnginx-mod-http-cache-purge-$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT.tar.gz /opt/

# Download nginx geoip2 purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2
ENV LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT="d94e68ee1aed43a879d80d8081750a08027b9785"
ADD --checksum=sha256:b2e0a6195d184adfc9d38096438dc32aa2490c299f4b11371dfa36d7e8a8b5a7 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2/-/archive/$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT/libnginx-mod-http-geoip2-$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT.tar.gz /opt/

# Download nginx headers more module from https://github.com/openresty/headers-more-nginx-module
ENV HEADERS_MORE_NGINX_MODULE_GIT_COMMIT="812c1735d55817baa373afbcf6c4ce41f79033dd"
ADD --checksum=sha256:cb67d8ebe58252e272bd7703de08a3789cc5c46d061f4d9d1b86e3e7bf0cfedc --unpack=true https://github.com/openresty/headers-more-nginx-module/archive/$HEADERS_MORE_NGINX_MODULE_GIT_COMMIT.tar.gz /opt/

# Download the default nginx fastcgi.conf from repo
ADD --checksum=sha256:b2c3d480a58f61f3a7dc61850b461e892e36f236317765a4f2f6d558c928fa57 --chmod=444 https://raw.githubusercontent.com/nginx/nginx/413158330abf082d1c0b48b264090f3bf4e4305e/conf/fastcgi.conf /opt/fastcgi.conf

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
	\
	apt-get update; \
	apt-get build-dep -y nginx; \
	apt-get install -y --no-install-recommends cmake git libmaxminddb-dev; \
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
	; \
	make -j"$(nproc)" modules; \
	mkdir -p /opt/nginx/modules; \
	mv objs/*.so /opt/nginx/modules/

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
		# gd PHP extension dependencies
		libavif15 \
		\
		# imagick PHP extension dependencies
		libmagickcore-6.q16-6 \
		libmagickwand-6.q16-6 \
		\
		# intl PHP extension dependencies
		libicu72 \
		\
		# zip PHP extension dependencies
		libzip4 \
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
	ln -s /etc/nginx/modules-available/mod-otel.conf /etc/nginx/modules-enabled/50-mod-otel.conf; \
	ln -s /etc/nginx/modules-available/mod-stream-geoip.conf /etc/nginx/modules-enabled/70-mod-stream-geoip.conf; \
	\
	rm /usr/lib/nginx/modules/*-debug.so; \
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
	# Test nginx configuration for failures and print nginx config contents
	nginx -T; \
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
