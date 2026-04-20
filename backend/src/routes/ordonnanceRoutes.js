'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ordonnanceController');
const { authentifier } = require('../middlewares/authenticate');
const { tousLesRoles, adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', tousLesRoles, asyncHandler(ctrl.lister));
router.get('/:id', tousLesRoles, asyncHandler(ctrl.obtenir));
router.put('/:id', adminOuMedecin, asyncHandler(ctrl.modifier));
router.get('/:id/pdf', tousLesRoles, asyncHandler(ctrl.genererPDF));

module.exports = router;
