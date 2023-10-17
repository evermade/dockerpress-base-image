FROM php:7.4.33-fpm-bullseye

LABEL maintainer="Evermade"

# Install the PHP extensions we need (https://make.wordpress.org/hosting/handbook/server-environment/#php-extensions)
RUN set -ex; \
	\
	# Nginx apt dependencies
	apt-get update; \
	apt-get install -y --no-install-recommends \
		apt-transport-https \
		lsb-release \
	; \
	\
	# This adds a more frequently updated nginx apt repository
	curl -sSLo /usr/share/keyrings/deb.sury.org-nginx.gpg https://packages.sury.org/nginx/apt.gpg; \
	echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-nginx.gpg] https://packages.sury.org/nginx/ $( lsb_release -sc ) main" > /etc/apt/sources.list.d/nginx.list; \
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
		libnginx-mod-http-headers-more-filter \
		\
		# Tools
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
		# Install certbot
		certbot \
		python3-certbot-nginx \
	; \
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
	docker-php-ext-install -j "$( nproc )" \
		bcmath \
		exif \
		gd \
		intl \
		mysqli \
		opcache \
		zip \
	; \
	pecl install \
		imagick-3.7.0 \
		igbinary \
		redis \
	; \
	docker-php-ext-enable \
		imagick \
		igbinary \
		redis \
	; \
	rm -rf /tmp/pear; \
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
		| awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) { next }; gsub("^/(usr/)?", "", so); print so }' \
		| sort -u \
		| xargs -r dpkg-query --search \
		| cut -d: -f1 \
		| sort -u \
		| xargs -rt apt-mark manual; \
	\
	apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
	rm -rf /var/lib/apt/lists/*; \
	\
	! { ldd "$extDir"/*.so | grep 'not found'; }; \
	\
	# Check for output like "PHP Warning:  PHP Startup: Unable to load dynamic library 'foo' (tried: ...)
	err="$(php --version 3>&1 1>&2 2>&3)"; \
	[ -z "$err" ]; \
	\
	# Install WP-CLI
	curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar; \
	chmod +x wp-cli.phar; \
	mv wp-cli.phar /usr/local/bin/wp; \
	\
	# Install WP-CLI tab completions
	curl -O https://raw.githubusercontent.com/wp-cli/wp-cli/master/utils/wp-completion.bash; \
	mv wp-completion.bash /etc/wp-completion.bash; \
	echo 'source /etc/wp-completion.bash' >> /etc/bash.bashrc
