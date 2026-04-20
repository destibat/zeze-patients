const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    numero_dossier: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },
    sexe: {
      type: DataTypes.ENUM('masculin', 'feminin', 'autre'),
      allowNull: false,
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { notEmpty: true },
    },
    adresse:              { type: DataTypes.STRING(255), allowNull: true },
    commune:              { type: DataTypes.STRING(100), allowNull: true },
    ville:                { type: DataTypes.STRING(100), allowNull: true },
    pays:                 { type: DataTypes.STRING(100), allowNull: true, defaultValue: "Côte d'Ivoire" },
    profession:           { type: DataTypes.STRING(150), allowNull: true },
    groupe_sanguin: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true,
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const val = this.getDataValue('allergies');
        if (!val) return [];
        try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return []; }
      },
      set(val) {
        this.setDataValue('allergies', Array.isArray(val) ? JSON.stringify(val) : val);
      },
    },
    antecedents_personnels: { type: DataTypes.TEXT, allowNull: true },
    antecedents_familiaux:  { type: DataTypes.TEXT, allowNull: true },
    contact_urgence_nom:       { type: DataTypes.STRING(150), allowNull: true },
    contact_urgence_telephone: { type: DataTypes.STRING(20),  allowNull: true },
    contact_urgence_lien:      { type: DataTypes.STRING(100), allowNull: true },
    numero_assurance: { type: DataTypes.STRING(100), allowNull: true },
    photo_url:        { type: DataTypes.STRING(500), allowNull: true },
    archive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    tableName: 'patients',
    defaultScope: {
      where: { archive: false },
    },
    scopes: {
      avecArchives: {},
    },
  });

  // Calcule l'âge à partir de la date de naissance
  Patient.prototype.getAge = function () {
    const auj = new Date();
    const naissance = new Date(this.date_naissance);
    let age = auj.getFullYear() - naissance.getFullYear();
    const mois = auj.getMonth() - naissance.getMonth();
    if (mois < 0 || (mois === 0 && auj.getDate() < naissance.getDate())) age--;
    return age;
  };

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, { foreignKey: 'created_by', as: 'createur' });
  };

  return Patient;
};
