'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TABLE bons_commande_mapa MODIFY COLUMN statut ENUM('brouillon','envoye','livre_partiel','livre','annule') NOT NULL DEFAULT 'brouillon'"
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TABLE bons_commande_mapa MODIFY COLUMN statut ENUM('brouillon','envoye','livre_partiel','livre') NOT NULL DEFAULT 'brouillon'"
    );
  },
};
