'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const ctrl = require('../controllers/bonCommandeMapaController');

const router = express.Router();
router.use(authentifier);
router.use(adminOuMedecin);

router.get('/',              asyncHandler(ctrl.lister));
router.post('/',             asyncHandler(ctrl.creer));
router.get('/:id',           asyncHandler(ctrl.obtenirParId));
router.put('/:id',           asyncHandler(ctrl.mettreAJour));
router.post('/:id/confirmer',         asyncHandler(ctrl.confirmer));
router.post('/:id/valider-livraison', asyncHandler(ctrl.validerLivraison));
router.delete('/:id',        asyncHandler(ctrl.supprimer));
router.get('/:id/pdf',       asyncHandler(ctrl.genererPdf));

module.exports = router;
