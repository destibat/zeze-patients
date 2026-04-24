'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ── 1. Ajouter exercice_id sur mouvements_delegue ──────────────────────
      await queryInterface.addColumn('mouvements_delegue', 'exercice_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'exercices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      // ── 2. Ajouter exercice_id sur factures ────────────────────────────────
      await queryInterface.addColumn('factures', 'exercice_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'exercices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      // ── 3. Créer l'exercice historique ─────────────────────────────────────
      // Trouver la date la plus ancienne parmi ventes et factures existantes
      const [rowsMin] = await queryInterface.sequelize.query(
        `SELECT MIN(t) AS date_min FROM (
           SELECT MIN(created_at) AS t FROM mouvements_delegue
           UNION ALL
           SELECT MIN(created_at) AS t FROM factures
         ) sub`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      const dateMin = rowsMin?.date_min ? new Date(rowsMin.date_min) : new Date('2024-01-01');
      const maintenant = new Date();
      const historiqueId = randomUUID();

      await queryInterface.bulkInsert('exercices', [{
        id: historiqueId,
        numero: 'EX-0000-000',
        date_ouverture: dateMin,
        date_cloture: maintenant,
        statut: 'cloture',
        ouvert_par: null,
        cloture_par: null,
        rouvert_par: null,
        motif_reouverture: null,
        bilan_snapshot: JSON.stringify({ note: 'Exercice historique — données antérieures à la mise en place du suivi par exercice' }),
        created_at: maintenant,
        updated_at: maintenant,
      }], { transaction });

      // ── 4. Rattacher toutes les ventes existantes à l'exercice historique ──
      await queryInterface.sequelize.query(
        `UPDATE mouvements_delegue SET exercice_id = :id WHERE exercice_id IS NULL`,
        { replacements: { id: historiqueId }, transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE factures SET exercice_id = :id WHERE exercice_id IS NULL`,
        { replacements: { id: historiqueId }, transaction }
      );

      // ── 5. Index ────────────────────────────────────────────────────────────
      await queryInterface.addIndex('mouvements_delegue', ['exercice_id'], {
        name: 'idx_mouv_delegue_exercice',
        transaction,
      });
      await queryInterface.addIndex('factures', ['exercice_id'], {
        name: 'idx_factures_exercice',
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('mouvements_delegue', 'idx_mouv_delegue_exercice');
    await queryInterface.removeIndex('factures', 'idx_factures_exercice');
    await queryInterface.removeColumn('mouvements_delegue', 'exercice_id');
    await queryInterface.removeColumn('factures', 'exercice_id');
  },
};
