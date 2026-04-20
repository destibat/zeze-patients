const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true, // null si action système
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // Exemples : 'LOGIN', 'LOGOUT', 'CREATE_PATIENT', 'UPDATE_USER', etc.
    },
    entite: {
      type: DataTypes.STRING(50),
      allowNull: true,
      // Exemples : 'Patient', 'User', 'Consultation'
    },
    entite_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    succes: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'audit_logs',
    updatedAt: false,
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'utilisateur' });
  };

  return AuditLog;
};
