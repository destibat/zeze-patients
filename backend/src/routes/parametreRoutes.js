'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authentifier } = require('../middlewares/authenticate');
const { seulementAdmin, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const ctrl = require('../controllers/parametreController');
const { sequelize } = require('../models');
const { chiffrer, dechiffrer, estChiffree } = require('../utils/chiffrement');

const masquerCle = (cle) => {
  if (!cle || cle.length < 8) return '••••••••';
  return cle.slice(0, 10) + '•'.repeat(Math.max(4, cle.length - 14)) + cle.slice(-4);
};

const ASSETS_DIR = path.resolve(__dirname, '../assets');

const uploadImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ASSETS_DIR),
    filename: (req, file, cb) => {
      const nom = file.fieldname === 'header' ? 'header-ordonnance.png' : 'footer-ordonnance.png';
      cb(null, nom);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype);
    cb(ok ? null : new Error('Seuls les fichiers PNG/JPEG sont acceptés'), ok);
  },
});

router.post(
  '/images-ordonnance',
  authentifier,
  adminOuMedecin,
  uploadImages.fields([{ name: 'header', maxCount: 1 }, { name: 'footer', maxCount: 1 }]),
  asyncHandler(async (req, res) => {
    const fichiers = req.files || {};
    if (!fichiers.header && !fichiers.footer) {
      return res.status(400).json({ succes: false, message: 'Aucun fichier fourni (header ou footer attendu)' });
    }
    const mis_a_jour = Object.keys(fichiers);
    res.json({ succes: true, message: `Image(s) mise(s) à jour : ${mis_a_jour.join(', ')}`, mis_a_jour });
  }),
);

router.get('/images-ordonnance', authentifier, adminOuMedecin, asyncHandler(async (req, res) => {
  const images = {};
  ['header', 'footer'].forEach(type => {
    const fichier = path.join(ASSETS_DIR, `${type}-ordonnance.png`);
    images[type] = fs.existsSync(fichier) ? { existe: true, taille: fs.statSync(fichier).size } : { existe: false };
  });
  res.json({ succes: true, images });
}));

router.get('/', authentifier, asyncHandler(ctrl.lister));
router.put('/', authentifier, seulementAdmin, asyncHandler(ctrl.mettreAJour));

// GET /api/parametres/cle-ia — statut de la clé Anthropic (masquée, jamais en clair)
router.get('/cle-ia', authentifier, seulementAdmin, asyncHandler(async (req, res) => {
  const [row] = await sequelize.query(
    `SELECT valeur FROM parametres_cabinet WHERE cle = 'anthropic_api_key' LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT },
  );
  if (!row?.valeur) {
    return res.json({ source: 'env', configuree: !!process.env.ANTHROPIC_API_KEY });
  }
  const cleEnClair = dechiffrer(row.valeur);
  res.json({
    source: 'db',
    configuree: true,
    chiffree: estChiffree(row.valeur),
    masquee: masquerCle(cleEnClair),
  });
}));

// PUT /api/parametres/cle-ia — chiffre et enregistre la clé dans la DB
router.put('/cle-ia', authentifier, seulementAdmin, asyncHandler(async (req, res) => {
  const cle = (req.body.cle || '').trim();
  if (!cle) return res.status(400).json({ message: 'Clé API requise' });
  if (!cle.startsWith('sk-ant-')) {
    return res.status(400).json({ message: 'Format invalide — la clé doit commencer par sk-ant-' });
  }
  const valeurStockee = chiffrer(cle);
  await sequelize.query(
    `INSERT INTO parametres_cabinet (id, cle, valeur, created_at, updated_at)
     VALUES (UUID(), 'anthropic_api_key', :valeur, NOW(), NOW())
     ON DUPLICATE KEY UPDATE valeur = :valeur, updated_at = NOW()`,
    { replacements: { valeur: valeurStockee } },
  );
  res.json({
    ok: true,
    source: 'db',
    configuree: true,
    chiffree: estChiffree(valeurStockee),
    masquee: masquerCle(cle),
  });
}));

// DELETE /api/parametres/cle-ia — supprime la clé de la DB (retombe sur .env)
router.delete('/cle-ia', authentifier, seulementAdmin, asyncHandler(async (req, res) => {
  await sequelize.query(`DELETE FROM parametres_cabinet WHERE cle = 'anthropic_api_key'`);
  res.json({ ok: true, source: 'env', configuree: !!process.env.ANTHROPIC_API_KEY });
}));

module.exports = router;
