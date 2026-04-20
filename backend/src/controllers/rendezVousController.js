'use strict';

const { RendezVous, Patient, User, sequelize } = require('../models');
const { Op } = require('sequelize');

const verifierChevauchement = async (patient_id, date_heure, duree_minutes, excludeId = null) => {
  const debut = new Date(date_heure);
  const fin = new Date(debut.getTime() + (duree_minutes || 30) * 60000);

  const where = {
    patient_id,
    statut: { [Op.notIn]: ['annule'] },
    date_heure: { [Op.lt]: fin },
    [Op.and]: sequelize.literal(
      `DATE_ADD(date_heure, INTERVAL duree_minutes MINUTE) > '${debut.toISOString().replace('T', ' ').substring(0, 19)}'`
    ),
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  return RendezVous.findOne({ where });
};

const INCLUDE_BASE = [
  { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'telephone', 'numero_dossier'] },
  { model: User, as: 'medecin', attributes: ['id', 'nom', 'prenom'] },
];

const lister = async (req, res) => {
  const { debut, fin, statut, patient_id } = req.query;
  const where = {};

  if (debut && fin) {
    where.date_heure = { [Op.between]: [new Date(debut), new Date(fin)] };
  } else if (debut) {
    where.date_heure = { [Op.gte]: new Date(debut) };
  }
  if (statut) where.statut = statut;
  if (patient_id) where.patient_id = patient_id;

  const rdvs = await RendezVous.findAll({
    where,
    include: INCLUDE_BASE,
    order: [['date_heure', 'ASC']],
  });
  res.json(rdvs);
};

const obtenir = async (req, res) => {
  const rdv = await RendezVous.findByPk(req.params.id, { include: INCLUDE_BASE });
  if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
  res.json(rdv);
};

const creer = async (req, res) => {
  const { patient_id, medecin_id, date_heure, duree_minutes, motif, notes } = req.body;

  const patient = await Patient.findByPk(patient_id);
  if (!patient) return res.status(404).json({ message: 'Patient introuvable' });

  const conflit = await verifierChevauchement(patient_id, date_heure, duree_minutes || 30);
  if (conflit) {
    const heure = new Date(conflit.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return res.status(409).json({
      message: `Ce patient a déjà un rendez-vous à ${heure} (${conflit.motif}) qui chevauche ce créneau.`,
    });
  }

  const rdv = await RendezVous.create({
    patient_id,
    medecin_id: medecin_id || null,
    created_by: req.utilisateur.id,
    date_heure,
    duree_minutes: duree_minutes || 30,
    motif,
    notes,
    statut: 'planifie',
  });

  const rdvComplet = await RendezVous.findByPk(rdv.id, { include: INCLUDE_BASE });
  res.status(201).json(rdvComplet);
};

const modifier = async (req, res) => {
  const rdv = await RendezVous.findByPk(req.params.id);
  if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });

  const { date_heure, duree_minutes, motif, statut, notes, medecin_id } = req.body;

  if (date_heure || duree_minutes) {
    const nouvelleDateHeure = date_heure || rdv.date_heure;
    const nouvelleDuree = duree_minutes || rdv.duree_minutes;
    const conflit = await verifierChevauchement(rdv.patient_id, nouvelleDateHeure, nouvelleDuree, rdv.id);
    if (conflit) {
      const heure = new Date(conflit.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return res.status(409).json({
        message: `Ce patient a déjà un rendez-vous à ${heure} (${conflit.motif}) qui chevauche ce créneau.`,
      });
    }
  }

  await rdv.update({ date_heure, duree_minutes, motif, statut, notes, medecin_id });

  const rdvComplet = await RendezVous.findByPk(rdv.id, { include: INCLUDE_BASE });
  res.json(rdvComplet);
};

const supprimer = async (req, res) => {
  const rdv = await RendezVous.findByPk(req.params.id);
  if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
  await rdv.destroy();
  res.status(204).end();
};

module.exports = { lister, obtenir, creer, modifier, supprimer };
