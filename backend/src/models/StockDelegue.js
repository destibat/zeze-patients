'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockDelegue = sequelize.define('StockDelegue', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    delegue_id: { type: DataTypes.UUID, allowNull: false },
    produit_id: { type: DataTypes.UUID, allowNull: false },
    quantite: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'stock_delegue',
    underscored: true,
  });

  StockDelegue.associate = (models) => {
    StockDelegue.belongsTo(models.User, { foreignKey: 'delegue_id', as: 'delegue' });
    StockDelegue.belongsTo(models.Produit, { foreignKey: 'produit_id', as: 'produit' });
  };

  return StockDelegue;
};
