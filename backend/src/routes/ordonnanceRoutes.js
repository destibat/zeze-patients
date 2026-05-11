'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ordonnanceController');
const { authentifier } = require('../middlewares/authenticate');
const { tousLesRoles, adminOuMedecin, adminMedecinOuDelegue } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', tousLesRoles, asyncHandler(ctrl.lister));
router.post('/directe', adminMedecinOuDelegue, asyncHandler(ctrl.creerDirecte));
router.get('/:id', tousLesRoles, asyncHandler(ctrl.obtenir));
router.put('/:id', adminMedecinOuDelegue, asyncHandler(ctrl.modifier));
router.delete('/:id', adminMedecinOuDelegue, asyncHandler(ctrl.supprimer));
router.post('/:id/valider', adminMedecinOuDelegue, asyncHandler(ctrl.valider));
router.post('/:id/renouveler', adminMedecinOuDelegue, asyncHandler(ctrl.renouveler));
router.get('/:id/pdf', tousLesRoles, asyncHandler(ctrl.genererPDF));

module.exports = router;
