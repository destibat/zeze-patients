'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mouvements_delegue', 'montant_paye', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'montant_total',
    });

    // Ajouter 'partiellement_payee' à l'ENUM statut
    await queryInterface.sequelize.query(`
      ALTER TABLE mouvements_delegue
      MODIFY COLUMN statut ENUM('en_attente','valide','refuse','partiellement_payee') NULL
    `);

    // Les ventes déjà validées ont montant_paye = montant_total
    await queryInterface.sequelize.query(`
      UPDATE mouvements_delegue
      SET montant_paye = montant_total
      WHERE type = 'vente' AND statut = 'valide'
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('mouvements_delegue', 'montant_paye');
    await queryInterface.sequelize.query(`
      ALTER TABLE mouvements_delegue
      MODIFY COLUMN statut ENUM('en_attente','valide','refuse') NULL
    `);
  },
};
