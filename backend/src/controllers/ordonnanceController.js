'use strict';

const { Ordonnance, Consultation, Patient, User } = require('../models');
const { genererNumeroOrdonnance } = require('../services/numeroOrdonnanceService');
const { getPosologie } = require('../services/posologieService');
const pdfService = require('../services/pdfService');

const lister = async (req, res) => {
  const { patient_id, statut, debut, fin } = req.query;
  const { Op } = require('sequelize');
  const where = {};
  if (patient_id) where.patient_id = patient_id;
  if (statut) where.statut = statut;
  if (debut && fin) where.date_ordonnance = { [Op.between]: [debut, fin] };
  else if (debut) where.date_ordonnance = { [Op.gte]: debut };

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

  const montant_total = lignes.reduce((sum, l) => sum + (l.prix_unitaire * l.quantite), 0);
  const numero = await genererNumeroOrdonnance();

  const ordonnance = await Ordonnance.create({
    numero,
    consultation_id: consultationId,
    patient_id: consultation.patient_id,
    medecin_id: req.utilisateur.id,
    date_ordonnance: consultation.date_consultation,
    lignes,
    montant_total,
    notes,
    statut: 'brouillon',
  });

  res.status(201).json(ordonnance);
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

const modifier = async (req, res) => {
  const ordonnance = await Ordonnance.findByPk(req.params.id);
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });
  if (ordonnance.statut === 'validee') {
    return res.status(409).json({ message: 'Une ordonnance validée ne peut pas être modifiée' });
  }

  const { lignes, notes, statut } = req.body;
  const montant_total = (lignes || ordonnance.lignes).reduce(
    (sum, l) => sum + (l.prix_unitaire * l.quantite), 0
  );
  await ordonnance.update({ lignes: lignes || ordonnance.lignes, notes, statut, montant_total });
  res.json(ordonnance);
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

module.exports = { lister, creer, obtenir, modifier, genererPDF };
