# syntax=docker/dockerfile:1

FROM php:8.3.31-fpm-bookworm AS base

ENV WP_CLI_GPG_KEYS="63AF7AA15067C05616FDDD88A3A2E8F226F0BC06"
ENV WP_CLI_VERSION="2.12.0"

# Download WP-CLI binary and signature from https://github.com/wp-cli/wp-cli
ADD --checksum=sha256:9c2f9d93968d68ad2a8fa60eaf8f916f163740977be031b38d9ca6202e82b5be --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar.asc /usr/local/bin/wp.asc
ADD --checksum=sha256:ce34ddd838f7351d6759068d09793f26755463b4a4610a5a5c0a97b68220d85c --chmod=555 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar /usr/local/bin/wp

# Download the nginx keyring from https://blog.nginx.org/blog/updating-pgp-key-for-nginx-software
ADD --checksum=sha256:55385da31d198fa6a5012d40ae98ecb272a6c4e8fffffba94719ffd3e87de37a --chmod=444 https://nginx.org/keys/nginx_signing.key /tmp/nginx_signing.key

# Download the latest CA Bundle from https://curl.se/docs/caextract.html
ENV CA_BUNDLE_VERSION="2026-03-19"
ADD --checksum=sha256:b6e66569cc3d438dd5abe514d0df50005d570bfc96c14dca8f768d020cb96171 --chmod=444 https://curl.se/ca/cacert-$CA_BUNDLE_VERSION.pem /usr/local/share/ca-certificates/ca-bundle.crt

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
		lsb-release \
	; \
	\
	export GNUPGHOME="$(mktemp -d)"; \
	GPG_KEYS="$WP_CLI_GPG_KEYS"; \
	for key in $GPG_KEYS; do \
		gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key"; \
	done; \
	\
	# Verify signature of WP-CLI binary
	gpg --batch --verify /usr/local/bin/wp.asc /usr/local/bin/wp; \
	rm /usr/local/bin/wp.asc; \
	\
	cat /tmp/nginx_signing.key | gpg --dearmor | tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null; \
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

FROM base AS build

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
		-DCMAKE_C_FLAGS="-Ofast -m64 -march=native -mtune=native -flto -funroll-loops -ffunction-sections -fdata-sections -Wl,--gc-sections" \
		-DCMAKE_CXX_FLAGS="-Ofast -m64 -march=native -mtune=native -flto -funroll-loops -ffunction-sections -fdata-sections -Wl,--gc-sections" \
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

# Download WP-CLI bash tab completions
ADD --checksum=sha256:443ca0610ccae8d2d6aceba0ec4aa7929b87ed6cf54f666afed18d663a18a395 --chmod=444 https://raw.githubusercontent.com/wp-cli/wp-cli/v$WP_CLI_VERSION/utils/wp-completion.bash /etc/wp-completion.bash

# Download the default nginx fastcgi.conf from repo
ADD --checksum=sha256:b2c3d480a58f61f3a7dc61850b461e892e36f236317765a4f2f6d558c928fa57 --chmod=444 https://raw.githubusercontent.com/nginx/nginx/413158330abf082d1c0b48b264090f3bf4e4305e/conf/fastcgi.conf /etc/nginx/fastcgi.conf

# Copy built nginx dynamic modules into the final image
COPY --from=build --chmod=444 /opt/nginx/modules/ /usr/lib/nginx/modules/

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	--mount=type=cache,sharing=private,target=/tmp/pear \
	--mount=type=cache,sharing=private,target=/tmp/pip \
	--mount=type=bind,source=./certbot-requirements.txt,target=/opt/certbot/requirements.txt \
	\
	set -eux; \
	\
	# Install persistent apt packages
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
		gnupg \
		less \
		mariadb-client \
		nano \
		sudo \
		supervisor \
		wget \
		zip \
		\
		# Logging utils
		expect \
		logrotate \
		moreutils \
		rsyslog \
	; \
	\
	savedAptMark="$(apt-mark showmanual)"; \
	\
	# Install certbot
	apt-get install -y --no-install-recommends \
		python3 \
		python3-venv \
	; \
	python3 -m venv /opt/certbot/; \
	/opt/certbot/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --only-binary :all: --upgrade pip; \
	/opt/certbot/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --prefer-binary --require-hashes --requirement /opt/certbot/requirements.txt; \
	ln -s /opt/certbot/bin/certbot /usr/bin/certbot; \
	certbot --version; \
	{ \
		echo 'PATH="/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin"'; \
		echo "0 0,12 * * * root /opt/certbot/bin/python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q"; \
	} | tee /etc/cron.d/certbot; \
	mkdir /etc/letsencrypt; \
	\
	# Install the PHP extensions we need (https://make.wordpress.org/hosting/handbook/server-environment/#php-extensions)
	\
	# Install build dependencies to compile PHP extensions
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
	[ -z "$err" ]; \
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
	# Print nginx version information
	nginx -V; \
	\
	# Test nginx configuration for failures and print nginx config contents
	nginx -T; \
	\
	# Install WP-CLI tab completions
	echo 'source /etc/wp-completion.bash' | tee -a /etc/bash.bashrc
