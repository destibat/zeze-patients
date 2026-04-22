'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockDelegueController');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

// Routes réservées aux délégués
router.get('/',              autoriser('delegue'), asyncHandler(ctrl.listerMonStock));
router.post('/acheter',      autoriser('delegue'), asyncHandler(ctrl.acheter));
router.post('/vendre',       autoriser('delegue'), asyncHandler(ctrl.vendre));
router.get('/ventes',        autoriser('delegue'), asyncHandler(ctrl.listerMesVentes));
router.get('/stats',         autoriser('delegue'), asyncHandler(ctrl.obtenirStatsStock));

// Gains, ventes directes et validation — admin et stockiste uniquement
router.get('/gains-delegues',    adminOuMedecin, asyncHandler(ctrl.obtenirGainsDelegues));
router.get('/ventes-directes',   adminOuMedecin, asyncHandler(ctrl.ventesDirectesDelegues));
router.get('/ventes-en-attente', adminOuMedecin, asyncHandler(ctrl.ventesEnAttente));
router.put('/:id/valider',       adminOuMedecin, asyncHandler(ctrl.validerVente));
router.put('/:id/refuser',       adminOuMedecin, asyncHandler(ctrl.refuserVente));

module.exports = router;
