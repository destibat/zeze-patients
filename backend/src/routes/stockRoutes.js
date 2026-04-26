'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockController');
const { authentifier } = require('../middlewares/authenticate');
const { adminOuMedecin, tousLesRoles } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', tousLesRoles, asyncHandler(ctrl.listerProduits));
router.get('/alertes', tousLesRoles, asyncHandler(ctrl.alertes));
router.get('/:produitId/mouvements', tousLesRoles, asyncHandler(ctrl.obtenirMouvements));
router.post('/:produitId/mouvements', adminOuMedecin, asyncHandler(ctrl.enregistrerMouvement));
router.put('/:produitId/seuil', adminOuMedecin, asyncHandler(ctrl.mettreAJourSeuil));

module.exports = router;
