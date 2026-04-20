'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/factureController');
const { authentifier } = require('../middlewares/authenticate');
const { tousLesRoles, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', tousLesRoles, asyncHandler(ctrl.lister));
router.get('/:id', tousLesRoles, asyncHandler(ctrl.obtenir));
router.post('/depuis-ordonnance/:ordonnanceId', tousLesRoles, asyncHandler(ctrl.creerDepuisOrdonnance));
router.post('/:id/paiement', tousLesRoles, asyncHandler(ctrl.enregistrerPaiement));
router.post('/:id/annuler', adminOuMedecin, asyncHandler(ctrl.annuler));

module.exports = router;
