'use strict';

const { Ordonnance, Consultation, Patient, User, StockDelegue, Facture, Produit, sequelize } = require('../models');
const { genererNumeroOrdonnance } = require('../services/numeroOrdonnanceService');
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
    if (req.utilisateur.role === 'delegue') {
      for (const ligne of lignes.filter((l) => l.source === 'stock')) {
        const item = await StockDelegue.findOne({
          where: { delegue_id: req.utilisateur.id, produit_id: ligne.produit_id },
          transaction,
          lock: true,
        });
        if (!item || item.quantite < ligne.quantite) {
          await transaction.rollback();
          return res.status(422).json({ message: `Stock insuffisant pour ${ligne.nom_produit}` });
        }
        await item.decrement('quantite', { by: ligne.quantite, transaction });
      }
    } else if (['stockiste', 'administrateur'].includes(req.utilisateur.role)) {
      for (const ligne of lignes.filter((l) => l.source === 'stock')) {
        const produit = await Produit.findByPk(ligne.produit_id, { transaction, lock: true });
        if (!produit || produit.quantite_stock < ligne.quantite) {
          await transaction.rollback();
          return res.status(422).json({ message: `Stock insuffisant pour ${ligne.nom_produit}` });
        }
        await produit.decrement('quantite_stock', { by: ligne.quantite, transaction });
      }
    }

    const montant_total = lignes.reduce((sum, l) => sum + (l.prix_unitaire * l.quantite), 0);
    const numero = await genererNumeroOrdonnance();

    // date_ordonnance : fournie par le client (saisie a posteriori) ou aujourd'hui par défaut
    let dateOrdonnance = new Date().toISOString().split('T')[0];
    if (req.body.date_ordonnance) {
      const parsed = new Date(req.body.date_ordonnance);
      if (!isNaN(parsed.getTime())) dateOrdonnance = req.body.date_ordonnance;
    }

    const ordonnance = await Ordonnance.create({
      numero,
      consultation_id: consultationId,
      patient_id: consultation.patient_id,
      medecin_id: req.utilisateur.id,
      date_ordonnance: dateOrdonnance,
      lignes,
      montant_total,
      notes,
      statut: 'brouillon',
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

module.exports = { lister, creer, obtenir, modifier, supprimer, genererPDF, valider };
