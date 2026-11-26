# syntax=docker.io/docker/dockerfile-upstream:1.29.0
# Syntax via https://github.com/moby/buildkit/releases


#
# NOTE: THIS DOCKERFILE IS GENERATED VIA "generate-files.js"
#
# PLEASE DO NOT EDIT IT DIRECTLY.
#


# Versions of tools downloaded in architecture specific stages
ARG COSIGN_VERSION="3.1.6"
ARG GO_VERSION="1.27.4"

FROM docker.io/library/php:8.2.36-fpm-bookworm@sha256:afd39a6125fcb59cbe9ff0e2183bbad56aecc59858f9262c73cf6f13ddb9a9e0 AS base

# Builders aren't interactive
ARG DEBIAN_FRONTEND="noninteractive"

# Download the nginx keyring from https://blog.nginx.org/blog/updating-pgp-key-for-nginx-software
ADD --checksum=sha256:55385da31d198fa6a5012d40ae98ecb272a6c4e8fffffba94719ffd3e87de37a --chmod=444 https://nginx.org/keys/nginx_signing.key /usr/share/keyrings/nginx-archive-keyring.asc

# Download the latest CA Bundle from https://curl.se/docs/caextract.html
ENV CA_BUNDLE_VERSION="2026-11-05"
ADD --checksum=sha256:427c064216761a1e72a8b30f0d954d08cb6e4435a82091fb865afd20c8497285 --chmod=444 https://curl.se/ca/cacert-$CA_BUNDLE_VERSION.pem /usr/local/share/ca-certificates/ca-bundle.crt

COPY --chmod=555 flush-ca-certificates gpg-verify /usr/local/bin/

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
	{ \
		echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.asc] https://nginx.org/packages/debian $(lsb_release -cs) nginx"; \
		echo "deb-src [signed-by=/usr/share/keyrings/nginx-archive-keyring.asc] https://nginx.org/packages/debian $(lsb_release -cs) nginx"; \
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
ADD --checksum=sha256:08a51657fa371fa91b518c13ba3491402762b31f97e00dd1b4054a8222630faf --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-amd64-kms.sigstore.json /tmp/cosign-kms.sigstore.json
ADD --checksum=sha256:318a99ade4156a0c4113aa983b46c0a0830fa7896a096c63121ee47b610a94c6 --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-amd64 /tmp/cosign

# Download go from https://go.dev/dl/
ARG GO_VERSION
ADD --checksum=sha256:f8a184c1bdff47904fe93d616f9196a6baeb01fb932740f6b8bafaa547797bd4 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz.asc /tmp/go.tar.gz.asc
ADD --checksum=sha256:7226736c2339719cda28fbf3a54d71aa63bcefe376e98cef00034268dab24840 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz /tmp/go.tar.gz

FROM base AS fetch_cosign_arm64

# Download cosign from https://github.com/sigstore/cosign/releases
ARG COSIGN_VERSION
ADD --checksum=sha256:5f635740aa77add2eb55d955483133ae07fa18a71bf98475e95759e5b4f03b75 --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-arm64-kms.sigstore.json /tmp/cosign-kms.sigstore.json
ADD --checksum=sha256:bbb2ebc765f483cf9fac42da8763dddc2b55b350ee12ea0c44a520a6d6d52334 --chmod=444 https://github.com/sigstore/cosign/releases/download/v$COSIGN_VERSION/cosign-linux-arm64 /tmp/cosign

# Download go from https://go.dev/dl/
ARG GO_VERSION
ADD --checksum=sha256:560d3e9154e52cc9e206472c3636d9bed5573cb7cf8c17c0feba2612e6ff5e8b --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-arm64.tar.gz.asc /tmp/go.tar.gz.asc
ADD --checksum=sha256:3392582988a273a87ab5043ee1b2c9c17a2c3c00580bf9326c47a2e0aaaeac92 --chmod=444 https://go.dev/dl/go$GO_VERSION.linux-arm64.tar.gz /tmp/go.tar.gz

FROM fetch_cosign_$TARGETARCH AS build_cosign

# Download trusted root keys from https://github.com/sigstore/root-signing
ADD --checksum=sha256:836bff947925edfc23eb9ce17af66fb1e43bb5e2bdd240520985ae52b585eae9 --chmod=444 https://raw.githubusercontent.com/sigstore/root-signing/refs/heads/main/metadata/root_history/10.root.json /tmp/sigstore-root.json

# Download the Go signing key, fingerprint EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796
ADD --checksum=sha256:54dea5f6c2a26091578cf52a999cebc6b64df478d37ad4dce96376b711e3b27c --chmod=444 https://dl.google.com/dl/linux/linux_signing_key.pub /tmp/go-key.asc

RUN --mount=type=cache,sharing=private,target=/root/go \
	--mount=type=cache,sharing=private,target=/usr/local/go \
	\
	set -eux; \
	\
	gpg-verify /tmp/go-key.asc /tmp/go.tar.gz.asc /tmp/go.tar.gz; \
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

ARG DEBIAN_FRONTEND="noninteractive"

# Download the latest stable Python source from https://www.python.org/downloads/source/
ENV PYTHON_VERSION="3.14.10"
ADD --checksum=sha256:9d7c82682555f5be998a41f90c52b96e8605ba96cab61590a8ee29ebdeb24b0e --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz.sigstore /opt/python.tar.xz.sigstore
ADD --checksum=sha256:de414a57119abef52784d8993e341d53aed635fc2b05c2607d9f98a2c5b72032 --chmod=444 https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz /opt/python.tar.xz

COPY --from=build_cosign /usr/local/bin/cosign /usr/local/bin/cosign

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

# Download the WP-CLI signing key, fingerprint 63AF7AA15067C05616FDDD88A3A2E8F226F0BC06
ADD --checksum=sha256:69b4633330b4a4bc7ac4de4981b43d3e60d9a3438a2d5246b8e3a0899000dc7c --chmod=444 https://raw.githubusercontent.com/wp-cli/builds/64482c7ceaca9253828b1efef392f6297cf89d8e/wp-cli.pgp /tmp/wp-cli-key.asc

# Download WP-CLI binary, signature and bash tab completions from https://github.com/wp-cli/wp-cli/releases
ARG WP_CLI_VERSION="2.12.0"
ADD --checksum=sha256:9c2f9d93968d68ad2a8fa60eaf8f916f163740977be031b38d9ca6202e82b5be --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar.asc /usr/local/bin/wp.asc
ADD --checksum=sha256:ce34ddd838f7351d6759068d09793f26755463b4a4610a5a5c0a97b68220d85c --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar /usr/local/bin/wp
ADD --checksum=sha256:443ca0610ccae8d2d6aceba0ec4aa7929b87ed6cf54f666afed18d663a18a395 --chmod=444 https://raw.githubusercontent.com/wp-cli/wp-cli/v$WP_CLI_VERSION/utils/wp-completion.bash /etc/wp-completion.bash

RUN set -eux; \
	\
	gpg-verify /tmp/wp-cli-key.asc /usr/local/bin/wp.asc /usr/local/bin/wp; \
	\
	chmod +x /usr/local/bin/wp; \
	\
	wp --allow-root --version

FROM base AS build_crs

# Download the coreruleset signing key, fingerprint 36006F0E0BA167832158821138EEACA1AB8A6E72
ADD --checksum=sha256:b3ea4d3014e9386b61a12cadd986360b358996624b26f9fb6be0fc8a219873ca --chmod=444 https://coreruleset.org/security.asc /tmp/crs-key.asc

# Download coreruleset from https://github.com/coreruleset/coreruleset/releases
ARG MODSEC_CRS_VERSION="4.31.0"
ADD --checksum=sha256:ad606547c466497f855a9508ebde1c38949a07fba7ce7737b29104178849b695 --chmod=444 https://github.com/coreruleset/coreruleset/releases/download/v$MODSEC_CRS_VERSION/coreruleset-$MODSEC_CRS_VERSION-minimal.tar.gz.asc /tmp/crs.tar.gz.asc
ADD --checksum=sha256:70e8c32ea5b57962a9081c74b738a498dcd299b1fc32099de6444b8ca5cdd8f5 --chmod=444 https://github.com/coreruleset/coreruleset/releases/download/v$MODSEC_CRS_VERSION/coreruleset-$MODSEC_CRS_VERSION-minimal.tar.gz /tmp/crs.tar.gz

RUN set -eux; \
	\
	gpg-verify /tmp/crs-key.asc /tmp/crs.tar.gz.asc /tmp/crs.tar.gz; \
	\
	mkdir /usr/local/share/coreruleset; \
	tar --extract --gzip --file /tmp/crs.tar.gz --directory /usr/local/share/coreruleset --strip-components=1 \
		"coreruleset-$MODSEC_CRS_VERSION/crs-setup.conf.example" \
		"coreruleset-$MODSEC_CRS_VERSION/rules"; \
	mv /usr/local/share/coreruleset/crs-setup.conf.example /usr/local/share/coreruleset/crs-setup.conf

FROM base AS build_php_exts

ARG DEBIAN_FRONTEND="noninteractive"

# Download PIE from https://github.com/php/pie/releases
ARG PIE_VERSION="1.6.0"
ADD --checksum=sha256:81041b276f4e23dfdfa6dc941e5745f9adec824a1bcf6141e226181ef43f519e --chmod=555 https://github.com/php/pie/releases/download/$PIE_VERSION/pie.phar /usr/local/bin/pie

# PIE package versions from https://packagist.org/extensions
ARG IGBINARY_VERSION="3.2.17RC1"
ARG IMAGICK_VERSION="3.8.1"
ARG PHPREDIS_VERSION="6.3.0"
ARG XDEBUG_VERSION="3.5.3"

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
		opcache \
		soap \
		zip \
	; \
	\
	# Compile, install and enable PECL extensions via PIE (igbinary must come before redis)
	pie install --no-build-tools-check --no-system-dependencies-check "igbinary/igbinary:$IGBINARY_VERSION"; \
	pie install --no-build-tools-check --no-system-dependencies-check "imagick/imagick:$IMAGICK_VERSION"; \
	pie install --no-build-tools-check --no-system-dependencies-check "phpredis/phpredis:$PHPREDIS_VERSION" \
		--enable-redis-igbinary \
		--enable-redis-lz4 \
		--with-liblz4=yes \
	; \
	# Installed but not enabled, enable downstream with docker-php-ext-enable xdebug
	pie install --no-build-tools-check --no-system-dependencies-check --skip-enable-extension "xdebug/xdebug:$XDEBUG_VERSION"; \
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

ARG DEBIAN_FRONTEND="noninteractive"

# Download the ModSecurity Git repository (branch: v3/master)
ARG MODSEC_CHECKOUT="475aece84b0823a4318cf31c558a9584d660dc47"
ADD --checksum=$MODSEC_CHECKOUT --keep-git-dir https://github.com/owasp-modsecurity/ModSecurity.git#$MODSEC_CHECKOUT /usr/src/ModSecurity

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

ARG DEBIAN_FRONTEND="noninteractive"

# Download nginx brotli module from https://github.com/google/ngx_brotli
ENV NGX_BROTLI_GIT_COMMIT="53e0fb55f250f48fe80c0ddbf6c0f7103cdbaae1"
ADD --checksum=$NGX_BROTLI_GIT_COMMIT https://github.com/google/ngx_brotli.git#$NGX_BROTLI_GIT_COMMIT /opt/ngx_brotli

# Download nginx cache purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge
ENV LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT="1933c6474d9de118e7efbbd495c845ea4cde27ec"
ADD --checksum=sha256:aacf667d791e8c0e905c24d90330c4e3bafb0d56404b61ba584b85b6c28af868 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-cache-purge/-/archive/$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT/libnginx-mod-http-cache-purge-$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT.tar.gz /opt/

# Download nginx geoip2 purge module from https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2
ENV LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT="17a5e04cc1ea18ecbdbdfc3bdd1504bc434fe0bf"
ADD --checksum=sha256:63e5a39c50ec03ee39eb32adef3e0273a42d4c61843b6a15acdf1a79bda45f07 --unpack=true https://salsa.debian.org/nginx-team/libnginx-mod-http-geoip2/-/archive/$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT/libnginx-mod-http-geoip2-$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT.tar.gz /opt/

# Download nginx headers more module from https://github.com/openresty/headers-more-nginx-module
ENV HEADERS_MORE_NGINX_MODULE_GIT_COMMIT="e30b10e0bb1cfb042d76ba3a865410ff95d65660"
ADD --checksum=sha256:7ae52431c2dd9dd98970d05b4b017e55b9261af1bdfdbf827633daf730503503 --unpack=true https://github.com/openresty/headers-more-nginx-module/archive/$HEADERS_MORE_NGINX_MODULE_GIT_COMMIT.tar.gz /opt/

# Download the ModSecurity-nginx module from https://github.com/owasp-modsecurity/ModSecurity-nginx
ARG MODSEC_NGX_CHECKOUT="8de0e0ec5b786d9a6f2d23133f63eced730b2f7d"
ADD --checksum=sha256:4f102e3ebc7fe71571e2451461d1b50e5c92925274ca28ef27a9459aba60678e --unpack=true https://github.com/owasp-modsecurity/ModSecurity-nginx/archive/$MODSEC_NGX_CHECKOUT.tar.gz /opt/

# Copy built ModSecurity libs
COPY --from=build_modsec /usr/local/modsecurity/ /usr/local/modsecurity/

# Download the default nginx fastcgi.conf from repo
ADD --checksum=sha256:b2c3d480a58f61f3a7dc61850b461e892e36f236317765a4f2f6d558c928fa57 --chmod=444 https://raw.githubusercontent.com/nginx/nginx/413158330abf082d1c0b48b264090f3bf4e4305e/conf/fastcgi.conf /opt/fastcgi.conf

# Download cachetool from https://github.com/gordalina/cachetool/releases
ADD --checksum=sha256:16c2b56d61b71bca639ca9dc74763668bea32dbe52215f49828ac4a333ee9abd --chmod=555 https://github.com/gordalina/cachetool/releases/download/11.0.0/cachetool.phar /usr/local/bin/cachetool

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	\
	set -eux; \
	\
	cd /opt; \
	\
	mv "libnginx-mod-http-cache-purge-$LIBNGINX_MOD_HTTP_CACHE_PURGE_GIT_COMMIT" libnginx-mod-http-cache-purge; \
	mv "libnginx-mod-http-geoip2-$LIBNGINX_MOD_HTTP_GEOIP2_GIT_COMMIT" libnginx-mod-http-geoip2; \
	mv "headers-more-nginx-module-$HEADERS_MORE_NGINX_MODULE_GIT_COMMIT" headers-more-nginx-module; \
	mv "ModSecurity-nginx-$MODSEC_NGX_CHECKOUT" ModSecurity-nginx; \
	\
	apt-get update; \
	apt-get build-dep -y nginx; \
	apt-get install -y --no-install-recommends \
		cmake \
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

ARG DEBIAN_FRONTEND="noninteractive"

# Copy built cosign binary into the final image
COPY --from=build_cosign /usr/local/bin/cosign /usr/local/bin/cosign

# Copy built python3 into the final image
COPY --from=build_python /usr/local/bin/pip3.14 /usr/local/bin/pip3.14
COPY --from=build_python /usr/local/bin/python3.14 /usr/local/bin/python3.14
COPY --from=build_python /usr/local/lib/python3.14/ /usr/local/lib/python3.14/

# Copy PIE and built PHP extensions into the final image
COPY --from=build_php_exts /usr/local/bin/pie /usr/local/bin/pie
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
