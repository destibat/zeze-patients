'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bons_commande_mapa', 'nom_commandeur', {
      type: Sequelize.STRING(100), allowNull: true,
    });
    await queryInterface.addColumn('bons_commande_mapa', 'prenoms_commandeur', {
      type: Sequelize.STRING(150), allowNull: true,
    });
    await queryInterface.addColumn('bons_commande_mapa', 'telephone_commandeur', {
      type: Sequelize.STRING(30), allowNull: true,
    });
    await queryInterface.addColumn('bons_commande_mapa', 'lieu_livraison', {
      type: Sequelize.STRING(200), allowNull: true,
    });
    await queryInterface.addColumn('bons_commande_mapa', 'nom_stockiste_mapa', {
      type: Sequelize.STRING(150), allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bons_commande_mapa', 'nom_commandeur');
    await queryInterface.removeColumn('bons_commande_mapa', 'prenoms_commandeur');
    await queryInterface.removeColumn('bons_commande_mapa', 'telephone_commandeur');
    await queryInterface.removeColumn('bons_commande_mapa', 'lieu_livraison');
    await queryInterface.removeColumn('bons_commande_mapa', 'nom_stockiste_mapa');
  },
};
