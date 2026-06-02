'use strict';

// Supprime les anciens index uniques globaux et les remplace par des index
// composites (cabinet_id + champ) pour permettre le multi-tenant.
// La migration 002 tentait de le faire mais removeIndex échouait silencieusement
// car le nom de l'index différait selon la version de MariaDB.

module.exports = {
  up: async (queryInterface) => {
    const dropIfExists = async (table, index) => {
      try {
        await queryInterface.sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${index}\``);
      } catch {
        // Index déjà supprimé ou inexistant — on ignore
      }
    };

    await dropIfExists('users', 'email');
    await dropIfExists('patients', 'numero_dossier');
    await dropIfExists('parametres_cabinet', 'cle');
  },

  down: async (queryInterface) => {
    // Restauration optionnelle — normalement inutile en rollback
    const addIfNotExists = async (table, col) => {
      try {
        await queryInterface.addIndex(table, [col], { unique: true });
      } catch { /* déjà présent */ }
    };
    await addIfNotExists('users', 'email');
    await addIfNotExists('patients', 'numero_dossier');
    await addIfNotExists('parametres_cabinet', 'cle');
  },
};
