'use strict';

const { AnalyseBiologique, Patient } = require('../models');
const { extraireNFS } = require('../services/extractionNFSService');

const PANELS_VALIDES = ['nfs', 'renal', 'glycemie', 'lipidique', 'ionogramme'];

const listerAnalyses = async (req, res) => {
  const { patientId } = req.params;
  const patient = await Patient.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const analyses = await AnalyseBiologique.findAll({
    where: { patient_id: patientId },
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
    order: [['date_analyse', 'DESC'], ['created_at', 'DESC']],
  });
  res.json(analyses);
};

const obtenirAnalyse = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });
  res.json(analyse);
};

const creerAnalyse = async (req, res) => {
  const { patientId } = req.params;
  const patient = await Patient.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const {
    consultation_id, date_analyse, sexe_patient, age_patient,
    panels_demandes, valeurs_brutes, source, conclusion,
  } = req.body;

  if (!date_analyse) return res.status(400).json({ message: 'La date de l\'analyse est requise' });
  if (!panels_demandes?.length) return res.status(400).json({ message: 'Sélectionnez au moins un panel' });

  const panelsInvalides = panels_demandes.filter((p) => !PANELS_VALIDES.includes(p));
  if (panelsInvalides.length) {
    return res.status(400).json({ message: `Panels inconnus : ${panelsInvalides.join(', ')}` });
  }

  const analyse = await AnalyseBiologique.create({
    patient_id:      patientId,
    consultation_id: consultation_id || null,
    created_by:      req.utilisateur.id,
    date_analyse,
    sexe_patient:    sexe_patient || null,
    age_patient:     age_patient ? parseInt(age_patient) : null,
    panels_demandes,
    valeurs_brutes:  valeurs_brutes || {},
    source:          source || 'manuelle',
    conclusion:      conclusion?.trim() || null,
  });

  const result = await AnalyseBiologique.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  res.status(201).json(result);
};

const modifierAnalyse = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });

  const { panels_demandes, valeurs_brutes, conclusion, sexe_patient, age_patient, date_analyse } = req.body;

  if (panels_demandes?.length) {
    const panelsInvalides = panels_demandes.filter((p) => !PANELS_VALIDES.includes(p));
    if (panelsInvalides.length) {
      return res.status(400).json({ message: `Panels inconnus : ${panelsInvalides.join(', ')}` });
    }
  }

  await analyse.update({
    ...(date_analyse && { date_analyse }),
    ...(sexe_patient !== undefined && { sexe_patient: sexe_patient || null }),
    ...(age_patient !== undefined && { age_patient: age_patient ? parseInt(age_patient) : null }),
    ...(panels_demandes && { panels_demandes }),
    ...(valeurs_brutes && { valeurs_brutes }),
    ...(conclusion !== undefined && { conclusion: conclusion?.trim() || null }),
  });

  const result = await AnalyseBiologique.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  res.json(result);
};

const extraireEtSauvegarder = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

  const { patientId } = req.params;
  const patient = await Patient.findByPk(patientId, {
    attributes: ['id', 'sexe', 'date_naissance'],
  });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const { texte, valeurs } = await extraireNFS(req.file.buffer, req.file.mimetype);

  const age = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance)) / (365.25 * 864e5))
    : (valeurs.age_patient || null);
  const sexe = patient.sexe || valeurs.sexe_patient || null;

  const { sexe_patient, age_patient, date_analyse, ...valeursNFS } = valeurs;

  const analyse = await AnalyseBiologique.create({
    patient_id:      patientId,
    created_by:      req.utilisateur.id,
    date_analyse:    date_analyse || new Date().toISOString().slice(0, 10),
    sexe_patient:    sexe,
    age_patient:     age,
    panels_demandes: ['nfs'],
    valeurs_brutes:  { nfs: valeursNFS },
    source:          req.file.mimetype === 'application/pdf' ? 'upload_pdf' : 'upload_image',
  });

  const result = await AnalyseBiologique.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });

  res.status(201).json({ analyse: result, texte_brut: texte });
};

const supprimerAnalyse = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });
  await analyse.destroy();
  res.json({ message: 'Analyse supprimée' });
};

module.exports = { listerAnalyses, obtenirAnalyse, creerAnalyse, modifierAnalyse, supprimerAnalyse, extraireEtSauvegarder };
