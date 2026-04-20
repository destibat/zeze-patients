'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ordonnances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      numero: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'ORD-YYYY-NNNNN',
      },
      consultation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'consultations', key: 'id' },
        onDelete: 'CASCADE',
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onDelete: 'CASCADE',
      },
      medecin_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      date_ordonnance: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      // JSON array: [{produit_id, nom_produit, quantite, posologie, duree, prix_unitaire}]
      lignes: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      montant_total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'FCFA',
      },
      statut: {
        type: Sequelize.ENUM('brouillon', 'validee', 'annulee'),
        allowNull: false,
        defaultValue: 'brouillon',
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

    await queryInterface.addIndex('ordonnances', ['consultation_id']);
    await queryInterface.addIndex('ordonnances', ['patient_id']);
    await queryInterface.addIndex('ordonnances', ['numero']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ordonnances');
  },
};
