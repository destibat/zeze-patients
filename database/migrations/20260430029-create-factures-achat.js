'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('factures_achat', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      mouvement_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'mouvements_delegue', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      delegue_id: {
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
      montant_total:    { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      statut_paiement:  { type: Sequelize.ENUM('en_attente', 'paye'), allowNull: false, defaultValue: 'en_attente' },
      mode_paiement:    { type: Sequelize.STRING(50), allowNull: true },
      date_paiement:    { type: Sequelize.DATEONLY, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('factures_achat', ['delegue_id']);
    await queryInterface.addIndex('factures_achat', ['stockiste_id']);
    await queryInterface.addIndex('factures_achat', ['statut_paiement']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('factures_achat');
  },
};
