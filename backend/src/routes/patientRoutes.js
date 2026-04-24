const express = require('express');
const {
  listerPatients, obtenirPatient, creerPatient,
  modifierPatient, archiverPatient, uploadPhoto,
} = require('../controllers/patientController');
const { authentifier } = require('../middlewares/authenticate');
const { adminOuMedecin, tousLesRoles } = require('../middlewares/authorize');
const { uploadPhoto: uploadPhotoMiddleware } = require('../middlewares/upload');
const { asyncHandler } = require('../middlewares/errorHandler');

const consultationRoutes = require('./consultationRoutes');

const router = express.Router();

router.use(authentifier);

// Lecture : tous les rôles
router.get('/', tousLesRoles, asyncHandler(listerPatients));
router.get('/:id', tousLesRoles, asyncHandler(obtenirPatient));

// Création et modification : admin, médecin, secrétaire
router.post('/', tousLesRoles, asyncHandler(creerPatient));
router.put('/:id', tousLesRoles, asyncHandler(modifierPatient));

// Photo
router.post('/:id/photo', tousLesRoles, uploadPhotoMiddleware, asyncHandler(uploadPhoto));

// Archivage : admin et médecin seulement
router.delete('/:id', adminOuMedecin, asyncHandler(archiverPatient));

// Consultations imbriquées
router.use('/:patientId/consultations', consultationRoutes);

// Fichiers et analyses NFS imbriqués
router.use('/:patientId/fichiers', require('./fichierPatientRoutes'));
router.use('/:patientId/analyses-nfs', require('./analyseNFSRoutes'));

module.exports = router;
