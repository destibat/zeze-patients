#!/bin/bash
# Mise à jour en production
set -e

GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

info "=== Mise à jour ZEZEPAGNON ==="

info "Récupération du code..."
git pull origin main

info "Reconstruction des images..."
docker compose -f docker-compose.prod.yml build

info "Redémarrage des services (zéro downtime)..."
docker compose -f docker-compose.prod.yml up -d

info "Application des nouvelles migrations..."
docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate

info "Nettoyage des anciennes images..."
docker image prune -f

info "=== Mise à jour terminée ==="
