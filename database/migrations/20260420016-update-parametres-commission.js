'use strict';

module.exports = {
  async up(queryInterface) {
    // Remove commission_proprietaire, add commission_delegue default 15
    await queryInterface.sequelize.query(
      "DELETE FROM parametres_cabinet WHERE cle = 'commission_proprietaire'"
    );
    const { randomUUID } = require('crypto');
    await queryInterface.sequelize.query(
      `INSERT INTO parametres_cabinet (id, cle, valeur, description, created_at, updated_at)
       VALUES ('${randomUUID()}', 'commission_delegue', '15', 'Commission délégué (%)', NOW(), NOW())
       ON DUPLICATE KEY UPDATE valeur = valeur`
    );
  },

  async down(queryInterface) {
    const { randomUUID } = require('crypto');
    await queryInterface.sequelize.query(
      "DELETE FROM parametres_cabinet WHERE cle = 'commission_delegue'"
    );
    await queryInterface.sequelize.query(
      `INSERT INTO parametres_cabinet (id, cle, valeur, description, created_at, updated_at)
       VALUES ('${randomUUID()}', 'commission_proprietaire', '30', 'Commission propriétaire (%)', NOW(), NOW())`
    );
  },
};
