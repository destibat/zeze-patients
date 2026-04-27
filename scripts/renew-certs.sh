#!/bin/bash
# Renouvellement automatique du certificat Let's Encrypt
# Lancé automatiquement par cron — ne pas modifier
set -e

DOMAIN="patients.zezepagnon.solutions"
APP_DIR="/var/www/zezepagnon"
CERTS_DIR="$APP_DIR/nginx/certs"

# Renouveler (certbot ne fait rien si expiration > 30 jours)
certbot renew --quiet \
  --pre-hook  "docker compose -f $APP_DIR/docker-compose.prod.yml stop nginx" \
  --post-hook "
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERTS_DIR/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   $CERTS_DIR/
    chmod 644 $CERTS_DIR/fullchain.pem
    chmod 600 $CERTS_DIR/privkey.pem
    docker compose -f $APP_DIR/docker-compose.prod.yml start nginx
  "
