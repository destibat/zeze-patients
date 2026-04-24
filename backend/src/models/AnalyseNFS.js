'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AnalyseNFS extends Model {
    static associate(models) {
      AnalyseNFS.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      AnalyseNFS.belongsTo(models.Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
      AnalyseNFS.belongsTo(models.User, { foreignKey: 'created_by', as: 'auteur' });
    }
  }

  AnalyseNFS.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    consultation_id: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    date_analyse: { type: DataTypes.DATEONLY, allowNull: false },
    sexe_patient: { type: DataTypes.ENUM('M', 'F'), allowNull: true },
    age_patient: { type: DataTypes.INTEGER, allowNull: true },
    // Série rouge
    hemoglobine: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    hematocrite: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    globules_rouges: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    vgm: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    tcmh: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    ccmh: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    rdw: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    // Série blanche
    globules_blancs: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    neutrophiles_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    neutrophiles_abs: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    lymphocytes_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    lymphocytes_abs: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    monocytes_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    monocytes_abs: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    eosinophiles_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    eosinophiles_abs: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    basophiles_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    basophiles_abs: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    // Plaquettes
    plaquettes: { type: DataTypes.DECIMAL(7, 0), allowNull: true },
    // Interprétation
    interpretations: { type: DataTypes.JSON, allowNull: true },
    conclusion: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'AnalyseNFS',
    tableName: 'analyses_nfs',
    underscored: true,
  });

  return AnalyseNFS;
};
