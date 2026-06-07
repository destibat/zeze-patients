'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BonCommandeMapa = sequelize.define('BonCommandeMapa', {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    cabinet_id: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    numero:     { type: DataTypes.STRING(20), allowNull: false },
    lignes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('lignes');
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch (_) { return []; }
        }
        return Array.isArray(raw) ? raw : [];
      },
    },
    montant_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    statut: {
      type: DataTypes.ENUM('brouillon', 'envoye', 'livre'),
      allowNull: false,
      defaultValue: 'brouillon',
    },
    notes:                    { type: DataTypes.STRING(500), allowNull: true },
    date_commande:            { type: DataTypes.DATEONLY, allowNull: true },
    date_livraison_prevue:    { type: DataTypes.DATEONLY, allowNull: true },
    date_livraison_effective: { type: DataTypes.DATEONLY, allowNull: true },
  }, {
    tableName: 'bons_commande_mapa',
    underscored: true,
  });

  BonCommandeMapa.associate = (models) => {
    BonCommandeMapa.belongsTo(models.User, { foreignKey: 'created_by', as: 'createur' });
  };

  return BonCommandeMapa;
};
