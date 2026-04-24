'use strict';

const path = require('path');
const fs = require('fs');
const { FichierPatient, Patient } = require('../models');
const config = require('../config/env');

const listerFichiers = async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const fichiers = await FichierPatient.findAll({
    where: { patient_id: patientId },
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
    order: [['created_at', 'DESC']],
  });

  res.json(fichiers);
};

const uploaderFichier = async (req, res) => {
  const { patientId } = req.params;

  if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });

  const patient = await Patient.findByPk(patientId, { attributes: ['id'] });
  if (!patient) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ message: 'Patient introuvable' });
  }

  const fichier = await FichierPatient.create({
    patient_id: patientId,
    consultation_id: req.body.consultation_id || null,
    nom_original: req.file.originalname,
    nom_stocke: req.file.filename,
    type_mime: req.file.mimetype,
    taille: req.file.size,
    categorie: req.body.categorie || 'autre',
    uploaded_by: req.utilisateur.id,
  });

  const result = await FichierPatient.findByPk(fichier.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });

  res.status(201).json(result);
};

const supprimerFichier = async (req, res) => {
  const fichier = await FichierPatient.findByPk(req.params.fichierId);
  if (!fichier) return res.status(404).json({ message: 'Fichier introuvable' });

  // Supprimer le fichier physique
  const cheminFichier = path.join(config.upload.path, fichier.nom_stocke);
  fs.unlink(cheminFichier, () => {});

  await fichier.destroy();
  res.json({ message: 'Fichier supprimé' });
};

module.exports = { listerFichiers, uploaderFichier, supprimerFichier };
