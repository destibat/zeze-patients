'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bons_commande_mapa', 'lignes_livrees', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // Ajout de 'livre_partiel' dans l'enum statut (raw SQL, plus fiable sur MariaDB)
    await queryInterface.sequelize.query(
      "ALTER TABLE bons_commande_mapa MODIFY COLUMN statut ENUM('brouillon','envoye','livre_partiel','livre') NOT NULL DEFAULT 'brouillon'"
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bons_commande_mapa', 'lignes_livrees');
    await queryInterface.sequelize.query(
      "ALTER TABLE bons_commande_mapa MODIFY COLUMN statut ENUM('brouillon','envoye','livre') NOT NULL DEFAULT 'brouillon'"
    );
  },
};
