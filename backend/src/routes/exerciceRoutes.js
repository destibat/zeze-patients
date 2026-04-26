'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exerciceController');
const fichesPdf = require('../controllers/fichesPdfController');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser, seulementAdmin, adminOuMedecin, adminMedecinOuDelegue } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

// Toutes les routes nécessitent d'être authentifié
router.use(authentifier);

// ── Routes de lecture (admin + stockiste) ─────────────────────────────────────
router.get('/actuel',     adminOuMedecin, asyncHandler(ctrl.obtenirActuel));
router.get('/',           adminOuMedecin, asyncHandler(ctrl.lister));
router.get('/:id',        adminOuMedecin, asyncHandler(ctrl.obtenir));
router.get('/:id/bilan',  adminOuMedecin, asyncHandler(ctrl.obtenirBilan));

// ── Fiches PDF (admin + stockiste, sauf bilan individuel délégué) ─────────────
router.get('/:id/fiches/mapa.pdf',            adminOuMedecin,          asyncHandler(fichesPdf.ficheMapa));
router.get('/:id/fiches/detail-produits.pdf', adminOuMedecin,          asyncHandler(fichesPdf.ficheDetailProduits));
router.get('/:id/fiches/recap-delegues.pdf',  adminOuMedecin,          asyncHandler(fichesPdf.ficheRecapDelegues));
router.get('/:id/fiches/delegue/:delegueId.pdf', adminMedecinOuDelegue, asyncHandler(fichesPdf.ficheBilanDelegue));

// ── Ouverture (admin + stockiste) ─────────────────────────────────────────────
router.post('/ouvrir',    adminOuMedecin, asyncHandler(ctrl.ouvrir));

// ── Clôture (admin + stockiste) ───────────────────────────────────────────────
router.post('/:id/cloturer', adminOuMedecin, asyncHandler(ctrl.cloturer));

// ── Réouverture (admin uniquement) ───────────────────────────────────────────
router.post('/:id/rouvrir', seulementAdmin, asyncHandler(ctrl.rouvrir));

module.exports = router;
