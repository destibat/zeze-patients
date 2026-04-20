const express = require('express');
const { connexion, rafraichirToken, deconnexion, moi, changerMotDePasse } = require('../controllers/authController');
const { authentifier } = require('../middlewares/authenticate');
const { limiteurAuth } = require('../middlewares/rateLimiter');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Routes publiques (avec limitation anti-brute-force)
router.post('/login', limiteurAuth, asyncHandler(connexion));
router.post('/refresh', asyncHandler(rafraichirToken));
router.post('/logout', asyncHandler(deconnexion));

// Routes protégées
router.get('/me', authentifier, asyncHandler(moi));
router.put('/changer-mdp', authentifier, asyncHandler(changerMotDePasse));

module.exports = router;
