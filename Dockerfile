# syntax=docker/dockerfile:1

FROM php:8.4.15-fpm-bookworm

LABEL maintainer="Evermade"

ENV WP_CLI_GPG_KEYS="63AF7AA15067C05616FDDD88A3A2E8F226F0BC06"
ENV WP_CLI_VERSION="2.12.0"

# Download WP-CLI binary and signature
ADD --checksum=sha256:9c2f9d93968d68ad2a8fa60eaf8f916f163740977be031b38d9ca6202e82b5be --chmod=444 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar.asc /usr/local/bin/wp.asc
ADD --checksum=sha256:ce34ddd838f7351d6759068d09793f26755463b4a4610a5a5c0a97b68220d85c --chmod=555 https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar /usr/local/bin/wp

# Download WP-CLI bash tab completions
ADD --checksum=sha256:443ca0610ccae8d2d6aceba0ec4aa7929b87ed6cf54f666afed18d663a18a395 --chmod=444 https://raw.githubusercontent.com/wp-cli/wp-cli/v$WP_CLI_VERSION/utils/wp-completion.bash /etc/wp-completion.bash

# Download the deb.sury.org apt archive keyring
ADD --checksum=sha256:7511384559c9ddf1d5ce5f60be429ae9d4e7d01d9480d6f1b7a30c0810cf8b60 --chmod=444 https://packages.sury.org/nginx/pool/main/d/debsuryorg-archive-keyring/debsuryorg-archive-keyring_2025.11.18_all.deb /tmp/debsuryorg-archive-keyring.deb

# Download the latest CA Bundle from https://curl.se/docs/caextract.html
ADD --checksum=sha256:f1407d974c5ed87d544bd931a278232e13925177e239fca370619aba63c757b4 --chmod=444 https://curl.se/ca/cacert-2025-12-02.pem /usr/local/share/ca-certificates/ca-bundle.crt

COPY --chmod=555 flush-ca-certificates /usr/local/bin

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
	# Flush CA certificates first with our good bundle
	flush-ca-certificates; \
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
	apt-get install -y --no-install-recommends \
		# Nginx apt dependencies
		apt-transport-https \
		lsb-release \
	; \
	\
	# This adds a more frequently updated nginx apt repository
	dpkg -i /tmp/debsuryorg-archive-keyring.deb; \
	rm /tmp/debsuryorg-archive-keyring.deb; \
	{ \
		echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-nginx.gpg] https://packages.sury.org/nginx/ $(lsb_release -sc) main"; \
		echo "deb-src [signed-by=/usr/share/keyrings/deb.sury.org-nginx.gpg] https://packages.sury.org/nginx/ $(lsb_release -sc) main"; \
	} | tee /etc/apt/sources.list.d/nginx.list; \
	{ \
		echo 'Package: debsuryorg* nginx* libnginx-mod-*'; \
		echo 'Pin: origin packages.sury.org'; \
		echo 'Pin-Priority: 1001'; \
	} | tee /etc/apt/preferences.d/nginx; \
	\
	apt-get update; \
	\
	# Upgrade apt packages
	apt-get upgrade -y; \
	\
	# Flush CA certificates again in case upgrade reset everything
	flush-ca-certificates; \
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
	# Ensure the PEAR Downloader.php is what we expect it to be for the next operation to make sense. Update accordingly when the file has changed.
	echo '426ab5d7b1d7a3fecef05ba3a2cbb25ce60f631ea24b0eb88a571575caf92efa /usr/local/lib/php/PEAR/Downloader.php' | sha256sum --check; \
	# PECL doesn't implement HTTP/1.1 chunked transfer encoding which is used on doc.php.net so we need to downgrade to HTTP/1.0
	sed -i -e 's| HTTP/1\.1\\r\\n| HTTP/1.0\\r\\n|' /usr/local/lib/php/PEAR/Downloader.php; \
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
	# Print nginx version information
	nginx -V; \
	\
	# Test nginx configuration for failures and print nginx config contents
	nginx -T; \
	\
	# Create old brotli module config file for backwards compatibility
	cat /etc/nginx/modules-enabled/50-mod-http-brotli-filter.conf /etc/nginx/modules-enabled/50-mod-http-brotli-static.conf > /etc/nginx/modules-enabled/50-mod-brotli.conf; \
	\
	# Install WP-CLI tab completions
	echo 'source /etc/wp-completion.bash' >> /etc/bash.bashrc
