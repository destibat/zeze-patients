'use strict';

const express = require('express');
const router = express.Router();
const { authentifier } = require('../middlewares/authenticate');
const { seulementAdmin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const ctrl = require('../controllers/parametreController');

router.get('/', authentifier, asyncHandler(ctrl.lister));
router.put('/', authentifier, seulementAdmin, asyncHandler(ctrl.mettreAJour));

module.exports = router;
