'use strict';

const { FactureAchat, MouvementDelegue, User, Produit } = require('../models');
const { Op } = require('sequelize');

const includeBase = [
  {
    model: MouvementDelegue,
    as: 'mouvement',
    attributes: ['id', 'produit_id', 'quantite', 'montant_total', 'date_mouvement'],
    include: [{ model: Produit, as: 'produit', attributes: ['id', 'nom', 'prix_unitaire'] }],
  },
  { model: User, as: 'delegue',   attributes: ['id', 'nom', 'prenom', 'email'] },
  { model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom'] },
];

const lister = async (req, res) => {
  const { id, role } = req.utilisateur;
  let where = {};

  if (role === 'delegue') {
    where.delegue_id = id;
  } else if (role === 'stockiste') {
    where.stockiste_id = id;
  }
  // admin voit tout

  const factures = await FactureAchat.findAll({
    where,
    include: includeBase,
    order: [['created_at', 'DESC']],
  });

  res.json(factures);
};

const marquerPaye = async (req, res) => {
  const { id } = req.params;
  const { mode_paiement } = req.body;

  const facture = await FactureAchat.findByPk(id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });

  const { id: userId, role } = req.utilisateur;
  if (role === 'stockiste' && facture.stockiste_id !== userId) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (role === 'delegue' && facture.delegue_id !== userId) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  if (facture.statut_paiement === 'paye') {
    return res.status(400).json({ message: 'Facture déjà payée' });
  }

  await facture.update({
    statut_paiement: 'paye',
    mode_paiement: mode_paiement || 'especes',
    date_paiement: new Date().toISOString().split('T')[0],
  });

  res.json(facture);
};

module.exports = { lister, marquerPaye };
