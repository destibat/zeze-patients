'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Ajouter 'stockiste' à l'enum (garde 'medecin' temporairement)
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('administrateur','medecin','stockiste','secretaire') NOT NULL DEFAULT 'secretaire'"
    );
    // 2. Migrer les données
    await queryInterface.sequelize.query(
      "UPDATE users SET role = 'stockiste' WHERE role = 'medecin'"
    );
    // 3. Supprimer l'ancien enum value
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('administrateur','stockiste','secretaire') NOT NULL DEFAULT 'secretaire'"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('administrateur','medecin','stockiste','secretaire') NOT NULL DEFAULT 'secretaire'"
    );
    await queryInterface.sequelize.query(
      "UPDATE users SET role = 'medecin' WHERE role = 'stockiste'"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('administrateur','medecin','secretaire') NOT NULL DEFAULT 'secretaire'"
    );
  },
};
