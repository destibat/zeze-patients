'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mouvements_delegue', 'gain_delegue', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'commission_stockiste',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('mouvements_delegue', 'gain_delegue');
  },
};
