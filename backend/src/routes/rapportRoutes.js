'use strict';

const express = require('express');
const { authentifier } = require('../middlewares/authenticate');
const { autoriser } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');
const { genererRapportMensuel } = require('../controllers/rapportController');

const router = express.Router();

router.use(authentifier);
router.use(autoriser('administrateur', 'stockiste'));

router.get('/mensuel', asyncHandler(genererRapportMensuel));

module.exports = router;
