'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('commandes_approvisionnement', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      revendeur_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stockiste_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
        type: Sequelize.ENUM('brouillon', 'en_attente', 'validee', 'refusee'),
        allowNull: false,
        defaultValue: 'brouillon',
      },
      notes_revendeur: { type: Sequelize.STRING(500), allowNull: true },
      notes_stockiste: { type: Sequelize.STRING(500), allowNull: true },
      date_commande:   { type: Sequelize.DATEONLY, allowNull: true },
      date_validation: { type: Sequelize.DATEONLY, allowNull: true },
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

    await queryInterface.addIndex('commandes_approvisionnement', ['revendeur_id']);
    await queryInterface.addIndex('commandes_approvisionnement', ['stockiste_id']);
    await queryInterface.addIndex('commandes_approvisionnement', ['statut']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('commandes_approvisionnement');
  },
};
