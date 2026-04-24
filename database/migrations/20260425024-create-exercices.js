'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exercices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      numero: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Ex : EX-2026-001',
      },
      date_ouverture: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      date_cloture: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      statut: {
        type: Sequelize.ENUM('ouvert', 'cloture', 'rouvert'),
        allowNull: false,
        defaultValue: 'ouvert',
      },
      ouvert_par: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      cloture_par: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rouvert_par: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      motif_reouverture: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      // Snapshot figé du bilan au moment de la clôture
      // Null tant que l'exercice n'est pas clôturé
      bilan_snapshot: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
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

    await queryInterface.addIndex('exercices', ['statut'], { name: 'idx_exercices_statut' });
    await queryInterface.addIndex('exercices', ['date_ouverture'], { name: 'idx_exercices_date_ouverture' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exercices');
  },
};
