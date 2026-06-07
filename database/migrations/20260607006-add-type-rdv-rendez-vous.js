'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rendez_vous', 'type_rdv', {
      type: Sequelize.ENUM('consultation', 'suivi', 'urgence', 'analyse', 'autre'),
      allowNull: false,
      defaultValue: 'consultation',
      after: 'motif',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('rendez_vous', 'type_rdv');
  },
};
