#!/bin/bash
set -e

echo "=== Déploiement ZEZEPAGNON ==="

# 1. Récupérer le dernier code
git pull origin main

# 2. Construire et lancer les containers
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 3. Appliquer les migrations
docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate

echo "=== Déploiement terminé ==="
