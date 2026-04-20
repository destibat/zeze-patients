const { User, AuditLog } = require('../models');
const { genererAccessToken, genererRefreshToken, verifierRefreshToken, revoquerRefreshToken } = require('../services/tokenService');
const { succes, erreur } = require('../utils/apiResponse');
const logger = require('../config/logger');

// Enregistre une action dans le journal d'audit
const journaliser = async (action, userId, req, estSucces = true, details = null) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      succes: estSucces,
      details,
    });
  } catch (err) {
    logger.error('Erreur journalisation audit :', err);
  }
};

// POST /api/auth/login
const connexion = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return erreur(res, 'Email et mot de passe requis', 400);
  }

  // Scope avecMotDePasse pour récupérer le hash
  const utilisateur = await User.scope('avecMotDePasse').findOne({ where: { email: email.toLowerCase() } });

  if (!utilisateur || !utilisateur.actif) {
    await journaliser('LOGIN_ECHEC', null, req, false, { email });
    // Message volontairement vague pour ne pas indiquer si l'email existe
    return erreur(res, 'Identifiants incorrects', 401);
  }

  const motDePasseValide = await utilisateur.verifierMotDePasse(password);
  if (!motDePasseValide) {
    await journaliser('LOGIN_ECHEC', utilisateur.id, req, false);
    return erreur(res, 'Identifiants incorrects', 401);
  }

  // Mise à jour de la dernière connexion
  await utilisateur.update({ derniere_connexion: new Date() });

  const accessToken = genererAccessToken(utilisateur);
  const refreshToken = await genererRefreshToken(utilisateur, req.ip, req.headers['user-agent']);

  await journaliser('LOGIN', utilisateur.id, req);

  const donnees = {
    accessToken,
    refreshToken,
    utilisateur: {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      role: utilisateur.role,
      doitChangerMdp: utilisateur.doit_changer_mdp,
    },
  };

  return succes(res, donnees, 'Connexion réussie');
};

// POST /api/auth/refresh
const rafraichirToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return erreur(res, 'Refresh token manquant', 400);
  }

  const enregistrement = await verifierRefreshToken(refreshToken);

  if (!enregistrement) {
    return erreur(res, 'Refresh token invalide ou expiré', 401);
  }

  const utilisateur = await User.findByPk(enregistrement.user_id);

  if (!utilisateur || !utilisateur.actif) {
    return erreur(res, 'Utilisateur introuvable ou désactivé', 401);
  }

  // Rotation du refresh token : on révoque l'ancien et on en génère un nouveau
  await revoquerRefreshToken(refreshToken);
  const nouveauAccessToken = genererAccessToken(utilisateur);
  const nouveauRefreshToken = await genererRefreshToken(utilisateur, req.ip, req.headers['user-agent']);

  return succes(res, {
    accessToken: nouveauAccessToken,
    refreshToken: nouveauRefreshToken,
  }, 'Token rafraîchi');
};

// POST /api/auth/logout
const deconnexion = async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revoquerRefreshToken(refreshToken);
  }

  if (req.utilisateur) {
    await journaliser('LOGOUT', req.utilisateur.id, req);
  }

  return succes(res, null, 'Déconnexion réussie');
};

// GET /api/auth/me
const moi = async (req, res) => {
  const utilisateur = await User.findByPk(req.utilisateur.id);

  if (!utilisateur) {
    return erreur(res, 'Utilisateur introuvable', 404);
  }

  return succes(res, utilisateur);
};

// PUT /api/auth/changer-mdp
const changerMotDePasse = async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;

  if (!ancienMotDePasse || !nouveauMotDePasse) {
    return erreur(res, 'Ancien et nouveau mot de passe requis', 400);
  }

  if (nouveauMotDePasse.length < 8) {
    return erreur(res, 'Le nouveau mot de passe doit contenir au moins 8 caractères', 400);
  }

  const utilisateur = await User.scope('avecMotDePasse').findByPk(req.utilisateur.id);
  const valide = await utilisateur.verifierMotDePasse(ancienMotDePasse);

  if (!valide) {
    return erreur(res, 'Ancien mot de passe incorrect', 400);
  }

  await utilisateur.update({
    password_hash: nouveauMotDePasse,
    doit_changer_mdp: false,
  });

  await journaliser('CHANGEMENT_MDP', utilisateur.id, req);

  return succes(res, null, 'Mot de passe modifié avec succès');
};

module.exports = { connexion, rafraichirToken, deconnexion, moi, changerMotDePasse };
