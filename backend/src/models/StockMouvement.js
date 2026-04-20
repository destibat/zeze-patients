'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class StockMouvement extends Model {
    static associate(models) {
      StockMouvement.belongsTo(models.Produit, { foreignKey: 'produit_id', as: 'produit' });
      StockMouvement.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      StockMouvement.belongsTo(models.Ordonnance, { foreignKey: 'ordonnance_id', as: 'ordonnance' });
    }
  }

  StockMouvement.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      produit_id: { type: DataTypes.UUID, allowNull: false },
      type: { type: DataTypes.ENUM('entree', 'sortie', 'ajustement'), allowNull: false },
      quantite: { type: DataTypes.INTEGER, allowNull: false },
      motif: { type: DataTypes.STRING(200) },
      ordonnance_id: { type: DataTypes.UUID },
      user_id: { type: DataTypes.UUID, allowNull: false },
      date_livraison: { type: DataTypes.DATEONLY, allowNull: true },
      stock_apres: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: 'StockMouvement',
      tableName: 'stock_mouvements',
      underscored: true,
    }
  );

  return StockMouvement;
};
