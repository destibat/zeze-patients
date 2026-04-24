'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MouvementDelegue = sequelize.define('MouvementDelegue', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    delegue_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM('achat', 'vente'), allowNull: false },
    produit_id: { type: DataTypes.UUID, allowNull: true },
    lignes: { type: DataTypes.JSON, allowNull: true },
    quantite: { type: DataTypes.INTEGER, allowNull: true },
    montant_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    commission_stockiste: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    gain_delegue: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    client_nom: { type: DataTypes.STRING(200), allowNull: true },
    date_mouvement: { type: DataTypes.DATEONLY, allowNull: false },
    statut: { type: DataTypes.ENUM('en_attente', 'valide', 'refuse'), allowNull: true },
    mode_paiement: { type: DataTypes.STRING(50), allowNull: true },
    exercice_id: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'mouvements_delegue',
    underscored: true,
  });

  MouvementDelegue.associate = (models) => {
    MouvementDelegue.belongsTo(models.User, { foreignKey: 'delegue_id', as: 'delegue' });
    MouvementDelegue.belongsTo(models.Produit, { foreignKey: 'produit_id', as: 'produit' });
    MouvementDelegue.belongsTo(models.Exercice, { foreignKey: 'exercice_id', as: 'exercice' });
  };

  return MouvementDelegue;
};
