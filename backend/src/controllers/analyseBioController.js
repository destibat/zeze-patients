'use strict';

const { AnalyseBiologique, Patient, User } = require('../models');
const { extraireNFS, fusionnerValeurs } = require('../services/extractionNFSService');
const { analyserBilanAvecIA } = require('../services/analyseIAService');
const { genererPdfAnalyse } = require('../services/pdfAnalyseService');
const { genererDocxAnalyse } = require('../services/docxAnalyseService');

const PANELS_VALIDES = ['nfs', 'renal', 'glycemie', 'lipidique', 'ionogramme', 'hepatique'];

const verifierPermissionIA = async (userId) => {
  const u = await User.findByPk(userId, { attributes: ['peut_utiliser_ia'] });
  return u?.peut_utiliser_ia !== false;
};

// Garantit une date ISO YYYY-MM-DD valide, sinon retourne aujourd'hui
const dateISO = (d) => {
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime())) return d;
  return new Date().toISOString().slice(0, 10);
};

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
    patient_id:        patientId,
    consultation_id:   consultation_id || null,
    created_by:        req.utilisateur.id,
    date_analyse:      dateISO(date_analyse),
    sexe_patient:      sexe_patient || null,
    age_patient:       age_patient ? parseInt(age_patient) : null,
    panels_demandes,
    valeurs_brutes:    valeurs_brutes || {},
    source:            source || 'manuelle',
    contexte_clinique: req.body.texte_brut?.trim() || null,
    conclusion:        conclusion?.trim() || null,
  });

  // Analyse IA immédiate si demandée
  if (req.body.lancer_ia) {
    if (!await verifierPermissionIA(req.utilisateur.id)) {
      return res.status(403).json({ message: 'Accès à l\'analyse IA non autorisé pour ce compte.' });
    }
    try {
      const resultat = await analyserBilanAvecIA(analyse, { texte_brut: req.body.texte_brut || null });
      await analyse.update({
        analyse_ia_texte:  resultat.texte,
        analyse_ia_modele: resultat.modele,
        tokens_input:      resultat.tokens_input,
        tokens_output:     resultat.tokens_output,
        cout_estime_usd:   resultat.cout_estime_usd,
      });
    } catch (errIA) {
      console.error('[IA] Erreur analyse IA dans creerAnalyse:', errIA.message);
    }
  }

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

const extraireSansEnregistrer = async (req, res) => {
  const fichiers = req.files || (req.file ? [req.file] : []);
  if (!fichiers.length) return res.status(400).json({ message: 'Aucun fichier fourni' });

  const { patientId } = req.params;
  const patient = await Patient.findByPk(patientId, { attributes: ['id', 'sexe', 'date_naissance'] });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const resultats = await Promise.all(fichiers.map((f) => extraireNFS(f.buffer, f.mimetype)));
  const { meta, panelsStructures, panelsList, contexte_clinique } = fusionnerValeurs(resultats);

  const sexePatient = patient.sexe === 'masculin' ? 'M' : patient.sexe === 'feminin' ? 'F' : null;
  const sexe = sexePatient || meta.sexe_patient || null;
  const age  = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance)) / (365.25 * 864e5))
    : (meta.age_patient || null);
  const source = fichiers.some((f) => f.mimetype === 'application/pdf') ? 'upload_pdf' : 'upload_image';

  const nbValeurs = Object.values(panelsStructures).reduce(
    (total, panelVals) => total + Object.values(panelVals).filter((v) => v !== null && v !== undefined).length,
    0,
  );

  res.json({
    meta: {
      date_analyse: dateISO(meta.date_analyse),
      sexe_patient: sexe,
      age_patient:  age,
      source,
    },
    panels:     panelsList,
    valeurs:    panelsStructures,
    nb_valeurs: nbValeurs,
    a_donnees:  nbValeurs > 0,
    texte_brut: contexte_clinique || null,
  });
};

const supprimerAnalyse = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });
  await analyse.destroy();
  res.json({ message: 'Analyse supprimée' });
};

const analyserAvecIA = async (req, res) => {
  if (!await verifierPermissionIA(req.utilisateur.id)) {
    return res.status(403).json({ message: 'Accès à l\'analyse IA non autorisé pour ce compte.' });
  }
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });

  // Utilise le contexte clinique persisté (ECG, diagnostics…)
  const resultat = await analyserBilanAvecIA(analyse, { texte_brut: analyse.contexte_clinique || null });

  await analyse.update({
    analyse_ia_texte:  resultat.texte,
    analyse_ia_modele: resultat.modele,
    tokens_input:      resultat.tokens_input,
    tokens_output:     resultat.tokens_output,
    cout_estime_usd:   resultat.cout_estime_usd,
  });

  const result = await AnalyseBiologique.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  res.json(result);
};

const telechargerPdf = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });

  const patient = await Patient.findByPk(analyse.patient_id, {
    attributes: ['id', 'nom', 'prenom', 'sexe', 'date_naissance', 'numero_dossier'],
  });

  const pdfBuffer = await genererPdfAnalyse(analyse, patient);

  const nomFichier = `analyse_${patient ? patient.nom.toLowerCase() : 'patient'}_${analyse.date_analyse}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
  res.send(pdfBuffer);
};

const telechargerDocx = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });

  const patient = await Patient.findByPk(analyse.patient_id, {
    attributes: ['id', 'nom', 'prenom', 'sexe', 'date_naissance', 'numero_dossier'],
  });

  const buffer = await genererDocxAnalyse(analyse, patient);

  const nomFichier = `analyse_${patient ? patient.nom.toLowerCase() : 'patient'}_${analyse.date_analyse}.docx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
  res.send(buffer);
};

// ── Création + analyse IA avec fichiers originaux envoyés à Claude ─────────────
// Route multipart : reçoit les champs JSON + les fichiers originaux (ECG, NFS…)
// Claude reçoit à la fois les valeurs structurées ET les documents visuels
const creerEtAnalyserAvecDocuments = async (req, res) => {
  if (!await verifierPermissionIA(req.utilisateur.id)) {
    return res.status(403).json({ message: 'Accès à l\'analyse IA non autorisé pour ce compte.' });
  }
  const { patientId } = req.params;
  const patient = await Patient.findByPk(patientId, { attributes: ['id'] });
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  // Les champs arrivent comme strings (multipart)
  const date_analyse    = req.body.date_analyse;
  const sexe_patient    = req.body.sexe_patient || null;
  const age_patient     = req.body.age_patient  ? parseInt(req.body.age_patient) : null;
  const source          = req.body.source        || 'upload_pdf';
  const texte_brut      = req.body.texte_brut    || null;

  let panels_demandes, valeurs_brutes;
  try {
    panels_demandes = JSON.parse(req.body.panels_demandes || '["nfs"]');
    valeurs_brutes  = JSON.parse(req.body.valeurs_brutes  || '{}');
  } catch {
    return res.status(400).json({ message: 'panels_demandes ou valeurs_brutes invalides (JSON attendu)' });
  }

  if (!date_analyse)       return res.status(400).json({ message: 'La date de l\'analyse est requise' });
  if (!panels_demandes?.length) return res.status(400).json({ message: 'Sélectionnez au moins un panel' });

  const panelsInvalides = panels_demandes.filter((p) => !PANELS_VALIDES.includes(p));
  if (panelsInvalides.length) {
    return res.status(400).json({ message: `Panels inconnus : ${panelsInvalides.join(', ')}` });
  }

  const fichiers = (req.files || []).map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));

  const analyse = await AnalyseBiologique.create({
    patient_id:        patientId,
    created_by:        req.utilisateur.id,
    date_analyse:      dateISO(date_analyse),
    sexe_patient,
    age_patient,
    panels_demandes,
    valeurs_brutes,
    source,
    contexte_clinique: texte_brut?.trim() || null,
    conclusion:        null,
  });

  let resultat;
  try {
    // Tente avec images (ECG visible) + texte extrait des PDFs
    resultat = await analyserBilanAvecIA(analyse, { texte_brut, fichiers });
  } catch (errIA) {
    console.error('[IA] Tentative avec images échouée, fallback texte seul:', errIA.message);
    try {
      resultat = await analyserBilanAvecIA(analyse, { texte_brut });
    } catch (errFallback) {
      console.error('[IA] Fallback texte échoué:', errFallback.message);
      await analyse.destroy();
      return res.status(500).json({ message: 'Analyse IA impossible. Vérifiez les fichiers et réessayez.' });
    }
  }

  await analyse.update({
    analyse_ia_texte:  resultat.texte,
    analyse_ia_modele: resultat.modele,
    tokens_input:      resultat.tokens_input,
    tokens_output:     resultat.tokens_output,
    cout_estime_usd:   resultat.cout_estime_usd,
  });

  const result = await AnalyseBiologique.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  res.status(201).json(result);
};

const validerAnalyse = async (req, res) => {
  const analyse = await AnalyseBiologique.findByPk(req.params.analyseId);
  if (!analyse) return res.status(404).json({ message: 'Analyse introuvable' });

  await analyse.update({
    valide_par_medecin: true,
    date_validation:    new Date(),
  });

  const result = await AnalyseBiologique.findByPk(analyse.id, {
    include: [{ association: 'auteur', attributes: ['id', 'nom', 'prenom'] }],
  });
  res.json(result);
};

module.exports = { listerAnalyses, obtenirAnalyse, creerAnalyse, modifierAnalyse, supprimerAnalyse, extraireSansEnregistrer, analyserAvecIA, creerEtAnalyserAvecDocuments, telechargerPdf, telechargerDocx, validerAnalyse };
