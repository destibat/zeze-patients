'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // MariaDB: add new ENUM value (3-step)
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY role ENUM('administrateur', 'stockiste', 'secretaire', 'delegue') NOT NULL DEFAULT 'secretaire'"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY role ENUM('administrateur', 'stockiste', 'secretaire') NOT NULL DEFAULT 'secretaire'"
    );
  },
};
