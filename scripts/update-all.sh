#!/bin/bash
# Met à jour tous les cabinets avec le dernier code (git pull + rebuild + migrations)
#
# Usage : sudo bash scripts/update-all.sh

set -e

WORKDIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$WORKDIR"

MIGRATE="npx sequelize-cli db:migrate --migrations-path /database/migrations"

echo ""
echo "══════════════════════════════════════════════"
echo "  Mise à jour de tous les cabinets"
echo "══════════════════════════════════════════════"

echo "→ Récupération du code..."
git pull
echo "✓ Code à jour"
echo ""

for compose_file in docker-compose.*.yml; do
  slug="${compose_file#docker-compose.}"
  slug="${slug%.yml}"

  case "$slug" in
    nginx) continue ;;
    prod)
      container="zezepagnon_backend"
      echo "→ Mise à jour : patients (prod)"
      docker compose -f "$compose_file" build frontend backend
      docker compose -f "$compose_file" up -d --no-deps frontend backend
      sleep 5
      docker exec "$container" $MIGRATE
      echo "✓ patients mis à jour et migré"
      echo ""
      ;;
    *)
      if [ ! -f ".env.$slug" ]; then
        echo "⚠  .env.$slug introuvable — cabinet $slug ignoré"
        echo ""
        continue
      fi
      container="${slug}_backend"
      echo "→ Mise à jour : $slug"
      docker compose -f "$compose_file" --env-file ".env.$slug" build frontend backend
      docker compose -f "$compose_file" --env-file ".env.$slug" up -d --no-deps frontend backend
      sleep 5
      docker exec "$container" $MIGRATE
      echo "✓ $slug mis à jour et migré"
      echo ""
      ;;
  esac
done

echo "══════════════════════════════════════════════"
echo "✓ Tous les cabinets sont à jour"
echo "══════════════════════════════════════════════"
