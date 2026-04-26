const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// Limiteur général pour toutes les routes API
// En développement, le rate limiting est désactivé (polling HMR + hooks multiples)
const limiteurGeneral = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'development',
  message: {
    succes: false,
    message: 'Trop de requêtes, veuillez réessayer dans quelques minutes.',
  },
});

// Limiteur strict pour les routes d'authentification (anti-brute-force)
const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte que les échecs
  message: {
    succes: false,
    message: 'Trop de tentatives de connexion. Veuillez attendre 15 minutes.',
  },
});

module.exports = { limiteurGeneral, limiteurAuth };
