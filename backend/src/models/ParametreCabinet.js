'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ParametreCabinet extends Model {}

  ParametreCabinet.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      cle:         { type: DataTypes.STRING(100), allowNull: false, unique: true },
      valeur:      { type: DataTypes.STRING(500), allowNull: false },
      description: { type: DataTypes.STRING(300), allowNull: true },
    },
    {
      sequelize,
      modelName: 'ParametreCabinet',
      tableName: 'parametres_cabinet',
      underscored: true,
    }
  );

  return ParametreCabinet;
};
