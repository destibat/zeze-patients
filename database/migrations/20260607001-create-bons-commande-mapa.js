'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bons_commande_mapa', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      cabinet_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      numero: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      lignes: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      montant_total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      statut: {
        type: Sequelize.ENUM('brouillon', 'envoye', 'livre'),
        allowNull: false,
        defaultValue: 'brouillon',
      },
      notes: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      date_commande: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_livraison_prevue: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_livraison_effective: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('bons_commande_mapa', ['cabinet_id']);
    await queryInterface.addIndex('bons_commande_mapa', ['created_by']);
    await queryInterface.addIndex('bons_commande_mapa', ['statut']);
    await queryInterface.addIndex('bons_commande_mapa', ['numero']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('bons_commande_mapa');
  },
};
