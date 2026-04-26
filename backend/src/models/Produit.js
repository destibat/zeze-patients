'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Produit extends Model {}

  Produit.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nom: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      categorie: {
        type: DataTypes.ENUM(
          'antibiotique',
          'booster',
          'specialise',
          'sommeil',
          'prevention',
          'autre'
        ),
        allowNull: false,
        defaultValue: 'autre',
      },
      prix_unitaire: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Prix en FCFA',
      },
      quantite_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      seuil_alerte: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      actif: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Produit',
      tableName: 'produits',
      underscored: true,
    }
  );

  return Produit;
};
