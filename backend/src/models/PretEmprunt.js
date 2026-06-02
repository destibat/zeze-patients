'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PretEmprunt extends Model {
    static associate(models) {
      PretEmprunt.belongsTo(models.User,   { foreignKey: 'stockiste_id', as: 'stockiste' });
      PretEmprunt.belongsTo(models.Produit, { foreignKey: 'produit_id',   as: 'produit' });
    }
  }

  PretEmprunt.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cabinet_id: { type: DataTypes.UUID, allowNull: true },
    type: {
      type: DataTypes.ENUM('pret', 'emprunt'),
      allowNull: false,
    },
    stockiste_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    partenaire_nom: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    partenaire_telephone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    partenaire_cabinet: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    produit_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantite_rendue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    date_pret: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    date_retour: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'rendu', 'rendu_partiel'),
      allowNull: false,
      defaultValue: 'en_cours',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PretEmprunt',
    tableName: 'prets_emprunts',
    underscored: true,
  });

  return PretEmprunt;
};
