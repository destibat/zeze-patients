'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommandeApprovisionnement = sequelize.define('CommandeApprovisionnement', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    revendeur_id:  { type: DataTypes.UUID, allowNull: false },
    stockiste_id:  { type: DataTypes.UUID, allowNull: false },
    lignes:        { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    montant_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    statut: {
      type: DataTypes.ENUM('brouillon', 'en_attente', 'validee', 'refusee'),
      allowNull: false,
      defaultValue: 'brouillon',
    },
    notes_revendeur: { type: DataTypes.STRING(500), allowNull: true },
    notes_stockiste: { type: DataTypes.STRING(500), allowNull: true },
    date_commande:   { type: DataTypes.DATEONLY, allowNull: true },
    date_validation: { type: DataTypes.DATEONLY, allowNull: true },
  }, {
    tableName: 'commandes_approvisionnement',
    underscored: true,
  });

  CommandeApprovisionnement.associate = (models) => {
    CommandeApprovisionnement.belongsTo(models.User, { foreignKey: 'revendeur_id', as: 'revendeur' });
    CommandeApprovisionnement.belongsTo(models.User, { foreignKey: 'stockiste_id', as: 'stockiste' });
    CommandeApprovisionnement.hasOne(models.FactureAchat, { foreignKey: 'commande_id', as: 'facture' });
  };

  return CommandeApprovisionnement;
};
