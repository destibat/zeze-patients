'use strict';

const { Facture, Ordonnance, Patient, User } = require('../models');
const { Op } = require('sequelize');

const INCLUDE_BASE = [
  { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'telephone', 'numero_dossier'] },
  {
    model: User, as: 'createur', attributes: ['id', 'nom', 'prenom', 'role', 'commission_rate', 'stockiste_id'],
    include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
  },
];

const genererNumero = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `FAC-${annee}-`;
  const derniere = await Facture.findOne({
    where: { numero: { [Op.like]: `${prefixe}%` } },
    order: [['numero', 'DESC']],
  });
  const seq = derniere ? parseInt(derniere.numero.split('-')[2], 10) + 1 : 1;
  return `${prefixe}${String(seq).padStart(5, '0')}`;
};

const calculerStatut = (total, paye) => {
  if (paye <= 0) return 'en_attente';
  if (paye >= total) return 'payee';
  return 'partiellement_payee';
};

const lister = async (req, res) => {
  const { statut, patient_id, debut, fin } = req.query;
  const estAdmin = req.utilisateur.role === 'administrateur';

  const where = {};
  if (statut) where.statut = statut;
  if (patient_id) where.patient_id = patient_id;
  if (debut && fin) where.date_facture = { [Op.between]: [debut, fin] };
  else if (debut) where.date_facture = { [Op.gte]: debut };

  // Non-admin : ses propres factures + celles de ses délégués (pour les stockistes)
  if (!estAdmin) {
    if (req.utilisateur.role === 'stockiste') {
      const delegues = await User.findAll({
        where: { stockiste_id: req.utilisateur.id },
        attributes: ['id'],
      });
      const ids = [req.utilisateur.id, ...delegues.map((d) => d.id)];
      where.created_by = { [Op.in]: ids };
    } else {
      where.created_by = req.utilisateur.id;
    }
  }

  const factures = await Facture.findAll({
    where,
    include: INCLUDE_BASE,
    order: [['date_facture', 'DESC'], ['created_at', 'DESC']],
  });
  res.json(factures);
};

const obtenir = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id, {
    include: [
      ...INCLUDE_BASE,
      { model: Ordonnance, as: 'ordonnance', attributes: ['id', 'numero'] },
    ],
  });
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });
  res.json(facture);
};

const creerDepuisOrdonnance = async (req, res) => {
  const { ordonnanceId } = req.params;
  const { notes, mode_paiement, montant_paye = 0 } = req.body;

  const ordonnance = await Ordonnance.findByPk(ordonnanceId, {
    include: [{ model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'numero_dossier'] }],
  });
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });

  const dejaFacturee = await Facture.findOne({
    where: { ordonnance_id: ordonnanceId, statut: { [Op.ne]: 'annulee' } },
  });
  if (dejaFacturee) {
    return res.status(409).json({ message: `Ordonnance déjà facturée (${dejaFacturee.numero})` });
  }

  const paye = Math.min(parseInt(montant_paye) || 0, ordonnance.montant_total);
  const numero = await genererNumero();

  const facture = await Facture.create({
    numero,
    patient_id: ordonnance.patient_id,
    ordonnance_id: ordonnanceId,
    created_by: req.utilisateur.id,
    date_facture: new Date().toISOString().split('T')[0],
    montant_total: ordonnance.montant_total,
    montant_paye: paye,
    mode_paiement: mode_paiement || null,
    statut: calculerStatut(ordonnance.montant_total, paye),
    lignes: ordonnance.lignes,
    notes,
  });

  const factureComplete = await Facture.findByPk(facture.id, { include: INCLUDE_BASE });
  res.status(201).json(factureComplete);
};

const enregistrerPaiement = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });
  if (facture.statut === 'annulee') return res.status(409).json({ message: 'Facture annulée' });

  const { montant, mode_paiement } = req.body;
  const nouveauPaye = Math.min(facture.montant_paye + (parseInt(montant) || 0), facture.montant_total);

  await facture.update({
    montant_paye: nouveauPaye,
    mode_paiement: mode_paiement || facture.mode_paiement,
    statut: calculerStatut(facture.montant_total, nouveauPaye),
  });

  res.json(facture);
};

const annuler = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });
  await facture.update({ statut: 'annulee' });
  res.json(facture);
};

module.exports = { lister, obtenir, creerDepuisOrdonnance, enregistrerPaiement, annuler };
