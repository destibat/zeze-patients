const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { erreur } = require('../utils/apiResponse');

// Vérifie le JWT dans l'en-tête Authorization: Bearer <token>
const authentifier = (req, res, next) => {
  const entete = req.headers['authorization'];

  if (!entete || !entete.startsWith('Bearer ')) {
    return erreur(res, 'Token d\'authentification manquant', 401);
  }

  const token = entete.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.utilisateur = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return erreur(res, 'Session expirée, veuillez vous reconnecter', 401);
    }
    return erreur(res, 'Token invalide', 401);
  }
};

module.exports = { authentifier };
