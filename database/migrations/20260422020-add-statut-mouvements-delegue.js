'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mouvements_delegue', 'statut', {
      type: Sequelize.ENUM('en_attente', 'valide', 'refuse'),
      allowNull: true,
      after: 'date_mouvement',
    });
    await queryInterface.addColumn('mouvements_delegue', 'mode_paiement', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'statut',
    });
    // Les ventes existantes sont rétroactivement marquées comme validées
    await queryInterface.sequelize.query(
      "UPDATE mouvements_delegue SET statut = 'valide' WHERE type = 'vente'"
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('mouvements_delegue', 'mode_paiement');
    await queryInterface.removeColumn('mouvements_delegue', 'statut');
  },
};
