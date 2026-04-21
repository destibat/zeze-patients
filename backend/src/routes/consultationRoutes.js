'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/consultationController');
const ordCtrl = require('../controllers/ordonnanceController');
const { authentifier } = require('../middlewares/authenticate');
const { tousLesRoles, adminOuMedecin, adminMedecinOuDelegue } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', tousLesRoles, asyncHandler(ctrl.listerParPatient));
router.post('/', adminMedecinOuDelegue, asyncHandler(ctrl.creer));
router.get('/:id', tousLesRoles, asyncHandler(ctrl.obtenir));
router.put('/:id', adminOuMedecin, asyncHandler(ctrl.modifier));
router.delete('/:id', adminOuMedecin, asyncHandler(ctrl.supprimer));

// Ordonnances d'une consultation
router.post('/:consultationId/ordonnances', adminMedecinOuDelegue, asyncHandler(ordCtrl.creer));

module.exports = router;
