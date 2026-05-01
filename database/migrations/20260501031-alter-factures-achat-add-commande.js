'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // mouvement_id devient nullable (les factures issues d'une commande n'ont pas de mouvement direct)
    await queryInterface.changeColumn('factures_achat', 'mouvement_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn('factures_achat', 'commande_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'commandes_approvisionnement', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('factures_achat', 'commande_id');
    await queryInterface.changeColumn('factures_achat', 'mouvement_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
