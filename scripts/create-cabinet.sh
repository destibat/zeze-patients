#!/bin/bash
# Crée un nouveau cabinet complet : SSL, stack Docker, migrations, compte admin
#
# Usage :
#   sudo bash scripts/create-cabinet.sh <slug> <domaine> <admin_nom> <admin_prenom> <admin_email> <admin_mdp>
#
# Exemple :
#   sudo bash scripts/create-cabinet.sh konan konan.zezepagnon.solutions Konan Jean jean@zezepagnon.solutions MotDePasse123
#
# Prérequis :
#   - Le sous-domaine DNS doit pointer vers ce serveur
#   - Le réseau Docker zeze_proxy doit exister (sudo docker network create zeze_proxy)

set -e

usage() {
  echo "Usage : sudo bash scripts/create-cabinet.sh <slug> <domaine> <admin_nom> <admin_prenom> <admin_email> <admin_mdp>"
  echo ""
  echo "Exemple :"
  echo "  sudo bash scripts/create-cabinet.sh konan konan.zezepagnon.solutions Konan Jean jean@zezepagnon.solutions MotDePasse"
  exit 1
}

SLUG=$1; DOMAINE=$2; ADMIN_NOM=$3; ADMIN_PRENOM=$4; ADMIN_EMAIL=$5; ADMIN_MDP=$6

[ -z "$SLUG" ] || [ -z "$DOMAINE" ] || [ -z "$ADMIN_NOM" ] || [ -z "$ADMIN_PRENOM" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_MDP" ] && usage

WORKDIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$WORKDIR"

if [ -f ".env.$SLUG" ]; then
  echo "Erreur : le cabinet '$SLUG' existe déjà (.env.$SLUG trouvé)"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Création du cabinet : $SLUG"
echo "  Domaine : $DOMAINE"
echo "══════════════════════════════════════════════"

# ── 1. Générer les secrets ─────────────────────────────────────────────────────
DB_ROOT_PASS=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
DB_PASS=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# ── 2. Créer le .env ──────────────────────────────────────────────────────────
cat > ".env.$SLUG" << ENVEOF
DB_ROOT_PASSWORD=$DB_ROOT_PASS
DB_NAME=zezepagnon_$SLUG
DB_USER=zeze_$SLUG
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
FRONTEND_URL=https://$DOMAINE
ENVEOF
echo "✓ .env.$SLUG créé"

# ── 3. Créer le docker-compose ────────────────────────────────────────────────
cat > "docker-compose.$SLUG.yml" << COMPOSEEOF
name: $SLUG

services:
  db:
    image: mariadb:10.11
    container_name: ${SLUG}_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: \${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: \${DB_NAME}
      MYSQL_USER: \${DB_USER}
      MYSQL_PASSWORD: \${DB_PASSWORD}
    volumes:
      - db_data_${SLUG}:/var/lib/mysql
    networks:
      - ${SLUG}_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p\${DB_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.prod
    image: zezepagnon-backend
    container_name: ${SLUG}_backend
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: \${DB_NAME}
      DB_USER: \${DB_USER}
      DB_PASSWORD: \${DB_PASSWORD}
      JWT_SECRET: \${JWT_SECRET}
      JWT_EXPIRES_IN: 15m
      JWT_REFRESH_SECRET: \${JWT_REFRESH_SECRET}
      JWT_REFRESH_EXPIRES_IN: 7d
      FRONTEND_URL: \${FRONTEND_URL}
    volumes:
      - uploads_${SLUG}:/app/uploads
    networks:
      - ${SLUG}_network
      - zeze_proxy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    image: zezepagnon-frontend
    container_name: ${SLUG}_frontend
    restart: always
    depends_on:
      - backend
    networks:
      - zeze_proxy

volumes:
  db_data_${SLUG}:
  uploads_${SLUG}:

networks:
  ${SLUG}_network:
    driver: bridge
  zeze_proxy:
    external: true
COMPOSEEOF
echo "✓ docker-compose.$SLUG.yml créé"

# ── 4. Certificat SSL (arrêt nginx ~10s) ──────────────────────────────────────
echo "→ Obtention du certificat SSL (arrêt nginx ~10s)..."
docker stop zeze_nginx
certbot certonly --standalone -d "$DOMAINE"
mkdir -p "nginx/certs/$SLUG"
cp "/etc/letsencrypt/live/$DOMAINE/fullchain.pem" "nginx/certs/$SLUG/"
cp "/etc/letsencrypt/live/$DOMAINE/privkey.pem" "nginx/certs/$SLUG/"
echo "✓ Certificat SSL copié dans nginx/certs/$SLUG/"

# ── 5. Config nginx ───────────────────────────────────────────────────────────
cat > "nginx/conf.d/$SLUG.conf" << NGINXEOF
server {
    listen 80;
    server_name $DOMAINE;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAINE;

    ssl_certificate     /etc/nginx/certs/$SLUG/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/$SLUG/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    resolver 127.0.0.11 valid=30s;
    set \$backend  ${SLUG}_backend;
    set \$frontend ${SLUG}_frontend;

    location /api/ {
        proxy_pass http://\$backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        proxy_pass http://\$backend:3000;
    }

    location / {
        proxy_pass http://\$frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
NGINXEOF
echo "✓ nginx/conf.d/$SLUG.conf créé"

# ── 6. Démarrer la stack + nginx ──────────────────────────────────────────────
echo "→ Démarrage de la stack $SLUG..."
docker compose -f "docker-compose.$SLUG.yml" --env-file ".env.$SLUG" up -d --build
docker start zeze_nginx
echo "✓ Stack $SLUG et nginx démarrés"

# ── 7. Migrations ─────────────────────────────────────────────────────────────
echo "→ Attente du backend (30s)..."
sleep 30
echo "→ Exécution des migrations..."
docker exec "${SLUG}_backend" npx sequelize-cli db:migrate --migrations-path /database/migrations
echo "✓ Migrations exécutées"

# ── 8. Compte admin ───────────────────────────────────────────────────────────
echo "→ Création du compte admin..."
docker exec -i "${SLUG}_backend" node -e "
const { sequelize, User } = require('./src/models');
(async () => {
  try {
    await sequelize.authenticate();
    await User.create({
      nom: '$ADMIN_NOM',
      prenom: '$ADMIN_PRENOM',
      email: '$ADMIN_EMAIL',
      password_hash: '$ADMIN_MDP',
      role: 'administrateur',
      actif: true,
    });
    console.log('Admin créé');
    await sequelize.close();
  } catch (err) {
    console.error('Erreur :', err.message);
    process.exit(1);
  }
})();
"
echo "✓ Compte admin créé"

echo ""
echo "══════════════════════════════════════════════"
echo "✓ Cabinet '$SLUG' opérationnel !"
echo "  URL     : https://$DOMAINE"
echo "  Admin   : $ADMIN_PRENOM $ADMIN_NOM"
echo "  Email   : $ADMIN_EMAIL"
echo "══════════════════════════════════════════════"
