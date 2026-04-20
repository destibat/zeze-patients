'use strict';

const { Consultation, Patient, User, Ordonnance } = require('../models');
const { getPosologie } = require('../services/posologieService');

const listerToutes = async (req, res) => {
  const { Op } = require('sequelize');
  const { debut, fin, medecin_id } = req.query;
  const where = {};
  if (debut && fin) where.date_consultation = { [Op.between]: [debut, fin] };
  else if (debut) where.date_consultation = { [Op.gte]: debut };
  if (medecin_id) where.medecin_id = medecin_id;

  const consultations = await Consultation.findAll({
    where,
    include: [
      { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom'] },
      { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'numero_dossier', 'date_naissance'] },
      { model: Ordonnance, as: 'ordonnances', attributes: ['id', 'numero', 'statut', 'montant_total'] },
    ],
    order: [['date_consultation', 'DESC']],
  });
  res.json(consultations);
};

const listerParPatient = async (req, res) => {
  const { patientId } = req.params;
  const consultations = await Consultation.findAll({
    where: { patient_id: patientId },
    include: [
      { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom'] },
      { model: Ordonnance, as: 'ordonnances', attributes: ['id', 'numero', 'statut', 'montant_total'] },
    ],
    order: [['date_consultation', 'DESC']],
  });
  res.json(consultations);
};

const obtenir = async (req, res) => {
  const consultation = await Consultation.findByPk(req.params.id, {
    include: [
      { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom'] },
      { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'date_naissance', 'allergies'] },
      { model: Ordonnance, as: 'ordonnances' },
    ],
  });
  if (!consultation) return res.status(404).json({ message: 'Consultation introuvable' });
  res.json(consultation);
};

const creer = async (req, res) => {
  const { patientId } = req.params;
  const patient = await Patient.findByPk(patientId);
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const {
    date_consultation, motif, symptomes, diagnostic, traitement_notes,
    tension_systolique, tension_diastolique, frequence_cardiaque,
    temperature, poids, taille, saturation_o2,
  } = req.body;

  const consultation = await Consultation.create({
    patient_id: patientId,
    medecin_id: req.utilisateur.id,
    date_consultation: date_consultation || new Date().toISOString().split('T')[0],
    motif,
    symptomes,
    diagnostic,
    traitement_notes,
    tension_systolique,
    tension_diastolique,
    frequence_cardiaque,
    temperature,
    poids,
    taille,
    saturation_o2,
  });

  const posologie = getPosologie(patient.date_naissance);
  res.status(201).json({ ...consultation.toJSON(), posologie_suggeree: posologie });
};

const modifier = async (req, res) => {
  const consultation = await Consultation.findByPk(req.params.id);
  if (!consultation) return res.status(404).json({ message: 'Consultation introuvable' });

  const {
    motif, symptomes, diagnostic, traitement_notes,
    tension_systolique, tension_diastolique, frequence_cardiaque,
    temperature, poids, taille, saturation_o2,
  } = req.body;

  await consultation.update({
    motif, symptomes, diagnostic, traitement_notes,
    tension_systolique, tension_diastolique, frequence_cardiaque,
    temperature, poids, taille, saturation_o2,
  });
  res.json(consultation);
};

const supprimer = async (req, res) => {
  const consultation = await Consultation.findByPk(req.params.id, {
    include: [{ model: Ordonnance, as: 'ordonnances' }],
  });
  if (!consultation) return res.status(404).json({ message: 'Consultation introuvable' });
  if (consultation.ordonnances.length > 0) {
    return res.status(409).json({ message: 'Impossible de supprimer une consultation avec des ordonnances' });
  }
  await consultation.destroy();
  res.status(204).end();
};

module.exports = { listerToutes, listerParPatient, obtenir, creer, modifier, supprimer };
