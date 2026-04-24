'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exerciceController');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser, seulementAdmin, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

// Toutes les routes nécessitent d'être authentifié
router.use(authentifier);

// ── Routes de lecture (admin + stockiste) ─────────────────────────────────────
router.get('/actuel',     adminOuMedecin, asyncHandler(ctrl.obtenirActuel));
router.get('/',           adminOuMedecin, asyncHandler(ctrl.lister));
router.get('/:id',        adminOuMedecin, asyncHandler(ctrl.obtenir));
router.get('/:id/bilan',  adminOuMedecin, asyncHandler(ctrl.obtenirBilan));

// ── Ouverture (admin + stockiste) ─────────────────────────────────────────────
router.post('/ouvrir',    adminOuMedecin, asyncHandler(ctrl.ouvrir));

// ── Clôture (admin + stockiste) ───────────────────────────────────────────────
router.post('/:id/cloturer', adminOuMedecin, asyncHandler(ctrl.cloturer));

// ── Réouverture (admin uniquement) ───────────────────────────────────────────
router.post('/:id/rouvrir', seulementAdmin, asyncHandler(ctrl.rouvrir));

module.exports = router;
