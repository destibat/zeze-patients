'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_mouvements', 'date_livraison', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: 'motif',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_mouvements', 'date_livraison');
  },
};
