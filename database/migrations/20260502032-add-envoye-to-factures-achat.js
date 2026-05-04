'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TABLE factures_achat MODIFY COLUMN statut_paiement ENUM('en_attente', 'envoye', 'paye') NOT NULL DEFAULT 'en_attente'"
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TABLE factures_achat MODIFY COLUMN statut_paiement ENUM('en_attente', 'paye') NOT NULL DEFAULT 'en_attente'"
    );
  },
};
