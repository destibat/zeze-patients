'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Exercice extends Model {
    static associate(models) {
      Exercice.belongsTo(models.User, { foreignKey: 'ouvert_par', as: 'ouvreur' });
      Exercice.belongsTo(models.User, { foreignKey: 'cloture_par', as: 'clotureur' });
      Exercice.belongsTo(models.User, { foreignKey: 'rouvert_par', as: 'rouvreur' });
      Exercice.hasMany(models.MouvementDelegue, { foreignKey: 'exercice_id', as: 'mouvements' });
      Exercice.hasMany(models.Facture, { foreignKey: 'exercice_id', as: 'factures' });
    }

    get estOuvert() {
      return this.statut === 'ouvert' || this.statut === 'rouvert';
    }

    get dureeJours() {
      if (!this.date_ouverture) return null;
      const fin = this.date_cloture ? new Date(this.date_cloture) : new Date();
      return Math.floor((fin - new Date(this.date_ouverture)) / 86400000);
    }
  }

  Exercice.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      date_ouverture: { type: DataTypes.DATE, allowNull: false },
      date_cloture: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      statut: {
        type: DataTypes.ENUM('ouvert', 'cloture', 'rouvert'),
        allowNull: false,
        defaultValue: 'ouvert',
      },
      ouvert_par: { type: DataTypes.UUID, allowNull: true },
      cloture_par: { type: DataTypes.UUID, allowNull: true },
      rouvert_par: { type: DataTypes.UUID, allowNull: true },
      motif_reouverture: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      bilan_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        get() {
          const val = this.getDataValue('bilan_snapshot');
          if (!val) return null;
          try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return null; }
        },
      },
    },
    {
      sequelize,
      modelName: 'Exercice',
      tableName: 'exercices',
      underscored: true,
    }
  );

  return Exercice;
};
