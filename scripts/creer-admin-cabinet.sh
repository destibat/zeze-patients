#!/bin/bash
# Crée le compte administrateur initial d'un cabinet
#
# Usage :
#   sudo bash scripts/creer-admin-cabinet.sh <conteneur> <nom> <prenom> <email> <mot_de_passe>
#
# Exemples :
#   sudo bash scripts/creer-admin-cabinet.sh cisse_backend Cisse Jean jean.cisse@email.com MotDePasse123
#   sudo bash scripts/creer-admin-cabinet.sh alice_backend Alice Marie marie.alice@email.com MotDePasse456

CONTENEUR=$1
NOM=$2
PRENOM=$3
EMAIL=$4
MOT_DE_PASSE=$5

if [ -z "$CONTENEUR" ] || [ -z "$NOM" ] || [ -z "$PRENOM" ] || [ -z "$EMAIL" ] || [ -z "$MOT_DE_PASSE" ]; then
  echo "Usage : sudo bash scripts/creer-admin-cabinet.sh <conteneur> <nom> <prenom> <email> <mot_de_passe>"
  echo ""
  echo "Conteneurs disponibles : cisse_backend, alice_backend, zezepagnon_backend"
  exit 1
fi

sudo docker exec -i "$CONTENEUR" node -e "
const { sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    await sequelize.authenticate();
    const hash = await bcrypt.hash('$MOT_DE_PASSE', 12);
    await sequelize.query(\`
      INSERT INTO utilisateurs (id, nom, prenom, email, mot_de_passe, role, actif, createdAt, updatedAt)
      VALUES (UUID(), '$NOM', '$PRENOM', '$EMAIL', '\${hash}', 'administrateur', 1, NOW(), NOW())
    \`);
    console.log('✓ Admin créé : $PRENOM $NOM ($EMAIL) sur $CONTENEUR');
    await sequelize.close();
  } catch (err) {
    console.error('Erreur :', err.message);
    process.exit(1);
  }
})();
"
