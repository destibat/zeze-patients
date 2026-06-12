'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeclarationProduit = sequelize.define('DeclarationProduit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cabinet_id:       { type: DataTypes.UUID,       allowNull: true },
    facture_id:       { type: DataTypes.UUID,       allowNull: false },
    ligne_index:      { type: DataTypes.INTEGER,    allowNull: false },
    nom_produit:      { type: DataTypes.STRING(200), allowNull: false },
    prix_unitaire:    { type: DataTypes.INTEGER,    allowNull: false },
    exercice_id:      { type: DataTypes.UUID,       allowNull: false },
    date_declaration: { type: DataTypes.DATE,       allowNull: false },
  }, {
    tableName:  'declarations_produit',
    underscored: true,
  });

  DeclarationProduit.associate = (models) => {
    DeclarationProduit.belongsTo(models.Facture,   { foreignKey: 'facture_id',  as: 'facture'  });
    DeclarationProduit.belongsTo(models.Exercice,  { foreignKey: 'exercice_id', as: 'exercice' });
  };

  return DeclarationProduit;
};
