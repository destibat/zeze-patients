'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analyses_biologiques', {
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
      sexe_patient: {
        type: Sequelize.ENUM('M', 'F'),
        allowNull: true,
      },
      age_patient: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Âge en années au moment de l\'analyse',
      },
      panels_demandes: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Tableau des panels cochés ex: ["nfs","renal","glycemie"]',
      },
      valeurs_brutes: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Objet structuré par panel { nfs: {...}, renal: {...}, ... }',
      },
      source: {
        type: Sequelize.ENUM('manuelle', 'upload_pdf', 'upload_image'),
        allowNull: false,
        defaultValue: 'manuelle',
      },
      conclusion: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Champs IA — remplis en Phase 3
      analyse_ia_texte: { type: Sequelize.TEXT, allowNull: true },
      analyse_ia_modele: { type: Sequelize.STRING(50), allowNull: true },
      tokens_input: { type: Sequelize.INTEGER, allowNull: true },
      tokens_output: { type: Sequelize.INTEGER, allowNull: true },
      cout_estime_usd: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
      valide_par_medecin: { type: Sequelize.BOOLEAN, defaultValue: false },
      date_validation: { type: Sequelize.DATE, allowNull: true },
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

    // Migrer les données existantes depuis analyses_nfs
    const nfsExistantes = await queryInterface.sequelize.query(
      'SELECT * FROM analyses_nfs ORDER BY created_at ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const nfs of nfsExistantes) {
      const valeurs = {
        nfs: {
          hemoglobine:       nfs.hemoglobine,
          hematocrite:       nfs.hematocrite,
          globules_rouges:   nfs.globules_rouges,
          vgm:               nfs.vgm,
          tcmh:              nfs.tcmh,
          ccmh:              nfs.ccmh,
          rdw:               nfs.rdw,
          globules_blancs:   nfs.globules_blancs,
          neutrophiles_pct:  nfs.neutrophiles_pct,
          neutrophiles_abs:  nfs.neutrophiles_abs,
          lymphocytes_pct:   nfs.lymphocytes_pct,
          lymphocytes_abs:   nfs.lymphocytes_abs,
          monocytes_pct:     nfs.monocytes_pct,
          monocytes_abs:     nfs.monocytes_abs,
          eosinophiles_pct:  nfs.eosinophiles_pct,
          eosinophiles_abs:  nfs.eosinophiles_abs,
          basophiles_pct:    nfs.basophiles_pct,
          basophiles_abs:    nfs.basophiles_abs,
          plaquettes:        nfs.plaquettes,
        },
      };

      await queryInterface.sequelize.query(
        `INSERT INTO analyses_biologiques
          (id, patient_id, consultation_id, created_by, date_analyse,
           sexe_patient, age_patient, panels_demandes, valeurs_brutes,
           source, conclusion, created_at, updated_at)
         VALUES (UUID(), :patient_id, :consultation_id, :created_by, :date_analyse,
                 :sexe_patient, :age_patient, :panels_demandes, :valeurs_brutes,
                 'manuelle', :conclusion, :created_at, :updated_at)`,
        {
          replacements: {
            patient_id:      nfs.patient_id,
            consultation_id: nfs.consultation_id,
            created_by:      nfs.created_by,
            date_analyse:    nfs.date_analyse,
            sexe_patient:    nfs.sexe_patient,
            age_patient:     nfs.age_patient,
            panels_demandes: JSON.stringify(['nfs']),
            valeurs_brutes:  JSON.stringify(valeurs),
            conclusion:      nfs.conclusion,
            created_at:      nfs.created_at,
            updated_at:      nfs.updated_at,
          },
          type: Sequelize.QueryTypes.INSERT,
        }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('analyses_biologiques');
  },
};
