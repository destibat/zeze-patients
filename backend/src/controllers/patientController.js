const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Patient, User, AuditLog } = require('../models');
const { genererNumeroDossier } = require('../services/numeroDossierService');
const { succes, erreur, pagine } = require('../utils/apiResponse');
const config = require('../config/env');

const journaliser = async (action, req, entiteId = null) => {
  await AuditLog.create({
    user_id: req.utilisateur?.id,
    action,
    entite: 'Patient',
    entite_id: entiteId,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
  }).catch(() => {});
};

// GET /api/patients
const listerPatients = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limite = parseInt(req.query.limite, 10) || 20;
  const { recherche, sexe, archive } = req.query;

  const where = {};

  if (archive === 'true') {
    // Scope avecArchives pour inclure les archivés
  } else {
    where.archive = false;
  }

  if (sexe) where.sexe = sexe;

  if (recherche) {
    where[Op.or] = [
      { nom: { [Op.like]: `%${recherche}%` } },
      { prenom: { [Op.like]: `%${recherche}%` } },
      { telephone: { [Op.like]: `%${recherche}%` } },
      { numero_dossier: { [Op.like]: `%${recherche}%` } },
    ];
  }

  const scope = archive === 'true' ? 'avecArchives' : null;
  const query = { where, order: [['nom', 'ASC'], ['prenom', 'ASC']], limit: limite, offset: (page - 1) * limite };

  const { count, rows } = scope
    ? await Patient.scope('avecArchives').findAndCountAll(query)
    : await Patient.findAndCountAll(query);

  return pagine(res, rows, { page, limite, total: count });
};

// GET /api/patients/:id
const obtenirPatient = async (req, res) => {
  const patient = await Patient.scope('avecArchives').findByPk(req.params.id, {
    include: [{ model: User, as: 'createur', attributes: ['id', 'nom', 'prenom'] }],
  });
  if (!patient) return erreur(res, 'Patient introuvable', 404);
  return succes(res, { ...patient.toJSON(), age: patient.getAge() });
};

// POST /api/patients
const creerPatient = async (req, res) => {
  const { nom, prenom, sexe, date_naissance, telephone, ...reste } = req.body;

  if (!nom || !prenom || !sexe || !date_naissance || !telephone) {
    return erreur(res, 'Nom, prénom, sexe, date de naissance et téléphone sont requis', 400);
  }

  const numero_dossier = await genererNumeroDossier();

  const patient = await Patient.create({
    numero_dossier,
    nom: nom.trim(),
    prenom: prenom.trim(),
    sexe,
    date_naissance,
    telephone: telephone.trim(),
    adresse: reste.adresse?.trim() || null,
    commune: reste.commune?.trim() || null,
    ville: reste.ville?.trim() || null,
    pays: reste.pays?.trim() || "Côte d'Ivoire",
    profession: reste.profession?.trim() || null,
    groupe_sanguin: reste.groupe_sanguin || null,
    allergies: reste.allergies || [],
    antecedents_personnels: reste.antecedents_personnels?.trim() || null,
    antecedents_familiaux: reste.antecedents_familiaux?.trim() || null,
    contact_urgence_nom: reste.contact_urgence_nom?.trim() || null,
    contact_urgence_telephone: reste.contact_urgence_telephone?.trim() || null,
    contact_urgence_lien: reste.contact_urgence_lien?.trim() || null,
    numero_assurance: reste.numero_assurance?.trim() || null,
    created_by: req.utilisateur?.id,
  });

  await journaliser('CREATE_PATIENT', req, patient.id);
  return succes(res, { ...patient.toJSON(), age: patient.getAge() }, 'Patient créé avec succès', 201);
};

// PUT /api/patients/:id
const modifierPatient = async (req, res) => {
  const patient = await Patient.scope('avecArchives').findByPk(req.params.id);
  if (!patient) return erreur(res, 'Patient introuvable', 404);
  if (patient.archive) return erreur(res, 'Impossible de modifier un dossier archivé', 400);

  const champs = [
    'nom', 'prenom', 'sexe', 'date_naissance', 'telephone',
    'adresse', 'commune', 'ville', 'pays', 'profession',
    'groupe_sanguin', 'allergies', 'antecedents_personnels', 'antecedents_familiaux',
    'contact_urgence_nom', 'contact_urgence_telephone', 'contact_urgence_lien',
    'numero_assurance',
  ];

  const miseAJour = {};
  champs.forEach((champ) => {
    if (req.body[champ] !== undefined) miseAJour[champ] = req.body[champ];
  });

  await patient.update(miseAJour);
  await journaliser('UPDATE_PATIENT', req, patient.id);

  return succes(res, { ...patient.toJSON(), age: patient.getAge() }, 'Dossier modifié avec succès');
};

// DELETE /api/patients/:id — Archivage soft delete
const archiverPatient = async (req, res) => {
  const patient = await Patient.scope('avecArchives').findByPk(req.params.id);
  if (!patient) return erreur(res, 'Patient introuvable', 404);

  await patient.update({ archive: true });
  await journaliser('ARCHIVE_PATIENT', req, patient.id);

  return succes(res, null, 'Dossier patient archivé');
};

// POST /api/patients/:id/photo
const uploadPhoto = async (req, res) => {
  const patient = await Patient.scope('avecArchives').findByPk(req.params.id);
  if (!patient) return erreur(res, 'Patient introuvable', 404);

  if (!req.file) return erreur(res, 'Aucun fichier reçu', 400);

  // Supprime l'ancienne photo si elle existe
  if (patient.photo_url) {
    const ancienChemin = path.join(config.upload.path, path.basename(patient.photo_url));
    if (fs.existsSync(ancienChemin)) fs.unlinkSync(ancienChemin);
  }

  const photo_url = `/uploads/${req.file.filename}`;
  await patient.update({ photo_url });

  return succes(res, { photo_url }, 'Photo mise à jour');
};

module.exports = { listerPatients, obtenirPatient, creerPatient, modifierPatient, archiverPatient, uploadPhoto };
