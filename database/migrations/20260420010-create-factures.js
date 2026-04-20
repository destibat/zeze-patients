'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('factures', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      numero: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'FAC-YYYY-NNNNN',
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onDelete: 'RESTRICT',
      },
      ordonnance_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'ordonnances', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      date_facture: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      montant_total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'FCFA',
      },
      montant_paye: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'FCFA',
      },
      mode_paiement: {
        type: Sequelize.ENUM('especes', 'mobile_money', 'virement', 'cheque', 'autre'),
        allowNull: true,
      },
      statut: {
        type: Sequelize.ENUM('en_attente', 'partiellement_payee', 'payee', 'annulee'),
        allowNull: false,
        defaultValue: 'en_attente',
      },
      lignes: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '[]',
        comment: 'JSON — copie des lignes au moment de la facturation',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('factures', ['patient_id']);
    await queryInterface.addIndex('factures', ['ordonnance_id']);
    await queryInterface.addIndex('factures', ['statut']);
    await queryInterface.addIndex('factures', ['date_facture']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('factures');
  },
};
