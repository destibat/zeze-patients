'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('fichiers_patient', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onDelete: 'CASCADE',
      },
      consultation_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'consultations', key: 'id' },
        onDelete: 'SET NULL',
      },
      nom_original: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nom_stocke: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      type_mime: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      taille: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Taille en octets',
      },
      categorie: {
        type: Sequelize.ENUM('resultat_analyse', 'ordonnance_externe', 'imagerie', 'autre'),
        allowNull: false,
        defaultValue: 'autre',
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('fichiers_patient');
  },
};
