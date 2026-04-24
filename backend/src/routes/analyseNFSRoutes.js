'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true }); // pour récupérer :patientId
const ctrl = require('../controllers/analyseNFSController');
const { adminOuMedecin } = require('../middlewares/authorize'); // stockiste + admin
const { asyncHandler } = require('../middlewares/errorHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype);
    cb(ok ? null : new Error('Type de fichier non autorisé'), ok);
  },
});

// Route d'extraction depuis fichier (upload en mémoire, pas de sauvegarde)
router.post('/extraire', adminOuMedecin, upload.single('fichier'), asyncHandler(ctrl.extraireDepuisFichier));

// Toutes les routes NFS réservées aux stockistes et admins
router.get('/', adminOuMedecin, asyncHandler(ctrl.listerAnalyses));
router.get('/:analyseId', adminOuMedecin, asyncHandler(ctrl.obtenirAnalyse));
router.post('/', adminOuMedecin, asyncHandler(ctrl.creerAnalyse));
router.put('/:analyseId', adminOuMedecin, asyncHandler(ctrl.modifierAnalyse));
router.delete('/:analyseId', adminOuMedecin, asyncHandler(ctrl.supprimerAnalyse));

module.exports = router;
