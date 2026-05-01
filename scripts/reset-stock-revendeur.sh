#!/bin/bash
# Réinitialisation complète d'un revendeur :
#   - Restaure le stock cabinet (annule les sorties provoquées par ses achats)
#   - Supprime ses achats, ventes, factures achat et stock revendeur
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
echo "  Réinitialisation complète revendeur : $EMAIL"
echo "  Conteneur : $CONTENEUR"
echo "══════════════════════════════════════════════"

sudo docker exec -i "$CONTENEUR" node -e "
const { sequelize, User, StockDelegue, MouvementDelegue, FactureAchat, StockMouvement, Produit } = require('./src/models');
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

    // Récupérer tous les achats pour recalculer ce qu'il faut remettre dans le stock cabinet
    const achats = await MouvementDelegue.findAll({
      where: { delegue_id: user.id, type: 'achat' },
      attributes: ['produit_id', 'quantite'],
      raw: true,
    });

    // Cumuler les quantités achetées par produit
    const parProduit = {};
    for (const a of achats) {
      parProduit[a.produit_id] = (parProduit[a.produit_id] || 0) + a.quantite;
    }
    console.log('Produits à remettre en stock cabinet :', Object.keys(parProduit).length);

    const t = await sequelize.transaction();
    try {
      // 1. Restaurer le stock cabinet
      for (const [produit_id, quantite] of Object.entries(parProduit)) {
        const produit = await Produit.findByPk(produit_id, { transaction: t, lock: true });
        if (produit) {
          const stockApres = produit.quantite_stock + quantite;
          await produit.update({ quantite_stock: stockApres }, { transaction: t });
          console.log('  Stock cabinet restauré :', produit.nom, '+' + quantite, '→ total', stockApres);
        }
      }

      // 2. Supprimer les StockMouvement de sortie générés par ses achats
      const sm = await StockMouvement.destroy({
        where: {
          user_id: user.id,
          type: 'sortie',
          motif: { [Op.like]: 'Transfert revendeur%' },
        },
        transaction: t,
      });
      console.log('Mouvements stock cabinet supprimés :', sm);

      // 3. Supprimer les factures achat
      const fa = await FactureAchat.destroy({ where: { delegue_id: user.id }, transaction: t });
      console.log('Factures achat supprimées :', fa);

      // 4. Supprimer tous les mouvements délégué (achats + ventes)
      const md = await MouvementDelegue.destroy({ where: { delegue_id: user.id }, transaction: t });
      console.log('Mouvements revendeur supprimés :', md);

      // 5. Supprimer le stock revendeur
      const sd = await StockDelegue.destroy({ where: { delegue_id: user.id }, transaction: t });
      console.log('Stock revendeur supprimé :', sd, 'ligne(s)');

      await t.commit();
      console.log('');
      console.log('✓', user.prenom, user.nom, '— réinitialisation complète effectuée');
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
