'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('parametres_cabinet', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      cle: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      valeur: { type: Sequelize.STRING(500), allowNull: false },
      description: { type: Sequelize.STRING(300), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    const now = new Date();
    await queryInterface.bulkInsert('parametres_cabinet', [
      {
        id: randomUUID(),
        cle: 'commission_stockiste',
        valeur: '25',
        description: 'Commission du stockiste sur les ventes encaissées (%)',
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        cle: 'commission_proprietaire',
        valeur: '30',
        description: 'Commission du propriétaire sur les ventes encaissées (%)',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('parametres_cabinet');
  },
};
