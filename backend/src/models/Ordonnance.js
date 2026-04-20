'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Ordonnance extends Model {
    static associate(models) {
      Ordonnance.belongsTo(models.Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
      Ordonnance.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      Ordonnance.belongsTo(models.User, { foreignKey: 'medecin_id', as: 'medecin' });
    }
  }

  Ordonnance.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      consultation_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      medecin_id: { type: DataTypes.UUID, allowNull: false },
      date_ordonnance: { type: DataTypes.DATEONLY, allowNull: false },
      lignes: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        get() {
          const val = this.getDataValue('lignes');
          if (!val) return [];
          try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return []; }
        },
        set(val) {
          this.setDataValue('lignes', Array.isArray(val) ? JSON.stringify(val) : val);
        },
      },
      montant_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      statut: {
        type: DataTypes.ENUM('brouillon', 'validee', 'annulee'),
        allowNull: false,
        defaultValue: 'brouillon',
      },
      notes: { type: DataTypes.TEXT },
    },
    {
      sequelize,
      modelName: 'Ordonnance',
      tableName: 'ordonnances',
      underscored: true,
    }
  );

  return Ordonnance;
};
