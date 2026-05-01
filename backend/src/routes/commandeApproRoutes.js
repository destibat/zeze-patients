'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const ctrl = require('../controllers/commandeApproController');

const router = express.Router();
router.use(authentifier);

// Revendeur
router.get('/brouillon',         autoriser('delegue'), asyncHandler(ctrl.obtenirBrouillon));
router.put('/brouillon/lignes',  autoriser('delegue'), asyncHandler(ctrl.mettreAJourLignes));
router.post('/brouillon/envoyer', autoriser('delegue'), asyncHandler(ctrl.envoyer));
router.delete('/brouillon',      autoriser('delegue'), asyncHandler(ctrl.supprimerBrouillon));

// Tous (résultat filtré par rôle)
router.get('/', authentifier, asyncHandler(ctrl.lister));

// Stockiste / Admin
router.post('/:id/valider', adminOuMedecin, asyncHandler(ctrl.valider));
router.post('/:id/refuser', adminOuMedecin, asyncHandler(ctrl.refuser));

module.exports = router;
