'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RendezVous extends Model {
    static associate(models) {
      RendezVous.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      RendezVous.belongsTo(models.User, { foreignKey: 'medecin_id', as: 'medecin' });
      RendezVous.belongsTo(models.User, { foreignKey: 'created_by', as: 'createur' });
    }
  }

  RendezVous.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      medecin_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: false },
      date_heure: { type: DataTypes.DATE, allowNull: false },
      duree_minutes: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 30 },
      motif: { type: DataTypes.STRING(300), allowNull: false },
      statut: {
        type: DataTypes.ENUM('planifie', 'confirme', 'annule', 'honore', 'absent'),
        allowNull: false,
        defaultValue: 'planifie',
      },
      notes: { type: DataTypes.TEXT },
    },
    {
      sequelize,
      modelName: 'RendezVous',
      tableName: 'rendez_vous',
      underscored: true,
    }
  );

  return RendezVous;
};
