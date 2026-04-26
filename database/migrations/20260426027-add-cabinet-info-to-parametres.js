'use strict';

module.exports = {
  async up(queryInterface) {
    // Ajouter nom_cabinet et adresse dans parametres_cabinet (si absents)
    const existants = await queryInterface.sequelize.query(
      "SELECT cle FROM parametres_cabinet WHERE cle IN ('nom_cabinet', 'adresse')",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const clesExistantes = existants.map((r) => r.cle);

    const aInserer = [];
    const crypto = require('crypto');
    const uuidv4 = () => crypto.randomUUID();

    if (!clesExistantes.includes('nom_cabinet')) {
      aInserer.push({
        id: uuidv4(),
        cle: 'nom_cabinet',
        valeur: 'ZEZEPAGNON — Pharmacopée africaine',
        description: 'Nom complet du cabinet affiché sur les documents',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    if (!clesExistantes.includes('adresse')) {
      aInserer.push({
        id: uuidv4(),
        cle: 'adresse',
        valeur: 'Abidjan, Côte d\'Ivoire',
        description: 'Adresse du cabinet affichée sur les documents',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    if (aInserer.length > 0) {
      await queryInterface.bulkInsert('parametres_cabinet', aInserer);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('parametres_cabinet', {
      cle: ['nom_cabinet', 'adresse'],
    });
  },
};
