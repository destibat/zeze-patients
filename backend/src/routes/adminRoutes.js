'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sequelize, User, Produit, StockDelegue } = require('../models');

const router = express.Router();
router.use(authentifier, autoriser('administrateur'));

// POST /api/admin/reset
// Remet tout à zéro. Conserve uniquement : users, patients, produits (catalogue), parametres_cabinet.
router.post('/reset', asyncHandler(async (req, res) => {
  await sequelize.transaction(async (t) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

    const tables = [
      'prets_emprunts',
      'audit_logs',
      'fichiers_patient',
      'analyses_nfs',
      'analyses_biologiques',
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

// POST /api/admin/reset-stock-delegues
// Vide le stock de tous les revendeurs et le réinitialise avec N unités par produit actif.
router.post('/reset-stock-delegues', asyncHandler(async (req, res) => {
  const unites = Math.max(0, parseInt(req.body.unites_par_produit ?? 5, 10) || 0);

  await sequelize.transaction(async (t) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
    await sequelize.query('TRUNCATE TABLE `stock_delegue`', { transaction: t });
    await sequelize.query('TRUNCATE TABLE `mouvements_delegue`', { transaction: t });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });

    if (unites > 0) {
      const delegues = await User.findAll({ where: { role: 'delegue' }, attributes: ['id'], transaction: t });
      const produits = await Produit.findAll({ where: { actif: true }, attributes: ['id'], transaction: t });
      const entrees = [];
      for (const d of delegues) {
        for (const p of produits) {
          entrees.push({ delegue_id: d.id, produit_id: p.id, quantite: unites });
        }
      }
      if (entrees.length) await StockDelegue.bulkCreate(entrees, { transaction: t });
    }
  });

  res.json({
    ok: true,
    message: unites > 0
      ? `Stock des revendeurs réinitialisé : ${unites} unité(s) par produit actif.`
      : 'Stock des revendeurs vidé (aucune unité redistribuée).',
  });
}));

module.exports = router;
