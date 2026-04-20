const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // On stocke le hash du token, jamais le token brut
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Permet la révocation ciblée d'un token
    revoque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ip_origine: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  }, {
    tableName: 'refresh_tokens',
    updatedAt: false,
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: 'user_id', as: 'utilisateur' });
  };

  // Supprime automatiquement les tokens expirés (appelé périodiquement)
  RefreshToken.purgerExpires = async function () {
    return RefreshToken.destroy({
      where: { expires_at: { [require('sequelize').Op.lt]: new Date() } },
    });
  };

  return RefreshToken;
};
