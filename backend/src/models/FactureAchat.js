'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FactureAchat = sequelize.define('FactureAchat', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    mouvement_id: { type: DataTypes.UUID, allowNull: false },
    delegue_id:   { type: DataTypes.UUID, allowNull: false },
    stockiste_id: { type: DataTypes.UUID, allowNull: false },
    montant_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    statut_paiement: {
      type: DataTypes.ENUM('en_attente', 'paye'),
      allowNull: false,
      defaultValue: 'en_attente',
    },
    mode_paiement: { type: DataTypes.STRING(50), allowNull: true },
    date_paiement: { type: DataTypes.DATEONLY, allowNull: true },
  }, {
    tableName: 'factures_achat',
    underscored: true,
  });

  FactureAchat.associate = (models) => {
    FactureAchat.belongsTo(models.MouvementDelegue, { foreignKey: 'mouvement_id', as: 'mouvement' });
    FactureAchat.belongsTo(models.User, { foreignKey: 'delegue_id',   as: 'delegue' });
    FactureAchat.belongsTo(models.User, { foreignKey: 'stockiste_id', as: 'stockiste' });
  };

  return FactureAchat;
};
