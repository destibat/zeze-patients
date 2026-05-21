'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/analyseBioController');
const { tousLesRoles, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.get('/',              tousLesRoles,   asyncHandler(ctrl.listerAnalyses));
router.get('/:analyseId',   tousLesRoles,   asyncHandler(ctrl.obtenirAnalyse));
router.post('/',             tousLesRoles,   asyncHandler(ctrl.creerAnalyse));
router.put('/:analyseId',   tousLesRoles,   asyncHandler(ctrl.modifierAnalyse));
router.delete('/:analyseId', adminOuMedecin, asyncHandler(ctrl.supprimerAnalyse));

module.exports = router;
