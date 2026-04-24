'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analyses_nfs', {
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
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      date_analyse: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      // Identification du patient pour l'analyse
      sexe_patient: {
        type: Sequelize.ENUM('M', 'F'),
        allowNull: true,
      },
      age_patient: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Âge en années au moment de l\'analyse',
      },
      // --- Série rouge ---
      hemoglobine: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'g/dL' },
      hematocrite: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: '%' },
      globules_rouges: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'T/L (10^12/L)' },
      vgm: { type: Sequelize.DECIMAL(6, 2), allowNull: true, comment: 'Volume Globulaire Moyen fL' },
      tcmh: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'Teneur Corpusculaire Moyenne en Hb pg' },
      ccmh: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'Concentration Corpusculaire Moyenne en Hb g/dL' },
      rdw: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'Red Distribution Width %' },
      // --- Série blanche ---
      globules_blancs: { type: Sequelize.DECIMAL(6, 2), allowNull: true, comment: 'G/L (10^9/L)' },
      neutrophiles_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: '%' },
      neutrophiles_abs: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'G/L' },
      lymphocytes_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: '%' },
      lymphocytes_abs: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'G/L' },
      monocytes_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: '%' },
      monocytes_abs: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'G/L' },
      eosinophiles_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: '%' },
      eosinophiles_abs: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'G/L' },
      basophiles_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: '%' },
      basophiles_abs: { type: Sequelize.DECIMAL(5, 2), allowNull: true, comment: 'G/L' },
      // --- Plaquettes ---
      plaquettes: { type: Sequelize.DECIMAL(7, 0), allowNull: true, comment: 'G/L' },
      // --- Interprétation générée ---
      interpretations: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tableau de commentaires générés automatiquement',
      },
      conclusion: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Conclusion libre modifiable par le stockiste',
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
    await queryInterface.dropTable('analyses_nfs');
  },
};
