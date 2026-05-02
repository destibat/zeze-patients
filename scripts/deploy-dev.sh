#!/bin/bash
# Déploie la branche dev sur dev.zezepagnon.solutions
# À lancer depuis n'importe où sur le serveur.
#
# Usage : sudo bash /chemin/vers/zeze_patients_dev/scripts/deploy-dev.sh

set -e

DEV_DIR=$(cd "$(dirname "$0")/.." && pwd)

if [ ! -f "$DEV_DIR/.env.dev" ]; then
  echo "Fichier $DEV_DIR/.env.dev introuvable."
  echo "Copiez .env.dev.example et renseignez les valeurs."
  exit 1
fi

cd "$DEV_DIR"

BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "dev" ]; then
  echo "⚠  Branche courante : $BRANCH (attendu : dev)"
  echo "   Basculez sur la branche dev avant de déployer."
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Déploiement → dev.zezepagnon.solutions"
echo "  Branche : dev"
echo "══════════════════════════════════════════════"

echo "→ Récupération du code..."
git pull origin dev
echo "✓ Code à jour"
echo ""

echo "→ Build des images..."
sudo docker compose -f docker-compose.dev.yml --env-file .env.dev build frontend backend
echo "✓ Images construites"
echo ""

echo "→ Redémarrage des conteneurs..."
sudo docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --no-deps frontend backend
echo "✓ Conteneurs redémarrés"
echo ""

echo "→ Migrations..."
sleep 5
sudo docker exec dev_backend npx sequelize-cli db:migrate --migrations-path /database/migrations
echo "✓ Migrations effectuées"
echo ""

echo "→ Seeds (données initiales)..."
sudo docker exec dev_backend npx sequelize-cli db:seed:all --seeders-path /database/seeds 2>&1 \
  && echo "✓ Seeds appliqués" \
  || echo "⚠  Seeds déjà en base (ignoré)"
echo ""

echo "══════════════════════════════════════════════"
echo "✓ dev.zezepagnon.solutions mis à jour"
echo "══════════════════════════════════════════════"
