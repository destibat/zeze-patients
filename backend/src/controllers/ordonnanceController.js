'use strict';

const { Ordonnance, Consultation, Patient, User, Facture, Produit, StockDelegue, MouvementDelegue, Exercice, sequelize } = require('../models');
const { genererNumeroOrdonnance } = require('../services/numeroOrdonnanceService');
const { genererNumeroDossier } = require('../services/numeroDossierService');
const { getPosologie } = require('../services/posologieService');
const pdfService = require('../services/pdfService');

const getMedecinIds = async (utilisateur) => {
  const { Op } = require('sequelize');
  if (utilisateur.role === 'administrateur') return null;
  if (utilisateur.role === 'stockiste') {
    const delegues = await User.findAll({ where: { stockiste_id: utilisateur.id }, attributes: ['id'] });
    return { [Op.in]: [utilisateur.id, ...delegues.map((d) => d.id)] };
  }
  return utilisateur.id;
};

const lister = async (req, res) => {
  const { patient_id, statut, debut, fin, medecin_id } = req.query;
  const { Op } = require('sequelize');
  const where = {};
  if (patient_id) where.patient_id = patient_id;
  if (statut) where.statut = statut;
  if (debut && fin) where.date_ordonnance = { [Op.between]: [debut, fin] };
  else if (debut) where.date_ordonnance = { [Op.gte]: debut };

  const filtreMedecin = await getMedecinIds(req.utilisateur);
  if (filtreMedecin !== null) where.medecin_id = filtreMedecin;
  else if (medecin_id) where.medecin_id = medecin_id;

  const ordonnances = await Ordonnance.findAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'numero_dossier'] },
      { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom'] },
    ],
    order: [['date_ordonnance', 'DESC'], ['created_at', 'DESC']],
  });
  res.json(ordonnances);
};

const creer = async (req, res) => {
  const { consultationId } = req.params;
  const consultation = await Consultation.findByPk(consultationId, {
    include: [{ model: Patient, as: 'patient' }],
  });
  if (!consultation) return res.status(404).json({ message: 'Consultation introuvable' });

  const { lignes = [], notes } = req.body;
  const transaction = await sequelize.transaction();

  try {
    let dateOrdonnance = new Date().toISOString().split('T')[0];
    if (req.body.date_ordonnance) {
      const parsed = new Date(req.body.date_ordonnance);
      if (!isNaN(parsed.getTime())) dateOrdonnance = req.body.date_ordonnance;
    }

    await _appliquerStockEtMouvements(req, lignes, dateOrdonnance, transaction);

    const montant_total = lignes.reduce((sum, l) => sum + (l.prix_unitaire * l.quantite), 0);
    const numero = await genererNumeroOrdonnance();

    const ordonnance = await Ordonnance.create({
      numero, consultation_id: consultationId,
      patient_id: consultation.patient_id, medecin_id: req.utilisateur.id,
      date_ordonnance: dateOrdonnance, lignes, montant_total, notes, statut: 'brouillon',
    }, { transaction });

    await transaction.commit();
    res.status(201).json(ordonnance);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

const obtenir = async (req, res) => {
  const ordonnance = await Ordonnance.findByPk(req.params.id, {
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'nom', 'prenom', 'date_naissance', 'telephone', 'allergies', 'numero_dossier'],
      },
      { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom', 'telephone'] },
      {
        model: Consultation,
        as: 'consultation',
        attributes: ['id', 'date_consultation', 'motif', 'diagnostic'],
      },
    ],
  });
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });
  res.json(ordonnance);
};

const verifierPropriete = async (ordonnance, utilisateur) => {
  const { Op } = require('sequelize');
  if (utilisateur.role === 'administrateur') return true;
  if (utilisateur.role === 'stockiste') {
    const delegues = await User.findAll({ where: { stockiste_id: utilisateur.id }, attributes: ['id'] });
    const ids = [utilisateur.id, ...delegues.map((d) => d.id)];
    return ids.includes(ordonnance.medecin_id);
  }
  return ordonnance.medecin_id === utilisateur.id;
};

const verifierAbsenceFacture = async (ordonnanceId) => {
  const { Op } = require('sequelize');
  return Facture.findOne({
    where: { ordonnance_id: ordonnanceId, statut: { [Op.ne]: 'annulee' } },
  });
};

const modifier = async (req, res) => {
  const ordonnance = await Ordonnance.findByPk(req.params.id);
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });

  const estAdmin = req.utilisateur.role === 'administrateur';
  if (!(await verifierPropriete(ordonnance, req.utilisateur))) {
    return res.status(403).json({ message: 'Accès refusé : vous ne pouvez modifier que vos propres ordonnances' });
  }
  if (!estAdmin && ordonnance.statut === 'validee') {
    return res.status(409).json({ message: 'Une ordonnance validée ne peut pas être modifiée' });
  }

  const factureActive = await verifierAbsenceFacture(ordonnance.id);
  if (factureActive) {
    return res.status(409).json({
      message: `Cette ordonnance est liée à la facture ${factureActive.numero}. Annulez la facture avant de modifier l'ordonnance.`,
    });
  }

  const { lignes, notes } = req.body;
  const montant_total = (lignes || ordonnance.lignes).reduce(
    (sum, l) => sum + (l.prix_unitaire * l.quantite), 0
  );
  await ordonnance.update({ lignes: lignes || ordonnance.lignes, notes, montant_total });
  res.json(ordonnance);
};

const supprimer = async (req, res) => {
  const ordonnance = await Ordonnance.findByPk(req.params.id);
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });

  const estAdmin = req.utilisateur.role === 'administrateur';
  if (!(await verifierPropriete(ordonnance, req.utilisateur))) {
    return res.status(403).json({ message: 'Accès refusé : vous ne pouvez supprimer que vos propres ordonnances' });
  }
  if (!estAdmin && ordonnance.statut === 'validee') {
    return res.status(409).json({ message: 'Impossible de supprimer une ordonnance validée' });
  }

  const factureActive = await verifierAbsenceFacture(ordonnance.id);
  if (factureActive) {
    return res.status(409).json({
      message: `Cette ordonnance est liée à la facture ${factureActive.numero}. Annulez la facture avant de supprimer l'ordonnance.`,
    });
  }

  await ordonnance.destroy();
  res.status(204).end();
};

const genererPDF = async (req, res) => {
  const ordonnance = await Ordonnance.findByPk(req.params.id, {
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'nom', 'prenom', 'date_naissance', 'telephone', 'allergies', 'numero_dossier'],
      },
      { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom', 'telephone'] },
      {
        model: Consultation,
        as: 'consultation',
        attributes: ['id', 'date_consultation', 'motif', 'diagnostic'],
      },
    ],
  });
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });

  const posologie = getPosologie(ordonnance.patient.date_naissance);
  const pdfBuffer = await pdfService.genererOrdonnancePDF(ordonnance, posologie);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ordonnance-${ordonnance.numero}.pdf"`
  );
  res.send(pdfBuffer);
};

const valider = async (req, res) => {
  const ordonnance = await Ordonnance.findByPk(req.params.id);
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });
  if (ordonnance.statut === 'annulee') return res.status(409).json({ message: 'Impossible de valider une ordonnance annulée' });
  if (ordonnance.statut === 'validee') return res.status(409).json({ message: 'Ordonnance déjà validée' });

  if (req.utilisateur.role !== 'administrateur') {
    const { Op } = require('sequelize');
    let ids = [req.utilisateur.id];
    if (req.utilisateur.role === 'stockiste') {
      const delegues = await User.findAll({ where: { stockiste_id: req.utilisateur.id }, attributes: ['id'] });
      ids = [...ids, ...delegues.map((d) => d.id)];
    }
    if (!ids.includes(ordonnance.medecin_id)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
  }

  await ordonnance.update({ statut: 'validee' });
  res.json(ordonnance);
};

// ── Logique partagée stock + MouvementDelegue (utilisée par creer, creerDirecte, renouveler) ──
const _appliquerStockEtMouvements = async (req, lignes, dateOrdonnance, transaction) => {
  const { Op } = require('sequelize');
  for (const ligne of lignes.filter((l) => l.produit_id)) {
    if (req.utilisateur.role === 'delegue' && ligne.source === 'stock') {
      const stockPerso = await StockDelegue.findOne({
        where: { delegue_id: req.utilisateur.id, produit_id: ligne.produit_id },
        transaction, lock: true,
      });
      if (stockPerso && stockPerso.quantite > 0) {
        await stockPerso.decrement('quantite', { by: Math.min(stockPerso.quantite, ligne.quantite), transaction });
      }
    } else {
      const produit = await Produit.findByPk(ligne.produit_id, { transaction, lock: true });
      if (produit && produit.quantite_stock > 0) {
        await produit.decrement('quantite_stock', { by: Math.min(produit.quantite_stock, ligne.quantite), transaction });
      }
    }
  }

  if (req.utilisateur.role === 'delegue') {
    const lignesAchat = lignes.filter((l) => l.produit_id && l.source === 'achat');
    if (lignesAchat.length > 0) {
      const exercice = await Exercice.findOne({
        where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } }, transaction,
      });
      const delegueUser = await User.findByPk(req.utilisateur.id, { attributes: ['commission_rate', 'stockiste_id'], transaction });
      const tauxDelegue = parseFloat(delegueUser?.commission_rate ?? 15) / 100;
      let tauxTotal = 0.25;
      if (delegueUser?.stockiste_id) {
        const stockisteUser = await User.findByPk(delegueUser.stockiste_id, { attributes: ['commission_rate'], transaction });
        tauxTotal = parseFloat(stockisteUser?.commission_rate ?? 25) / 100;
      }
      for (const ligne of lignesAchat) {
        const montant_ligne = ligne.prix_unitaire * ligne.quantite;
        await MouvementDelegue.create({
          delegue_id: req.utilisateur.id, type: 'achat', statut: 'valide',
          produit_id: ligne.produit_id, quantite: ligne.quantite,
          montant_total: montant_ligne,
          gain_delegue: Math.round(montant_ligne * tauxDelegue),
          commission_stockiste: Math.round(montant_ligne * (tauxTotal - tauxDelegue)),
          date_mouvement: dateOrdonnance, exercice_id: exercice?.id ?? null,
        }, { transaction });
      }
    }
  }
};

// ── POST /ordonnances/directe — créer une ordonnance sans consultation ─────────
const creerDirecte = async (req, res) => {
  const { patient_id, patient_nom, patient_prenom, lignes = [], notes } = req.body;

  if (!patient_id && !patient_nom) {
    return res.status(400).json({ message: 'patient_id ou patient_nom requis' });
  }
  if (lignes.length === 0) {
    return res.status(400).json({ message: 'Au moins un produit est requis' });
  }

  const transaction = await sequelize.transaction();
  try {
    let patientId = patient_id;

    if (!patientId) {
      const numero_dossier = await genererNumeroDossier();
      const nom = (patient_nom || '').trim();
      const prenom = (patient_prenom || '').trim() || '—';
      const nouveauPatient = await Patient.create({
        numero_dossier, nom, prenom, created_by: req.utilisateur.id,
      }, { transaction });
      patientId = nouveauPatient.id;
    }

    const dateOrdonnance = req.body.date_ordonnance
      ? req.body.date_ordonnance
      : new Date().toISOString().split('T')[0];

    await _appliquerStockEtMouvements(req, lignes, dateOrdonnance, transaction);

    const montant_total = lignes.reduce((sum, l) => sum + (l.prix_unitaire * l.quantite), 0);
    const numero = await genererNumeroOrdonnance();

    const ordonnance = await Ordonnance.create({
      numero, consultation_id: null, patient_id: patientId,
      medecin_id: req.utilisateur.id, date_ordonnance: dateOrdonnance,
      lignes, montant_total, notes, statut: 'brouillon',
    }, { transaction });

    await transaction.commit();
    res.status(201).json(ordonnance);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

// ── POST /ordonnances/:id/renouveler ──────────────────────────────────────────
const renouveler = async (req, res) => {
  const original = await Ordonnance.findByPk(req.params.id);
  if (!original) return res.status(404).json({ message: 'Ordonnance introuvable' });

  if (!(await verifierPropriete(original, req.utilisateur))) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  // Le client peut transmettre des lignes modifiées (ex: délégué choisit la source)
  const lignesOriginal = Array.isArray(original.lignes) ? original.lignes : [];
  const lignes = (req.body.lignes && req.body.lignes.length > 0)
    ? req.body.lignes
    : lignesOriginal;
  if (lignes.length === 0) {
    return res.status(400).json({ message: 'Aucun produit dans cette ordonnance' });
  }

  const dateOrdonnance = req.body.date_ordonnance || new Date().toISOString().split('T')[0];
  const transaction = await sequelize.transaction();
  try {
    await _appliquerStockEtMouvements(req, lignes, dateOrdonnance, transaction);

    const montant_total = lignes.reduce((sum, l) => sum + (l.prix_unitaire * l.quantite), 0);
    const numero = await genererNumeroOrdonnance();

    const nouvelleOrd = await Ordonnance.create({
      numero, consultation_id: null, patient_id: original.patient_id,
      medecin_id: req.utilisateur.id, date_ordonnance: dateOrdonnance,
      lignes, montant_total, notes: original.notes, statut: 'brouillon',
    }, { transaction });

    await transaction.commit();
    res.status(201).json(nouvelleOrd);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

module.exports = { lister, creer, creerDirecte, renouveler, obtenir, modifier, supprimer, genererPDF, valider };
