'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Consultation extends Model {
    static associate(models) {
      Consultation.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      Consultation.belongsTo(models.User, { foreignKey: 'medecin_id', as: 'medecin' });
      Consultation.hasMany(models.Ordonnance, { foreignKey: 'consultation_id', as: 'ordonnances' });
    }

    getIMC() {
      if (!this.poids || !this.taille) return null;
      const tailleM = this.taille / 100;
      return +(this.poids / (tailleM * tailleM)).toFixed(1);
    }
  }

  Consultation.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      medecin_id: { type: DataTypes.UUID, allowNull: false },
      date_consultation: { type: DataTypes.DATEONLY, allowNull: false },
      motif: { type: DataTypes.STRING(500), allowNull: false },
      symptomes: { type: DataTypes.TEXT },
      diagnostic: { type: DataTypes.TEXT },
      traitement_notes: { type: DataTypes.TEXT },
      tension_systolique: { type: DataTypes.SMALLINT.UNSIGNED },
      tension_diastolique: { type: DataTypes.SMALLINT.UNSIGNED },
      frequence_cardiaque: { type: DataTypes.SMALLINT.UNSIGNED },
      temperature: { type: DataTypes.DECIMAL(4, 1) },
      poids: { type: DataTypes.DECIMAL(5, 2) },
      taille: { type: DataTypes.SMALLINT.UNSIGNED },
      saturation_o2: { type: DataTypes.TINYINT.UNSIGNED },
    },
    {
      sequelize,
      modelName: 'Consultation',
      tableName: 'consultations',
      underscored: true,
    }
  );

  return Consultation;
};
