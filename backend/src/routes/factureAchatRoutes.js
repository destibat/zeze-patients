'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { lister, marquerEnvoye, marquerPaye, telechargerPdf } = require('../controllers/factureAchatController');

const router = express.Router();

router.get('/',               authentifier, autoriser('administrateur', 'stockiste', 'delegue'), asyncHandler(lister));
router.get('/:id/pdf',        authentifier, autoriser('administrateur', 'stockiste', 'delegue'), asyncHandler(telechargerPdf));
router.patch('/:id/envoyer',  authentifier, autoriser('delegue'),                                asyncHandler(marquerEnvoye));
router.patch('/:id/payer',    authentifier, autoriser('administrateur', 'stockiste'),             asyncHandler(marquerPaye));

module.exports = router;
