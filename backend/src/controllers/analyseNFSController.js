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

  const dec = (v) => (v !== null && v !== undefined && v !== '') ? parseFloat(v) : null;

  const analyse = await AnalyseNFS.create({
    patient_id: patientId,
    consultation_id: consultation_id || null,
    created_by: req.utilisateur.id,
    date_analyse,
    sexe_patient: sexe_patient || null,
    age_patient: age_patient ? parseInt(age_patient) : null,
    hemoglobine: dec(hemoglobine),
    hematocrite: dec(hematocrite),
    globules_rouges: dec(globules_rouges),
    vgm: dec(vgm),
    tcmh: dec(tcmh),
    ccmh: dec(ccmh),
    rdw: dec(rdw),
    globules_blancs: dec(globules_blancs),
    neutrophiles_pct: dec(neutrophiles_pct),
    neutrophiles_abs: dec(neutrophiles_abs),
    lymphocytes_pct: dec(lymphocytes_pct),
    lymphocytes_abs: dec(lymphocytes_abs),
    monocytes_pct: dec(monocytes_pct),
    monocytes_abs: dec(monocytes_abs),
    eosinophiles_pct: dec(eosinophiles_pct),
    eosinophiles_abs: dec(eosinophiles_abs),
    basophiles_pct: dec(basophiles_pct),
    basophiles_abs: dec(basophiles_abs),
    plaquettes: dec(plaquettes),
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

  const dec = (v) => (v !== null && v !== undefined && v !== '') ? parseFloat(v) : null;
  const champsNumeriques = [
    'hemoglobine', 'hematocrite', 'globules_rouges', 'vgm', 'tcmh', 'ccmh', 'rdw',
    'globules_blancs', 'neutrophiles_pct', 'neutrophiles_abs', 'lymphocytes_pct', 'lymphocytes_abs',
    'monocytes_pct', 'monocytes_abs', 'eosinophiles_pct', 'eosinophiles_abs',
    'basophiles_pct', 'basophiles_abs', 'plaquettes',
  ];
  const corps = { ...req.body };
  // Champs jamais modifiables par le client (mass assignment : cabinet_id
  // modifié = rupture d'isolation multi-tenant, created_by = falsification d'auteur)
  delete corps.id;
  delete corps.cabinet_id;
  delete corps.patient_id;
  delete corps.created_by;
  for (const champ of champsNumeriques) {
    if (champ in corps) corps[champ] = dec(corps[champ]);
  }

  await analyse.update(corps);

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
