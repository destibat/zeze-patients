const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const COUT_BCRYPT = 12;

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('administrateur', 'stockiste', 'secretaire', 'delegue'),
      allowNull: false,
      defaultValue: 'secretaire',
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pays: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    nom_cabinet: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 30.00,
    },
    stockiste_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    // Force le changement de mot de passe à la première connexion
    doit_changer_mdp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    derniere_connexion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    // Ne jamais retourner le hash dans les sérialisations JSON
    defaultScope: {
      attributes: { exclude: ['password_hash'] },
    },
    scopes: {
      avecMotDePasse: { attributes: {} },
    },
  });

  // Hash du mot de passe avant création ou modification
  const hasherMotDePasse = async (user) => {
    if (user.changed('password_hash') && user.password_hash) {
      user.password_hash = await bcrypt.hash(user.password_hash, COUT_BCRYPT);
    }
  };
  User.beforeCreate(hasherMotDePasse);
  User.beforeUpdate(hasherMotDePasse);

  // Vérifie un mot de passe en clair contre le hash stocké
  User.prototype.verifierMotDePasse = async function (motDePasse) {
    return bcrypt.compare(motDePasse, this.password_hash);
  };

  // Associations
  User.associate = (models) => {
    User.hasMany(models.RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens', onDelete: 'CASCADE' });
    User.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'logsAudit' });
    User.belongsTo(models.User, { foreignKey: 'stockiste_id', as: 'stockiste' });
    User.hasMany(models.User, { foreignKey: 'stockiste_id', as: 'delegues' });
  };

  return User;
};
