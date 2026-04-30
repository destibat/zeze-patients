#!/bin/bash
# Réinitialise complètement le stock d'un revendeur (supprime achats, factures achat, stock)
#
# Usage : sudo bash scripts/reset-stock-revendeur.sh <conteneur_backend> <email_revendeur>
# Exemple : sudo bash scripts/reset-stock-revendeur.sh zezepagnon_backend m.toure@zezepagnon.solutions

CONTENEUR=$1
EMAIL=$2

if [ -z "$CONTENEUR" ] || [ -z "$EMAIL" ]; then
  echo "Usage : sudo bash scripts/reset-stock-revendeur.sh <conteneur_backend> <email_revendeur>"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Réinitialisation stock revendeur : $EMAIL"
echo "  Conteneur : $CONTENEUR"
echo "══════════════════════════════════════════════"

sudo docker exec -i "$CONTENEUR" node -e "
const { sequelize, User, StockDelegue, MouvementDelegue, FactureAchat } = require('./src/models');

(async () => {
  try {
    await sequelize.authenticate();

    const user = await User.findOne({ where: { email: '$EMAIL' } });
    if (!user) {
      console.error('Revendeur introuvable : $EMAIL');
      process.exit(1);
    }
    console.log('Revendeur trouvé :', user.prenom, user.nom, '(', user.id, ')');

    const t = await sequelize.transaction();
    try {
      const fa = await FactureAchat.destroy({ where: { delegue_id: user.id }, transaction: t });
      console.log('Factures achat supprimées :', fa);

      const md = await MouvementDelegue.destroy({ where: { delegue_id: user.id, type: 'achat' }, transaction: t });
      console.log('Mouvements achat supprimés :', md);

      const sd = await StockDelegue.destroy({ where: { delegue_id: user.id }, transaction: t });
      console.log('Stock supprimé :', sd, 'ligne(s)');

      await t.commit();
      console.log('');
      console.log('✓ Stock de', user.prenom, user.nom, 'réinitialisé avec succès');
    } catch (err) {
      await t.rollback();
      throw err;
    }

    await sequelize.close();
  } catch (err) {
    console.error('Erreur :', err.message);
    process.exit(1);
  }
})();
"
