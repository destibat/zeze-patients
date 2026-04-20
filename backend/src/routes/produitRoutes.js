'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/produitController');
const { authentifier } = require('../middlewares/authenticate');
const { adminOuMedecin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', asyncHandler(ctrl.lister));
router.get('/:id', asyncHandler(ctrl.obtenir));
router.post('/', adminOuMedecin, asyncHandler(ctrl.creer));
router.put('/:id', adminOuMedecin, asyncHandler(ctrl.modifier));

module.exports = router;
