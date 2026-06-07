'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('patients', 'maladies_chroniques', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'antecedents_familiaux',
    });
    await queryInterface.addColumn('patients', 'traitements_en_cours', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'maladies_chroniques',
    });
    await queryInterface.addColumn('patients', 'frequence_suivi', {
      type: Sequelize.ENUM('mensuel', 'trimestriel', 'semestriel', 'annuel', 'libre'),
      allowNull: true,
      defaultValue: null,
      after: 'traitements_en_cours',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('patients', 'frequence_suivi');
    await queryInterface.removeColumn('patients', 'traitements_en_cours');
    await queryInterface.removeColumn('patients', 'maladies_chroniques');
  },
};
