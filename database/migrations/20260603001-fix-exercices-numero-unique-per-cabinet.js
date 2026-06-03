'use strict';

// L'index unique global sur exercices.numero empêche deux cabinets d'avoir
// le même numéro (ex. EX-2026-001). On le remplace par un index composite
// (cabinet_id, numero) pour que l'unicité soit par cabinet.

module.exports = {
  up: async (queryInterface) => {
    const dropIfExists = async (table, index) => {
      try {
        await queryInterface.sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${index}\``);
      } catch {
        // Index absent ou déjà supprimé
      }
    };

    await dropIfExists('exercices', 'numero');

    await queryInterface.addIndex('exercices', ['cabinet_id', 'numero'], {
      unique: true,
      name: 'exercices_cabinet_numero_unique',
    });
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeIndex('exercices', 'exercices_cabinet_numero_unique');
    } catch { /* */ }
    await queryInterface.addIndex('exercices', ['numero'], { unique: true });
  },
};
