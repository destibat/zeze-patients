'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FichierPatient extends Model {
    static associate(models) {
      FichierPatient.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      FichierPatient.belongsTo(models.Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
      FichierPatient.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'auteur' });
    }
  }

  FichierPatient.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    consultation_id: { type: DataTypes.UUID, allowNull: true },
    nom_original: { type: DataTypes.STRING(255), allowNull: false },
    nom_stocke: { type: DataTypes.STRING(255), allowNull: false },
    type_mime: { type: DataTypes.STRING(100), allowNull: false },
    taille: { type: DataTypes.INTEGER, allowNull: false },
    categorie: {
      type: DataTypes.ENUM('resultat_analyse', 'ordonnance_externe', 'imagerie', 'autre'),
      allowNull: false,
      defaultValue: 'autre',
    },
    uploaded_by: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize,
    modelName: 'FichierPatient',
    tableName: 'fichiers_patient',
    underscored: true,
  });

  return FichierPatient;
};
