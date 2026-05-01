#!/bin/bash
# Supprime toutes les ventes d'un revendeur et restaure son stock revendeur.
# N'affecte pas les achats ni le stock cabinet.
#
# Usage : sudo bash scripts/delete-ventes-revendeur.sh <conteneur_backend> <email_revendeur>
# Exemple : sudo bash scripts/delete-ventes-revendeur.sh zezepagnon_backend m.toure@zezepagnon.solutions

CONTENEUR=$1
EMAIL=$2

if [ -z "$CONTENEUR" ] || [ -z "$EMAIL" ]; then
  echo "Usage : sudo bash scripts/delete-ventes-revendeur.sh <conteneur_backend> <email_revendeur>"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Suppression ventes revendeur : $EMAIL"
echo "  Conteneur : $CONTENEUR"
echo "══════════════════════════════════════════════"

sudo docker exec -i "$CONTENEUR" node -e "
const { sequelize, User, StockDelegue, MouvementDelegue } = require('./src/models');
const { Op } = require('sequelize');

(async () => {
  try {
    await sequelize.authenticate();

    const user = await User.findOne({ where: { email: '$EMAIL' } });
    if (!user) {
      console.error('Revendeur introuvable : $EMAIL');
      process.exit(1);
    }
    console.log('Revendeur :', user.prenom, user.nom, '(', user.id, ')');

    // Seules les ventes en_attente et valide ont décrémenté le stock.
    // Les ventes refusées ont déjà restauré leur stock au moment du refus.
    const ventesARestaurer = await MouvementDelegue.findAll({
      where: {
        delegue_id: user.id,
        type: 'vente',
        statut: { [Op.in]: ['en_attente', 'valide'] },
      },
      raw: true,
    });

    const toutesVentes = await MouvementDelegue.count({
      where: { delegue_id: user.id, type: 'vente' },
    });

    console.log('Total ventes à supprimer :', toutesVentes);
    console.log('Dont ventes à restaurer dans le stock :', ventesARestaurer.length);

    const t = await sequelize.transaction();
    try {
      // Restaurer le stock revendeur pour chaque vente non refusée
      for (const vente of ventesARestaurer) {
        let lignes = vente.lignes;
        if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
        if (!Array.isArray(lignes)) lignes = [];

        for (const ligne of lignes) {
          const [item] = await StockDelegue.findOrCreate({
            where: { delegue_id: user.id, produit_id: ligne.produit_id },
            defaults: { quantite: 0 },
            transaction: t,
          });
          await item.increment('quantite', { by: ligne.quantite, transaction: t });
          console.log('  Stock restauré :', ligne.nom_produit || ligne.produit_id, '+' + ligne.quantite);
        }
      }

      // Supprimer toutes les ventes (en_attente, valide et refusées)
      const nb = await MouvementDelegue.destroy({
        where: { delegue_id: user.id, type: 'vente' },
        transaction: t,
      });
      console.log('Ventes supprimées :', nb);

      await t.commit();
      console.log('');
      console.log('✓ Ventes de', user.prenom, user.nom, 'supprimées avec succès');
      console.log('  Stock achat conservé. Gains remis à zéro.');
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
