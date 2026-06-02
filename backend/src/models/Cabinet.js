'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Cabinet extends Model {}

  Cabinet.init(
    {
      id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      slug:   { type: DataTypes.STRING(50), allowNull: false, unique: true },
      domaine:{ type: DataTypes.STRING(150), allowNull: false, unique: true },
      nom:    { type: DataTypes.STRING(200), allowNull: true },
      actif:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Cabinet',
      tableName: 'cabinets',
      underscored: true,
    }
  );

  return Cabinet;
};
