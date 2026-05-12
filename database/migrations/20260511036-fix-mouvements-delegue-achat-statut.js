'use strict';

// Corrige les MouvementDelegue type='achat' créés par la fonction acheter() :
// ils avaient statut=null (au lieu de 'valide') et commission=0,
// ce qui les excluait du CA exercice et des calculs de bilan.
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Marquer tous les achats sans statut comme validés
    await queryInterface.sequelize.query(`
      UPDATE mouvements_delegue
      SET statut = 'valide'
      WHERE type = 'achat' AND statut IS NULL
    `);

    // 2. Recalculer les commissions pour ces achats (gain_delegue et commission_stockiste étaient à 0)
    //    On utilise les taux actuels du délégué et de son stockiste parrain.
    await queryInterface.sequelize.query(`
      UPDATE mouvements_delegue md
      JOIN users delegue ON delegue.id = md.delegue_id
      LEFT JOIN users stockiste ON stockiste.id = delegue.stockiste_id
      SET
        md.gain_delegue        = ROUND(md.montant_total * COALESCE(delegue.commission_rate, 15) / 100),
        md.commission_stockiste = ROUND(md.montant_total * (COALESCE(stockiste.commission_rate, 25) - COALESCE(delegue.commission_rate, 15)) / 100)
      WHERE md.type = 'achat'
        AND md.gain_delegue = 0
        AND md.commission_stockiste = 0
        AND md.montant_total > 0
    `);
  },

  async down(queryInterface, Sequelize) {
    // Irréversible — on ne peut pas distinguer les 0 intentionnels des 0 corrigés
    // mais on peut remettre statut=null pour les achats sans exercice_id si besoin
  },
};
