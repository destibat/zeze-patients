'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true }); // pour récupérer :patientId
const ctrl = require('../controllers/fichierPatientController');
const { tousLesRoles, adminOuMedecin } = require('../middlewares/authorize');
const { uploadExamen } = require('../middlewares/upload');
const { asyncHandler } = require('../middlewares/errorHandler');

// GET  /patients/:patientId/fichiers
router.get('/', tousLesRoles, asyncHandler(ctrl.listerFichiers));

// POST /patients/:patientId/fichiers  (multipart/form-data, champ "fichier")
router.post('/', tousLesRoles, uploadExamen, asyncHandler(ctrl.uploaderFichier));

// DELETE /patients/:patientId/fichiers/:fichierId
router.delete('/:fichierId', adminOuMedecin, asyncHandler(ctrl.supprimerFichier));

module.exports = router;
