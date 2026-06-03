'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sequelize, User, Produit, StockDelegue } = require('../models');
const { Op } = require('sequelize');
const { getCabinetId } = require('../config/cabinetContext');

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

// GET /api/admin/consommation-ia
router.get('/consommation-ia', asyncHandler(async (req, res) => {
  const cabinetId = getCabinetId();
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const [statsMois] = await sequelize.query(`
    SELECT
      COUNT(*)                                                      AS nb_analyses,
      COALESCE(SUM(cout_estime_usd), 0)                            AS cout_mois_usd,
      COALESCE(SUM(tokens_input), 0)                               AS tokens_input_mois,
      COALESCE(SUM(tokens_output), 0)                              AS tokens_output_mois,
      SUM(CASE WHEN valide_par_medecin = 1 THEN 1 ELSE 0 END)     AS nb_validees
    FROM analyses_biologiques
    WHERE analyse_ia_texte IS NOT NULL AND created_at >= :debutMois AND cabinet_id = :cabinetId
  `, { replacements: { debutMois, cabinetId }, type: sequelize.QueryTypes.SELECT });

  const [statsTotal] = await sequelize.query(`
    SELECT
      COUNT(*)                           AS nb_total,
      COALESCE(SUM(cout_estime_usd), 0)  AS cout_total_usd
    FROM analyses_biologiques
    WHERE analyse_ia_texte IS NOT NULL AND cabinet_id = :cabinetId
  `, { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT });

  const parJour = await sequelize.query(`
    SELECT
      DATE(created_at)                   AS jour,
      COUNT(*)                           AS nb,
      COALESCE(SUM(cout_estime_usd), 0)  AS cout_usd
    FROM analyses_biologiques
    WHERE analyse_ia_texte IS NOT NULL
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND cabinet_id = :cabinetId
    GROUP BY DATE(created_at)
    ORDER BY jour ASC
  `, { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT });

  const topUtilisateurs = await sequelize.query(`
    SELECT
      u.prenom, u.nom, u.role,
      COUNT(ab.id)                           AS nb_analyses,
      COALESCE(SUM(ab.cout_estime_usd), 0)   AS cout_usd
    FROM analyses_biologiques ab
    JOIN users u ON ab.created_by = u.id
    WHERE ab.analyse_ia_texte IS NOT NULL
      AND ab.created_at >= :debutMois
      AND ab.cabinet_id = :cabinetId
    GROUP BY ab.created_by, u.prenom, u.nom, u.role
    ORDER BY nb_analyses DESC
    LIMIT 5
  `, { replacements: { debutMois, cabinetId }, type: sequelize.QueryTypes.SELECT });

  const dernieres = await sequelize.query(`
    SELECT
      ab.id, ab.date_analyse, ab.panels_demandes,
      ab.analyse_ia_modele, ab.cout_estime_usd,
      ab.tokens_input, ab.tokens_output,
      ab.valide_par_medecin, ab.created_at,
      u.prenom, u.nom
    FROM analyses_biologiques ab
    JOIN users u ON ab.created_by = u.id
    WHERE ab.analyse_ia_texte IS NOT NULL
      AND ab.cabinet_id = :cabinetId
    ORDER BY ab.created_at DESC
    LIMIT 10
  `, { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT });

  const [paramNomCabinet] = await sequelize.query(
    `SELECT valeur FROM parametres_cabinet WHERE cle = 'nom_cabinet' AND cabinet_id = :cabinetId LIMIT 1`,
    { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT },
  );

  res.json({
    nom_cabinet: paramNomCabinet?.valeur || null,
    mois: {
      nb_analyses:     Number(statsMois.nb_analyses),
      cout_usd:        Number(statsMois.cout_mois_usd),
      tokens_input:    Number(statsMois.tokens_input_mois),
      tokens_output:   Number(statsMois.tokens_output_mois),
      nb_validees:     Number(statsMois.nb_validees),
    },
    total: {
      nb_analyses: Number(statsTotal.nb_total),
      cout_usd:    Number(statsTotal.cout_total_usd),
    },
    par_jour:         parJour,
    top_utilisateurs: topUtilisateurs,
    dernieres:        dernieres,
  });
}));

module.exports = router;
