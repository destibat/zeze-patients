'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { lister, marquerPaye } = require('../controllers/factureAchatController');

const router = express.Router();

router.get('/',        authentifier, autoriser('administrateur', 'stockiste', 'delegue'), asyncHandler(lister));
router.patch('/:id/payer', authentifier, autoriser('administrateur', 'stockiste', 'delegue'), asyncHandler(marquerPaye));

module.exports = router;
