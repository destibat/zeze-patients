'use strict';

// ID stable pour le cabinet dev — facilite les seeds et tests
const DEV_CABINET_ID = '00000000-0000-4000-a000-000000000001';

// Tables qui reçoivent cabinet_id
const TABLES = [
  'users', 'refresh_tokens', 'audit_logs',
  'patients', 'produits', 'consultations', 'ordonnances',
  'stock_mouvements', 'rendez_vous', 'factures',
  'parametres_cabinet', 'stock_delegue', 'mouvements_delegue',
  'fichiers_patient', 'analyses_nfs', 'analyses_biologiques',
  'exercices', 'factures_achat', 'commandes_approvisionnement',
  'prets_emprunts',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Cabinet dev
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO cabinets (id, slug, domaine, nom, actif, created_at, updated_at)
      VALUES (
        '${DEV_CABINET_ID}',
        'dev',
        'dev.zezepagnon.solutions',
        'Cabinet Développement',
        1,
        NOW(),
        NOW()
      )
    `);

    // 2. Ajouter cabinet_id à toutes les tables
    for (const table of TABLES) {
      await queryInterface.addColumn(table, 'cabinet_id', {
        type: Sequelize.UUID,
        allowNull: true,
        after: 'id',
        references: { model: 'cabinets', key: 'id' },
        onDelete: 'CASCADE',
      });
    }

    // 3. Backfill : toutes les données existantes appartiennent au cabinet dev
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `UPDATE \`${table}\` SET cabinet_id = '${DEV_CABINET_ID}' WHERE cabinet_id IS NULL`
      );
    }

    // 4. Rendre cabinet_id NOT NULL après backfill
    for (const table of TABLES) {
      await queryInterface.changeColumn(table, 'cabinet_id', {
        type: Sequelize.UUID,
        allowNull: false,
      });
    }

    // 5. Corriger les contraintes d'unicité — de globales à par-cabinet

    // users.email : unique par cabinet
    await queryInterface.removeIndex('users', ['email']).catch(() => {});
    await queryInterface.addIndex('users', ['cabinet_id', 'email'], {
      unique: true,
      name: 'users_cabinet_email_unique',
    });

    // patients.numero_dossier : unique par cabinet
    await queryInterface.removeIndex('patients', ['numero_dossier']).catch(() => {});
    await queryInterface.addIndex('patients', ['cabinet_id', 'numero_dossier'], {
      unique: true,
      name: 'patients_cabinet_numero_dossier_unique',
    });

    // parametres_cabinet.cle : unique par cabinet
    await queryInterface.removeIndex('parametres_cabinet', ['cle']).catch(() => {});
    await queryInterface.addIndex('parametres_cabinet', ['cabinet_id', 'cle'], {
      unique: true,
      name: 'parametres_cabinet_cle_unique',
    });
  },

  down: async (queryInterface) => {
    // Restaurer les anciens index uniques
    await queryInterface.addIndex('users', ['email'], { unique: true }).catch(() => {});
    await queryInterface.addIndex('patients', ['numero_dossier'], { unique: true }).catch(() => {});
    await queryInterface.addIndex('parametres_cabinet', ['cle'], { unique: true }).catch(() => {});

    // Supprimer cabinet_id de toutes les tables
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, 'cabinet_id').catch(() => {});
    }

    await queryInterface.sequelize.query(
      `DELETE FROM cabinets WHERE id = '${DEV_CABINET_ID}'`
    );
  },
};
