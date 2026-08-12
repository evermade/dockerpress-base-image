# syntax=docker.io/docker/dockerfile-upstream:1.26.0
# Syntax via https://github.com/moby/buildkit/releases


#
# NOTE: THIS DOCKERFILE IS GENERATED VIA "generate-files.js"
#
# PLEASE DO NOT EDIT IT DIRECTLY.
#


FROM docker.io/library/php:7.4.33-fpm-bullseye@sha256:3ac7c8c74b2b047c7cb273469d74fc0d59b857aa44043e6ea6a0084372811d5b AS base

# Download the nginx keyring from https://blog.nginx.org/blog/updating-pgp-key-for-nginx-software
ADD --checksum=sha256:55385da31d198fa6a5012d40ae98ecb272a6c4e8fffffba94719ffd3e87de37a --chmod=444 https://nginx.org/keys/nginx_signing.key /tmp/nginx_signing.key

# Download the latest CA Bundle from https://curl.se/docs/caextract.html
ENV CA_BUNDLE_VERSION="2026-07-16"
ADD --checksum=sha256:3ff344e30b9b1ed2971044eabb438a08f2e2245ddb5f8ab1a3ad8b63ab4eaf91 --chmod=444 https://curl.se/ca/cacert-$CA_BUNDLE_VERSION.pem /usr/local/share/ca-certificates/ca-bundle.crt

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
ARG COSIGN_VERSION="3.1.3"
ADD --checksum=sha256:836bff947925edfc23eb9ce17af66fb1e43bb5e2bdd240520985ae52b585eae9 --chmod=444 https://raw.githubusercontent.com/sigstore/root-signing/refs/heads/main/metadata/root_history/10.root.json /tmp/sigstore-root.json
ADD --checksum=sha256:9c0e569b65883ac5ccf6e079989355832a3ee083b8cb991b3482d963e97896d9 --chmod=444 https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64-kms.sigstore.json /tmp/cosign-kms.sigstore.json
ADD --checksum=sha256:4629c757b7618056f8ddd7e2625ae9fdd94c0372a65049520bc7d9df9efc7f71 --chmod=444 https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64 /tmp/cosign

# Download go from https://go.dev/dl/
ARG GO_GPG_KEYS="EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796"
ARG GO_VERSION="1.26.5"
ADD --checksum=sha256:d0d73b7af22674ed1b66736b06973afd5892b48d3aa50f55478a706658581178 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz.asc /tmp/go.tar.gz.asc
ADD --checksum=sha256:5c2c3b16caefa1d968a94c1daca04a7ca301a496d9b086e17ad77bb81393f053 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz /tmp/go.tar.gz

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
ENV PYTHON_VERSION="3.14.7"
ADD --checksum=sha256:6f41efc358b146b5548dbfc0414e9247441f8524fb6ef59f1c4ca946ffc70701 --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz.sigstore /opt/python.tar.xz.sigstore
ADD --checksum=sha256:3b48dac8fb59f62eaa67ac83c1eb12bda1b7a08406dd286e252c11a66be27f81 --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz /opt/python.tar.xz

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

FROM base AS build_fail2ban

COPY --from=build_python /usr/local/bin/pip3.14 /usr/local/bin/pip3.14
COPY --from=build_python /usr/local/bin/python3.14 /usr/local/bin/python3.14
COPY --from=build_python /usr/local/lib/python3.14/ /usr/local/lib/python3.14/

# Download the fail2ban source (tag: 1.1.0) from https://github.com/fail2ban/fail2ban/releases
ARG FAIL2BAN_CHECKOUT="61799e15e1dd4389dea0cc7595da0a287835a177"
ADD --checksum=sha256:51d892640cb01e826404b01b61818160a9e6b46fe68e589bcbc4f42c45053e56 --chmod=444 https://github.com/fail2ban/fail2ban/archive/$FAIL2BAN_CHECKOUT.tar.gz /usr/src/fail2ban.tar.gz

ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/tmp/pip \
	--mount=type=bind,source=./fail2ban-requirements.txt,target=/opt/fail2ban/requirements.txt \
	\
	set -eux; \
	\
	/usr/local/bin/python3.14 -m venv /opt/fail2ban/; \
	\
	tar --extract --directory /opt/fail2ban --strip-components=1 --file /usr/src/fail2ban.tar.gz; \
	\
	/opt/fail2ban/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --only-binary :all: --upgrade pip; \
	/opt/fail2ban/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --prefer-binary --require-hashes --requirement /opt/fail2ban/requirements.txt; \
	\
	cd /opt/fail2ban; \
	\
	/opt/fail2ban/bin/python setup.py install; \
	\
	/opt/fail2ban/bin/fail2ban-client --help; \
	/opt/fail2ban/bin/fail2ban-client --version; \
	/opt/fail2ban/bin/fail2ban-regex --help; \
	/opt/fail2ban/bin/fail2ban-regex --version; \
	/opt/fail2ban/bin/fail2ban-server --help; \
	/opt/fail2ban/bin/fail2ban-server --version; \
	/opt/fail2ban/bin/fail2ban-testcases --help; \
	/opt/fail2ban/bin/fail2ban-testcases --version

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
ARG MODSEC_CRS_COMMIT="096f6890cbbd1037c56b28602942e7ee731f41ec"
ADD --checksum=sha256:06bfcafae1a7bea531d2b1bcca6291358f30c564fc236e346c36e051ff555b96 --unpack=true https://github.com/coreruleset/coreruleset/archive/$MODSEC_CRS_COMMIT.tar.gz /usr/local/share/

RUN set -eux; \
	\
	mv "/usr/local/share/coreruleset-${MODSEC_CRS_COMMIT}" /usr/local/share/coreruleset; \
	cp /usr/local/share/coreruleset/crs-setup.conf.example /usr/local/share/coreruleset/crs-setup.conf; \
	find /usr/local/share/coreruleset \! -name '*.conf' -type f -mindepth 1 -maxdepth 1 -delete; \
	find /usr/local/share/coreruleset \! -name 'rules' -type d -mindepth 1 -maxdepth 1 | xargs rm -rf

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

FROM base AS build_modsec

# Download the ModSecurity Git repository (branch: v3/master)
ARG MODSEC_CHECKOUT="7ea9fefbe0ba409d8733b4d682c8c4c059cd028d"
ADD --keep-git-dir https://github.com/owasp-modsecurity/ModSecurity.git#$MODSEC_CHECKOUT /usr/src/ModSecurity

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
ENV NGX_BROTLI_GIT_COMMIT="a71f9312c2deb28875acc7bacfdd5695a111aa53"
ADD --checksum=$NGX_BROTLI_GIT_COMMIT --keep-git-dir https://github.com/google/ngx_brotli.git#master /opt/ngx_brotli

# Download nginx cache purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge
ENV LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT="e6d846dd5af274542f4ba73a9339ec33535a2ff2"
ADD --checksum=sha256:15321309c1fe1f7eb8507f7da1b3bb91d4df33760948ea3f72678c0663ededea --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge/-/archive/$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT/libnginx-mod-http-cache-purge-$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT.tar.gz /opt/

# Download nginx geoip2 purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2
ENV LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT="d94e68ee1aed43a879d80d8081750a08027b9785"
ADD --checksum=sha256:b2e0a6195d184adfc9d38096438dc32aa2490c299f4b11371dfa36d7e8a8b5a7 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2/-/archive/$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT/libnginx-mod-http-geoip2-$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT.tar.gz /opt/

# Download nginx headers more module from https://github.com/openresty/headers-more-nginx-module
ENV HEADERS_MORE_NGINX_MODULE_GIT_COMMIT="812c1735d55817baa373afbcf6c4ce41f79033dd"
ADD --checksum=sha256:cb67d8ebe58252e272bd7703de08a3789cc5c46d061f4d9d1b86e3e7bf0cfedc --unpack=true https://github.com/openresty/headers-more-nginx-module/archive/$HEADERS_MORE_NGINX_MODULE_GIT_COMMIT.tar.gz /opt/

# Download the ModSecurity-nginx module from https://github.com/owasp-modsecurity/ModSecurity-nginx
ARG MODSEC_NGX_CHECKOUT="9eb44fd9ab0988756e1ab8ce5aa5548ddbe57846"
ADD --checksum=sha256:3565e87e01c2dfee72cc9a769b671c667efe3c440e02d3b200c206296f2257c6 --unpack=true https://github.com/owasp-modsecurity/ModSecurity-nginx/archive/$MODSEC_NGX_CHECKOUT.tar.gz /opt/

# Copy built ModSecurity libs
COPY --from=build_modsec /usr/local/modsecurity/ /usr/local/modsecurity/

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

# Copy fail2ban into the final image
# COPY --from=build_fail2ban /etc/fail2ban/ /etc/fail2ban/
# COPY --from=build_fail2ban /opt/fail2ban/bin/ /opt/fail2ban/bin/
# COPY --from=build_fail2ban /opt/fail2ban/lib/ /opt/fail2ban/lib/
# COPY --from=build_fail2ban /opt/fail2ban/pyvenv.cfg /opt/fail2ban/pyvenv.cfg
# COPY --from=build_fail2ban /usr/share/doc/fail2ban/ /usr/share/doc/fail2ban/
# COPY --from=build_fail2ban /var/lib/fail2ban/ /var/lib/fail2ban/

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
	# Create symlinks for fail2ban
	# ln -s /opt/fail2ban/bin/fail2ban-client /usr/local/bin/; \
	# ln -s /opt/fail2ban/bin/fail2ban-regex /usr/local/bin/; \
	# ln -s /opt/fail2ban/bin/fail2ban-server /usr/local/bin/; \
	# ln -s /opt/fail2ban/bin/fail2ban-testcases /usr/local/bin/; \
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
		\
		# imagick PHP extension dependencies
		libmagickcore-6.q16-6 \
		libmagickwand-6.q16-6 \
		\
		# intl PHP extension dependencies
		libicu67 \
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
	# Print fail2ban version information
	# fail2ban-client --version; \
	# fail2ban-client --help; \
	# fail2ban-regex --version; \
	# fail2ban-regex --help; \
	# fail2ban-server --version; \
	# fail2ban-server --help; \
	# fail2ban-testcases --version; \
	# fail2ban-testcases --help; \
	\
	# Print certbot version information
	certbot --version; \
	certbot --help all; \
	\
	# Print WP-CLI version information
	wp --allow-root --version
