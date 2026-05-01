#!/bin/bash
# Fusionne la branche dev dans main et déploie en production.
# À lancer depuis le répertoire prod (zeze_patients/).
#
# Usage : sudo bash scripts/promote-to-prod.sh

set -e

PROD_DIR=$(cd "$(dirname "$0")/.." && pwd)
DEV_DIR="${PROD_DIR}/../zeze_patients_dev"

if [ ! -d "$DEV_DIR" ]; then
  echo "Répertoire dev introuvable : $DEV_DIR"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Promotion dev → main → production"
echo "══════════════════════════════════════════════"

# Push la branche dev depuis le répertoire dev
echo "→ Push de la branche dev..."
cd "$DEV_DIR"
git push origin dev
echo "✓ Branche dev poussée"
echo ""

# Fusion dans main depuis le répertoire prod
echo "→ Fusion dev → main..."
cd "$PROD_DIR"
git fetch origin
git checkout main
git merge origin/dev --no-edit
git push origin main
echo "✓ main mis à jour"
echo ""

# Déploiement prod
echo "→ Déploiement en production..."
sudo bash scripts/update-all.sh

echo ""
echo "══════════════════════════════════════════════"
echo "✓ Production déployée depuis dev"
echo "══════════════════════════════════════════════"
