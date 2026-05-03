'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const ctrl = require('../controllers/commandeApproController');

const router = express.Router();
router.use(authentifier);

// Revendeur — brouillon manuel
router.get('/brouillon',          autoriser('delegue'), asyncHandler(ctrl.obtenirBrouillon));
router.put('/brouillon/lignes',   autoriser('delegue'), asyncHandler(ctrl.mettreAJourLignes));
router.post('/brouillon/envoyer', autoriser('delegue'), asyncHandler(ctrl.envoyer));
router.delete('/brouillon',       autoriser('delegue'), asyncHandler(ctrl.supprimerBrouillon));

// Tous (résultat filtré par rôle)
router.get('/', asyncHandler(ctrl.lister));

// Revendeur — commande auto-générée par ID
router.get('/:id',               autoriser('delegue', 'stockiste', 'administrateur'), asyncHandler(ctrl.obtenirParId));
router.put('/:id/lignes',        autoriser('delegue'), asyncHandler(ctrl.mettreAJourLignesParId));
router.post('/:id/envoyer',      autoriser('delegue'), asyncHandler(ctrl.envoyerParId));

// Stockiste / Admin
router.post('/:id/valider', adminOuMedecin, asyncHandler(ctrl.valider));
router.post('/:id/refuser', adminOuMedecin, asyncHandler(ctrl.refuser));

module.exports = router;
