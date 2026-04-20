'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      numero_dossier: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Format : ZZP-YYYY-NNNNN',
      },
      nom: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      prenom: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      sexe: {
        type: Sequelize.ENUM('masculin', 'feminin', 'autre'),
        allowNull: false,
      },
      date_naissance: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      telephone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      // Adresse
      adresse: { type: Sequelize.STRING(255), allowNull: true },
      commune: { type: Sequelize.STRING(100), allowNull: true },
      ville: { type: Sequelize.STRING(100), allowNull: true },
      pays: { type: Sequelize.STRING(100), allowNull: true, defaultValue: "Côte d'Ivoire" },
      // Informations professionnelles
      profession: { type: Sequelize.STRING(150), allowNull: true },
      // Informations médicales
      groupe_sanguin: {
        type: Sequelize.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allowNull: true,
      },
      allergies: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Liste de tags texte libre',
      },
      antecedents_personnels: { type: Sequelize.TEXT, allowNull: true },
      antecedents_familiaux: { type: Sequelize.TEXT, allowNull: true },
      // Contact d'urgence
      contact_urgence_nom: { type: Sequelize.STRING(150), allowNull: true },
      contact_urgence_telephone: { type: Sequelize.STRING(20), allowNull: true },
      contact_urgence_lien: { type: Sequelize.STRING(100), allowNull: true },
      // Assurance
      numero_assurance: { type: Sequelize.STRING(100), allowNull: true },
      // Photo
      photo_url: { type: Sequelize.STRING(500), allowNull: true },
      // Gestion
      archive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('patients', ['numero_dossier']);
    await queryInterface.addIndex('patients', ['nom', 'prenom']);
    await queryInterface.addIndex('patients', ['telephone']);
    await queryInterface.addIndex('patients', ['archive']);
    await queryInterface.addIndex('patients', ['date_naissance']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patients');
  },
};
