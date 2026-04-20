const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshToken } = require('../models');
const config = require('../config/env');
const logger = require('../config/logger');

// Durée du refresh token en millisecondes (7 jours par défaut)
const parsedureeMs = (duree) => {
  const unite = duree.slice(-1);
  const valeur = parseInt(duree.slice(0, -1), 10);
  const unites = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return valeur * (unites[unite] || 1000);
};

const genererAccessToken = (utilisateur) => {
  return jwt.sign(
    {
      id: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const genererRefreshToken = async (utilisateur, ip, userAgent) => {
  // Génère un token aléatoire sécurisé
  const tokenBrut = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenBrut).digest('hex');

  const expiresAt = new Date(Date.now() + parsedureeMs(config.jwt.refreshExpiresIn));

  await RefreshToken.create({
    user_id: utilisateur.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_origine: ip,
    user_agent: userAgent,
  });

  return tokenBrut;
};

const verifierRefreshToken = async (tokenBrut) => {
  const tokenHash = crypto.createHash('sha256').update(tokenBrut).digest('hex');

  const enregistrement = await RefreshToken.findOne({
    where: { token_hash: tokenHash, revoque: false },
  });

  if (!enregistrement) {
    return null;
  }

  if (enregistrement.expires_at < new Date()) {
    // Token expiré : on le supprime
    await enregistrement.destroy();
    return null;
  }

  return enregistrement;
};

const revoquerRefreshToken = async (tokenBrut) => {
  const tokenHash = crypto.createHash('sha256').update(tokenBrut).digest('hex');
  const modifie = await RefreshToken.update(
    { revoque: true },
    { where: { token_hash: tokenHash } }
  );
  return modifie[0] > 0;
};

const revoquerTousLesTokensUtilisateur = async (userId) => {
  await RefreshToken.update(
    { revoque: true },
    { where: { user_id: userId } }
  );
  logger.info(`Tous les refresh tokens révoqués pour l'utilisateur ${userId}`);
};

module.exports = {
  genererAccessToken,
  genererRefreshToken,
  verifierRefreshToken,
  revoquerRefreshToken,
  revoquerTousLesTokensUtilisateur,
};
