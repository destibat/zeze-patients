'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/analyseBioController');
const { tousLesRoles, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype);
    cb(ok ? null : new Error('Type de fichier non autorisé (PDF, PNG, JPEG)'), ok);
  },
});

router.get('/',                                 tousLesRoles,   asyncHandler(ctrl.listerAnalyses));
router.get('/:analyseId',                       tousLesRoles,   asyncHandler(ctrl.obtenirAnalyse));
router.post('/extraire', upload.single('fichier'), tousLesRoles, asyncHandler(ctrl.extraireEtSauvegarder));
router.post('/',                                tousLesRoles,   asyncHandler(ctrl.creerAnalyse));
router.put('/:analyseId',                       tousLesRoles,   asyncHandler(ctrl.modifierAnalyse));
router.delete('/:analyseId',                    adminOuMedecin, asyncHandler(ctrl.supprimerAnalyse));

module.exports = router;
