'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bons_commande_mapa', 'mention_livraison', {
      type: Sequelize.STRING(100), allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('bons_commande_mapa', 'mention_livraison');
  },
};
