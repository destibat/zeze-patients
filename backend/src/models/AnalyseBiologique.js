'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AnalyseBiologique extends Model {
    static associate(models) {
      AnalyseBiologique.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      AnalyseBiologique.belongsTo(models.Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
      AnalyseBiologique.belongsTo(models.User, { foreignKey: 'created_by', as: 'auteur' });
    }
  }

  AnalyseBiologique.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    consultation_id: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    date_analyse: { type: DataTypes.DATEONLY, allowNull: false },
    sexe_patient: { type: DataTypes.ENUM('M', 'F'), allowNull: true },
    age_patient: { type: DataTypes.INTEGER, allowNull: true },
    panels_demandes: { type: DataTypes.JSON, allowNull: false },
    valeurs_brutes: { type: DataTypes.JSON, allowNull: false },
    source: {
      type: DataTypes.ENUM('manuelle', 'upload_pdf', 'upload_image'),
      allowNull: false,
      defaultValue: 'manuelle',
    },
    contexte_clinique: { type: DataTypes.TEXT, allowNull: true },
    conclusion: { type: DataTypes.TEXT, allowNull: true },
    analyse_ia_texte: { type: DataTypes.TEXT, allowNull: true },
    analyse_ia_modele: { type: DataTypes.STRING(50), allowNull: true },
    tokens_input: { type: DataTypes.INTEGER, allowNull: true },
    tokens_output: { type: DataTypes.INTEGER, allowNull: true },
    cout_estime_usd: { type: DataTypes.DECIMAL(8, 4), allowNull: true },
    valide_par_medecin: { type: DataTypes.BOOLEAN, defaultValue: false },
    date_validation: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'AnalyseBiologique',
    tableName: 'analyses_biologiques',
    underscored: true,
  });

  return AnalyseBiologique;
};
