'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mouvements_delegue', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      delegue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('achat', 'vente'),
        allowNull: false,
      },
      produit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'produits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      lignes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      quantite: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      montant_total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      commission_stockiste: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      client_nom: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      date_mouvement: {
        type: Sequelize.DATEONLY,
        allowNull: false,
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
    await queryInterface.addIndex('mouvements_delegue', ['delegue_id', 'type', 'date_mouvement'], {
      name: 'idx_mouvements_delegue_recherche',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mouvements_delegue');
  },
};
