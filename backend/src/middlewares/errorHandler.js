const logger = require('../config/logger');

// Gestionnaire d'erreurs global Express (4 paramètres obligatoires)
const gestionErreurs = (err, req, res, next) => {
  logger.error(`${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Erreurs de validation Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors?.map((e) => e.message) || [err.message];
    return res.status(422).json({ succes: false, message: 'Données invalides', details: messages });
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ succes: false, message: 'Token invalide ou expiré' });
  }

  // Erreur générique
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode < 500 ? err.message : 'Erreur interne du serveur';

  return res.status(statusCode).json({ succes: false, message });
};

// Capture les erreurs async sans try/catch explicite
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { gestionErreurs, asyncHandler };
