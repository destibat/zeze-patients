const { User, AuditLog } = require('../models');
const { succes, erreur, pagine } = require('../utils/apiResponse');
const { Op } = require('sequelize');

const journaliser = async (action, userId, req, entiteId = null) => {
  await AuditLog.create({
    user_id: req.utilisateur?.id,
    action,
    entite: 'User',
    entite_id: entiteId,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
  }).catch(() => {});
};

// GET /api/users
const listerUtilisateurs = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limite = parseInt(req.query.limite, 10) || 20;
  const { role, actif, recherche } = req.query;

  const where = {};
  if (role) where.role = role;
  if (actif !== undefined) where.actif = actif === 'true';
  if (recherche) {
    where[Op.or] = [
      { nom: { [Op.like]: `%${recherche}%` } },
      { prenom: { [Op.like]: `%${recherche}%` } },
      { email: { [Op.like]: `%${recherche}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    order: [['nom', 'ASC'], ['prenom', 'ASC']],
    limit: limite,
    offset: (page - 1) * limite,
  });

  return pagine(res, rows, { page, limite, total: count });
};

// GET /api/users/:id
const obtenirUtilisateur = async (req, res) => {
  const utilisateur = await User.findByPk(req.params.id);
  if (!utilisateur) return erreur(res, 'Utilisateur introuvable', 404);
  return succes(res, utilisateur);
};

// POST /api/users
const creerUtilisateur = async (req, res) => {
  const { nom, prenom, email, password, role, telephone, commission_rate, stockiste_id } = req.body;

  if (!nom || !prenom || !email || !password || !role) {
    return erreur(res, 'Nom, prénom, email, mot de passe et rôle sont requis', 400);
  }

  if (password.length < 8) {
    return erreur(res, 'Le mot de passe doit contenir au moins 8 caractères', 400);
  }

  if (role === 'delegue' && !stockiste_id) {
    return erreur(res, 'Un délégué doit être rattaché à un stockiste', 400);
  }

  const existant = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existant) return erreur(res, 'Un utilisateur avec cet email existe déjà', 409);

  const nouvelUtilisateur = await User.create({
    nom: nom.trim(),
    prenom: prenom.trim(),
    email: email.toLowerCase().trim(),
    password_hash: password,
    role,
    telephone: telephone?.trim() || null,
    commission_rate: role === 'stockiste' && commission_rate != null ? parseFloat(commission_rate) : 25,
    stockiste_id: role === 'delegue' ? stockiste_id : null,
    doit_changer_mdp: true,
  });

  await journaliser('CREATE_USER', req.utilisateur?.id, req, nouvelUtilisateur.id);

  // Recharger sans le scope avecMotDePasse
  const resultat = await User.findByPk(nouvelUtilisateur.id);
  return succes(res, resultat, 'Utilisateur créé avec succès', 201);
};

// PUT /api/users/:id
const modifierUtilisateur = async (req, res) => {
  const utilisateur = await User.findByPk(req.params.id);
  if (!utilisateur) return erreur(res, 'Utilisateur introuvable', 404);

  // Un utilisateur ne peut pas modifier son propre rôle
  if (req.params.id === req.utilisateur.id && req.body.role && req.body.role !== utilisateur.role) {
    return erreur(res, 'Vous ne pouvez pas modifier votre propre rôle', 403);
  }

  const { nom, prenom, email, role, telephone, actif, commission_rate, stockiste_id } = req.body;

  const nouveauRole = role || utilisateur.role;
  if (nouveauRole === 'delegue' && !stockiste_id && !utilisateur.stockiste_id) {
    return erreur(res, 'Un délégué doit être rattaché à un stockiste', 400);
  }

  if (email && email !== utilisateur.email) {
    const existant = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existant) return erreur(res, 'Cet email est déjà utilisé', 409);
  }

  await utilisateur.update({
    nom: nom?.trim() || utilisateur.nom,
    prenom: prenom?.trim() || utilisateur.prenom,
    email: email?.toLowerCase().trim() || utilisateur.email,
    role: nouveauRole,
    telephone: telephone !== undefined ? telephone?.trim() || null : utilisateur.telephone,
    actif: actif !== undefined ? actif : utilisateur.actif,
    commission_rate: nouveauRole === 'stockiste' && commission_rate != null
      ? parseFloat(commission_rate)
      : utilisateur.commission_rate,
    stockiste_id: nouveauRole === 'delegue'
      ? (stockiste_id || utilisateur.stockiste_id)
      : null,
  });

  await journaliser('UPDATE_USER', req.utilisateur?.id, req, utilisateur.id);

  const resultat = await User.findByPk(utilisateur.id);
  return succes(res, resultat, 'Utilisateur modifié avec succès');
};

// PUT /api/users/:id/reinitialiser-mdp — Admin seulement
const reinitialiserMotDePasse = async (req, res) => {
  const utilisateur = await User.scope('avecMotDePasse').findByPk(req.params.id);
  if (!utilisateur) return erreur(res, 'Utilisateur introuvable', 404);

  const { nouveauMotDePasse } = req.body;
  if (!nouveauMotDePasse || nouveauMotDePasse.length < 8) {
    return erreur(res, 'Le nouveau mot de passe doit contenir au moins 8 caractères', 400);
  }

  await utilisateur.update({ password_hash: nouveauMotDePasse, doit_changer_mdp: true });
  await journaliser('RESET_MDP', req.utilisateur?.id, req, utilisateur.id);

  return succes(res, null, 'Mot de passe réinitialisé. L\'utilisateur devra le changer à la prochaine connexion.');
};

// DELETE /api/users/:id — Désactivation (soft delete)
const desactiverUtilisateur = async (req, res) => {
  if (req.params.id === req.utilisateur.id) {
    return erreur(res, 'Vous ne pouvez pas désactiver votre propre compte', 403);
  }

  const utilisateur = await User.findByPk(req.params.id);
  if (!utilisateur) return erreur(res, 'Utilisateur introuvable', 404);

  await utilisateur.update({ actif: false });
  await journaliser('DEACTIVATE_USER', req.utilisateur?.id, req, utilisateur.id);

  return succes(res, null, 'Utilisateur désactivé avec succès');
};

module.exports = {
  listerUtilisateurs,
  obtenirUtilisateur,
  creerUtilisateur,
  modifierUtilisateur,
  reinitialiserMotDePasse,
  desactiverUtilisateur,
};
