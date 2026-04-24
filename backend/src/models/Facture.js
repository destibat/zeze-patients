'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Facture extends Model {
    static associate(models) {
      Facture.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
      Facture.belongsTo(models.Ordonnance, { foreignKey: 'ordonnance_id', as: 'ordonnance' });
      Facture.belongsTo(models.User, { foreignKey: 'created_by', as: 'createur' });
      Facture.belongsTo(models.Exercice, { foreignKey: 'exercice_id', as: 'exercice' });
    }

    get montant_restant() {
      return this.montant_total - this.montant_paye;
    }
  }

  Facture.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      ordonnance_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: false },
      date_facture: { type: DataTypes.DATEONLY, allowNull: false },
      montant_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      montant_paye: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      mode_paiement: {
        type: DataTypes.ENUM('especes', 'mobile_money', 'virement', 'cheque', 'autre'),
        allowNull: true,
      },
      statut: {
        type: DataTypes.ENUM('en_attente', 'partiellement_payee', 'payee', 'annulee'),
        allowNull: false,
        defaultValue: 'en_attente',
      },
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
      notes: { type: DataTypes.TEXT },
      exercice_id: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Facture',
      tableName: 'factures',
      underscored: true,
    }
  );

  return Facture;
};
