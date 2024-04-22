# syntax=docker/dockerfile:1

FROM php:8.0.30-fpm-bullseye

LABEL maintainer="Evermade"

ENV WP_CLI_GPG_KEYS="63AF7AA15067C05616FDDD88A3A2E8F226F0BC06"
ENV WP_CLI_VERSION="2.10.0"

# Download WP-CLI binary and signature
ADD --checksum=sha256:d5ceebc80e5dd6efad5389264bb6bbcb55d04c85cb6c5758313838cf5692848a --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar.asc /usr/local/bin/wp.asc
ADD --checksum=sha256:4c6a93cecae7f499ca481fa7a6d6d4299c8b93214e5e5308e26770dbfd3631df --chmod=555 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar /usr/local/bin/wp

# Download WP-CLI bash tab completions
ADD --checksum=sha256:443ca0610ccae8d2d6aceba0ec4aa7929b87ed6cf54f666afed18d663a18a395 --chmod=444 https://raw.githubusercontent.com/wp-cli/wp-cli/v$WP_CLI_VERSION/utils/wp-completion.bash /etc/wp-completion.bash

# Download the deb.sury.org apt archive keyring
ADD --checksum=sha256:fc814e120cb28bbedf75b5e8df7a32e2b903c624d4f78bcd83dc6c4ae30a1dd5 --chmod=444 https://packages.sury.org/nginx/pool/main/d/debsuryorg-archive-keyring/debsuryorg-archive-keyring_2024.02.05%2B0~20240226.2%2Bdebian11~1.gbp343037_all.deb /tmp/debsuryorg-archive-keyring.deb

# This can be used to force rebuild below while allowing use of cache mounts
ARG BUILD_DATE="undefined"

# Builders aren't interactive
ARG DEBIAN_FRONTEND="noninteractive"

RUN --mount=type=cache,sharing=private,target=/var/cache/apt \
	--mount=type=cache,sharing=private,target=/var/lib/apt \
	--mount=type=cache,sharing=private,target=/tmp/pear \
	--mount=type=cache,sharing=private,target=/tmp/pip \
	--mount=type=bind,source=./certbot-requirements.txt,target=/opt/certbot/requirements.txt \
	\
	set -eux; \
	\
	savedAptMark="$(apt-mark showmanual)"; \
	apt-get update; \
	apt-get install -y --no-install-recommends gnupg; \
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
	gpgconf --kill all; \
	rm -rf "$GNUPGHOME"; \
	\
	apt-mark auto '.*' > /dev/null; \
	apt-mark manual $savedAptMark > /dev/null; \
	apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
	\
	# Nginx apt dependencies
	apt-get install -y --no-install-recommends \
		apt-transport-https \
		lsb-release \
	; \
	\
	# This adds a more frequently updated nginx apt repository
	dpkg -i /tmp/debsuryorg-archive-keyring.deb; \
	rm /tmp/debsuryorg-archive-keyring.deb; \
	echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-nginx.gpg] https://packages.sury.org/nginx/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/nginx.list; \
	printf "Package: debsuryorg* nginx* libnginx-mod-*\n\
Pin: origin packages.sury.org\n\
Pin-Priority: 1001\n" > /etc/apt/preferences.d/nginx; \
	apt-get update; \
	\
	# Upgrade apt packages
	apt-get upgrade -y; \
	\
	# Install persistent apt packages
	apt-get install -y --no-install-recommends \
		# PDF preview rendering for WordPress
		ghostscript \
		\
		# Nginx
		nginx \
		libnginx-mod-http-brotli \
		libnginx-mod-http-cache-purge \
		libnginx-mod-http-geoip \
		libnginx-mod-http-geoip2 \
		libnginx-mod-http-headers-more-filter \
		libnginx-mod-http-image-filter \
		libnginx-mod-stream \
		libnginx-mod-stream-geoip \
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
		\
		# Install certbot dependencies
		python3 \
		python3-venv \
	; \
	\
	# Install certbot
	python3 -m venv /opt/certbot/; \
	/opt/certbot/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --only-binary :all: --upgrade pip; \
	/opt/certbot/bin/pip install --cache-dir /tmp/pip --isolated --require-virtualenv --only-binary :all: --require-hashes --requirement /opt/certbot/requirements.txt; \
	ln -s /opt/certbot/bin/certbot /usr/bin/certbot; \
	certbot --version; \
	echo "0 0,12 * * * root /opt/certbot/bin/python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" > /etc/cron.d/certbot; \
	mkdir /etc/letsencrypt; \
	\
	# Install the PHP extensions we need (https://make.wordpress.org/hosting/handbook/server-environment/#php-extensions)
	\
	savedAptMark="$(apt-mark showmanual)"; \
	\
	# Install build dependencies to compile PHP extensions
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
	export MAKEFLAGS="-j$(nproc)"; \
	pecl update-channels; \
	pecl install \
		--onlyreqdeps \
		--configureoptions='enable-redis-igbinary="yes" enable-redis-lzf="no" enable-redis-zstd="no" enable-redis-msgpack="no" enable-redis-lz4="yes" with-liblz4="yes"' \
		\
		igbinary \
		imagick-3.7.0 \
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
	# Print nginx version information
	nginx -V; \
	\
	# Test nginx configuration for failures
	nginx -t; \
	\
	# Create old brotli module config file for backwards compatibility
	cat /etc/nginx/modules-enabled/50-mod-http-brotli-filter.conf /etc/nginx/modules-enabled/50-mod-http-brotli-static.conf > /etc/nginx/modules-enabled/50-mod-brotli.conf; \
	\
	# Install WP-CLI tab completions
	echo 'source /etc/wp-completion.bash' >> /etc/bash.bashrc
