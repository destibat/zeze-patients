'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sequelize } = require('../models');

const router = express.Router();
router.use(authentifier, autoriser('administrateur'));

// POST /api/admin/reset
// Remet tout à zéro. Conserve uniquement : users, patients, produits (catalogue), parametres_cabinet.
router.post('/reset', asyncHandler(async (req, res) => {
  await sequelize.transaction(async (t) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

    const tables = [
      'audit_logs',
      'fichiers_patient',
      'analyses_nfs',
      'factures_achat',
      'commandes_approvisionnement',
      'mouvements_delegue',
      'stock_delegue',
      'factures',
      'ordonnances',
      'rendez_vous',
      'consultations',
      'exercices',
    ];
    for (const table of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\``, { transaction: t });
    }

    // Remet le stock à 20 pour tous les produits actifs
    await sequelize.query('UPDATE produits SET quantite_stock = 20 WHERE actif = 1', { transaction: t });

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
  });

  res.json({
    ok: true,
    message: 'Remise à zéro complète effectuée.',
    tables_videes: [
      'consultations', 'rendez_vous', 'ordonnances', 'factures',
      'factures_achat', 'commandes_approvisionnement', 'mouvements_delegue',
      'exercices', 'analyses_nfs', 'fichiers_patient', 'audit_logs',
    ],
    reinitialise: ['produits actifs : quantite_stock → 20', 'stock_delegue → vidé'],
    conserve: ['users', 'patients', 'produits (catalogue)', 'stock_mouvements', 'parametres_cabinet'],
  });
}));

module.exports = router;
