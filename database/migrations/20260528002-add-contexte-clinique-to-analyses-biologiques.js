'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('analyses_biologiques', 'contexte_clinique', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Texte clinique complet (ECG, diagnostics, symptômes…) extrait lors de l\'upload',
      after: 'source',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('analyses_biologiques', 'contexte_clinique');
  },
};
