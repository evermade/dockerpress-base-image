FROM php:8.1.21-fpm

LABEL maintainer="Evermade"

# install the PHP extensions we need
# from wordpress:5.1-php7.2-fpm
RUN set -ex; \
    \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        apt-transport-https \
        lsb-release \
    ; \
    \
    # This adds a more frequently updated nginx apt repository
    curl -o /etc/apt/trusted.gpg.d/nginx.gpg https://packages.sury.org/nginx/apt.gpg; \
    echo "deb https://packages.sury.org/nginx/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/nginx.list; \
    \
    apt-get update; \
    apt-get upgrade -y; \
    apt-get install -y --no-install-recommends \
        libjpeg-dev \
        libpng-dev \
        libfreetype6-dev \
        libzip-dev \
        libwebp-dev \
        nginx \
        libnginx-mod-http-headers-more-filter \
        supervisor \
        gnupg \
        nano \
        wget \
        zip \
        mariadb-client \
        cron \
        sudo \
        less \
        # Logging utils
        logrotate \
        rsyslog \
        expect \
        moreutils \
        # Install certbot
        certbot \
        python3-certbot-nginx \
    ; \
    \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install gd mysqli opcache zip; \
    \
    rm -rf /var/lib/apt/lists/*; \
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
