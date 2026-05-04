'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const ctrl = require('../controllers/pretEmpruntController');

const router = express.Router();
// Tous les endpoints bloquent les délégués — adminOuMedecin = admin + stockiste uniquement
router.use(authentifier, adminOuMedecin);

router.get('/stats',      asyncHandler(ctrl.obtenirStats));
router.get('/',           asyncHandler(ctrl.lister));
router.post('/',          asyncHandler(ctrl.creer));
router.get('/:id',        asyncHandler(ctrl.obtenirParId));
router.patch('/:id/retourner', asyncHandler(ctrl.retourner));
router.patch('/:id',      asyncHandler(ctrl.modifier));
router.delete('/:id',     asyncHandler(ctrl.supprimer));

module.exports = router;
