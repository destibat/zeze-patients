'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_mouvements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      produit_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'produits', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('entree', 'sortie', 'ajustement'),
        allowNull: false,
      },
      quantite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Positif = entrée, négatif = sortie',
      },
      motif: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      ordonnance_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'ordonnances', key: 'id' },
        onDelete: 'SET NULL',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      stock_apres: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Stock après mouvement',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('stock_mouvements', ['produit_id']);
    await queryInterface.addIndex('stock_mouvements', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_mouvements');
  },
};
