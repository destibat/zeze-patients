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

router.get('/',                                      tousLesRoles,   asyncHandler(ctrl.listerAnalyses));
router.get('/:analyseId/pdf',                        tousLesRoles,   asyncHandler(ctrl.telechargerPdf));
router.get('/:analyseId/docx',                       tousLesRoles,   asyncHandler(ctrl.telechargerDocx));
router.get('/:analyseId',                            tousLesRoles,   asyncHandler(ctrl.obtenirAnalyse));
router.post('/extraire',            upload.array('fichiers', 10), tousLesRoles, asyncHandler(ctrl.extraireSansEnregistrer));
router.post('/analyser-documents',  upload.array('fichiers', 10), tousLesRoles, asyncHandler(ctrl.creerEtAnalyserAvecDocuments));
router.post('/',                                                   tousLesRoles, asyncHandler(ctrl.creerAnalyse));
router.post('/:analyseId/analyser',                   tousLesRoles,   asyncHandler(ctrl.analyserAvecIA));
router.put('/:analyseId/valider',                     tousLesRoles,   asyncHandler(ctrl.validerAnalyse));
router.put('/:analyseId',                             tousLesRoles,   asyncHandler(ctrl.modifierAnalyse));
router.delete('/:analyseId',                          adminOuMedecin, asyncHandler(ctrl.supprimerAnalyse));

module.exports = router;
