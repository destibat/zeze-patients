#!/bin/bash
# Vide les données transactionnelles (ventes, commissions, stock)
# Conserve : users, patients, produits, parametres_cabinet
# Usage : sudo bash scripts/reset-donnees-test.sh

set -e

BACKEND_CONTAINER="dev_backend"
DB_CONTAINER="dev_db"

# Récupérer les credentials depuis le conteneur backend
DB_USER=$(sudo docker exec "$BACKEND_CONTAINER" env | grep ^DB_USER= | cut -d= -f2)
DB_PASS=$(sudo docker exec "$BACKEND_CONTAINER" env | grep ^DB_PASSWORD= | cut -d= -f2)
DB_NAME=$(sudo docker exec "$BACKEND_CONTAINER" env | grep ^DB_NAME= | cut -d= -f2)

echo ""
echo "══════════════════════════════════════════════"
echo "  Reset données de test — $DB_NAME"
echo "══════════════════════════════════════════════"

echo ""
echo "→ Application des migrations en attente..."
sudo docker exec "$BACKEND_CONTAINER" npx sequelize-cli db:migrate --migrations-path /database/migrations
echo "✓ Migrations OK"

echo ""
echo "→ Vidage des tables transactionnelles..."
sudo docker exec "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE factures_achat;
TRUNCATE TABLE commandes_approvisionnement;
TRUNCATE TABLE mouvements_delegue;
TRUNCATE TABLE stock_delegue;
TRUNCATE TABLE stock_mouvements;
TRUNCATE TABLE factures;
TRUNCATE TABLE ordonnances;
TRUNCATE TABLE consultations;
TRUNCATE TABLE rendez_vous;
TRUNCATE TABLE analyses_nfs;
TRUNCATE TABLE fichiers_patient;
TRUNCATE TABLE exercices;
TRUNCATE TABLE audit_logs;
SET FOREIGN_KEY_CHECKS = 1;
"
echo "✓ Tables vidées"

echo ""
echo "→ Vérification..."
sudo docker exec "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 'users'                      AS table_name, COUNT(*) AS lignes FROM users
UNION SELECT 'produits',            COUNT(*) FROM produits
UNION SELECT 'patients',            COUNT(*) FROM patients
UNION SELECT 'consultations',       COUNT(*) FROM consultations
UNION SELECT 'factures',            COUNT(*) FROM factures
UNION SELECT 'ordonnances',         COUNT(*) FROM ordonnances
UNION SELECT 'mouvements_delegue',  COUNT(*) FROM mouvements_delegue
UNION SELECT 'stock_delegue',       COUNT(*) FROM stock_delegue
UNION SELECT 'commandes_appro',     COUNT(*) FROM commandes_approvisionnement
UNION SELECT 'factures_achat',      COUNT(*) FROM factures_achat;
"

echo ""
echo "══════════════════════════════════════════════"
echo "✓ Données de test réinitialisées"
echo "══════════════════════════════════════════════"
