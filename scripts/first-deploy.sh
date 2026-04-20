#!/bin/bash
# Premier déploiement — à lancer une seule fois après clonage
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

[ ! -f ".env" ] && { echo "Fichier .env manquant. Faire: cp .env.example .env && nano .env"; exit 1; }

info "=== Premier déploiement ZEZEPAGNON ==="

# Build et démarrage
info "Construction des images Docker..."
docker compose -f docker-compose.prod.yml build

info "Démarrage des services..."
docker compose -f docker-compose.prod.yml up -d

# Attendre que la DB soit prête
info "Attente de la base de données..."
sleep 15

# Migrations
info "Application des migrations..."
docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate

# Seeds (données initiales)
info "Chargement des données initiales..."
docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:seed:all 2>/dev/null || true

info "=== Déploiement initial terminé ! ==="
warning "Changez immédiatement le mot de passe admin après la première connexion !"
echo ""
echo "Site accessible sur : http://$(hostname -I | awk '{print $1}')"
echo "Admin : admin@zezepagnon.local / Admin2026!"
echo ""
