'use strict';

// Ce fichier ne doit JAMAIS être chargé en production.
// La protection est assurée dans index.js (chargement conditionnel)
// ET par le middleware ci-dessous (double garde).

const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

const devSeulement = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Interdit hors développement' });
  }
  next();
};

// POST /api/dev/reset
// Vide toutes les données de test. Les utilisateurs, produits et paramètres sont conservés.
router.post('/reset', devSeulement, async (req, res) => {
  await sequelize.transaction(async (t) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

    const tables = [
      'ordonnances',
      'factures',
      'rendez_vous',
      'consultations',
      'patients',
      'mouvements_delegue',
      'stock_delegue',
      'stock_mouvements',
    ];
    for (const table of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\``, { transaction: t });
    }

    // Remet le stock de chaque produit à zéro (quantite_stock est dans produits, pas dans stock_mouvements)
    await sequelize.query('UPDATE produits SET quantite_stock = 0', { transaction: t });

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
  });

  res.json({
    ok: true,
    message: 'Tables vidées : patients, consultations, ordonnances, factures, rendez_vous, mouvements_delegue, stock_delegue, stock_mouvements — quantite_stock remis à 0',
    tables_preservees: ['users', 'produits (structure)', 'parametres_cabinet'],
  });
});

module.exports = router;
