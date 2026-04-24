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

module.exports = router;
