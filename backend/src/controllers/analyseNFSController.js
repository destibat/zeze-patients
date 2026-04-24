'use strict';

const { AnalyseNFS, Patient } = require('../models');
const { extraireNFS } = require('../services/extractionNFSService');

const listerAnalyses = async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const analyses = await AnalyseNFS.findAll({
    where: { patient_id: patientId },
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
    order: [['date_analyse', 'DESC'], ['created_at', 'DESC']],
  });

  res.json(analyses);
};

const obtenirAnalyse = async (req, res) => {
  const analyse = await AnalyseNFS.findByPk(req.params.analyseId, {
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
    hemoglobine, hematocrite, globules_rouges, vgm, tcmh, ccmh, rdw,
    globules_blancs, neutrophiles_pct, neutrophiles_abs, lymphocytes_pct, lymphocytes_abs,
    monocytes_pct, monocytes_abs, eosinophiles_pct, eosinophiles_abs, basophiles_pct, basophiles_abs,
    plaquettes, interpretations, conclusion,
  } = req.body;

  if (!date_analyse) return res.status(400).json({ message: 'La date de l\'analyse est requise' });

  const analyse = await AnalyseNFS.create({
    patient_id: patientId,
    consultation_id: consultation_id || null,
    created_by: req.utilisateur.id,
    date_analyse,
    sexe_patient: sexe_patient || null,
    age_patient: age_patient ? parseInt(age_patient) : null,
    hemoglobine: hemoglobine ?? null,
    hematocrite: hematocrite ?? null,
    globules_rouges: globules_rouges ?? null,
    vgm: vgm ?? null,
    tcmh: tcmh ?? null,
    ccmh: ccmh ?? null,
    rdw: rdw ?? null,
    globules_blancs: globules_blancs ?? null,
    neutrophiles_pct: neutrophiles_pct ?? null,
    neutrophiles_abs: neutrophiles_abs ?? null,
    lymphocytes_pct: lymphocytes_pct ?? null,
    lymphocytes_abs: lymphocytes_abs ?? null,
    monocytes_pct: monocytes_pct ?? null,
    monocytes_abs: monocytes_abs ?? null,
    eosinophiles_pct: eosinophiles_pct ?? null,
    eosinophiles_abs: eosinophiles_abs ?? null,
    basophiles_pct: basophiles_pct ?? null,
    basophiles_abs: basophiles_abs ?? null,
    plaquettes: plaquettes ?? null,
    interpretations: interpretations || null,
    conclusion: conclusion?.trim() || null,
  });

  const result = await AnalyseNFS.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });

  res.status(201).json(result);
};

const modifierAnalyse = async (req, res) => {
  const analyse = await AnalyseNFS.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });

  await analyse.update(req.body);

  const result = await AnalyseNFS.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  res.json(result);
};

const supprimerAnalyse = async (req, res) => {
  const analyse = await AnalyseNFS.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });
  await analyse.destroy();
  res.json({ message: 'Analyse supprimée' });
};

const extraireDepuisFichier = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

  const typesAcceptes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (!typesAcceptes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Type de fichier non supporté (PDF, PNG, JPEG uniquement)' });
  }

  const { texte, valeurs } = await extraireNFS(req.file.buffer, req.file.mimetype);
  res.json({ valeurs, texte_brut: texte });
};

module.exports = { listerAnalyses, obtenirAnalyse, creerAnalyse, modifierAnalyse, supprimerAnalyse, extraireDepuisFichier };
