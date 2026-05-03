'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sequelize } = require('../models');

const router = express.Router();
router.use(authentifier, autoriser('administrateur'));

// POST /api/admin/reset
// Supprime toutes les données transactionnelles sans toucher aux utilisateurs ni aux patients.
router.post('/reset', asyncHandler(async (req, res) => {
  await sequelize.transaction(async (t) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

    const tables = [
      'factures_achat',
      'commandes_approvisionnement',
      'mouvements_delegue',
      'stock_delegue',
      'stock_mouvements',
      'factures',
      'ordonnances',
    ];
    for (const table of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\``, { transaction: t });
    }

    await sequelize.query('UPDATE produits SET quantite_stock = 0', { transaction: t });

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
  });

  res.json({
    ok: true,
    message: 'Remise à zéro effectuée.',
    tables_videes: ['ordonnances', 'factures', 'factures_achat', 'commandes_approvisionnement', 'mouvements_delegue', 'stock_delegue', 'stock_mouvements'],
    reinitialise: ['produits.quantite_stock → 0'],
    conserve: ['users', 'patients', 'consultations', 'rendez_vous', 'produits (catalogue)', 'parametres_cabinet'],
  });
}));

module.exports = router;
