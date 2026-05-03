'use strict';

const { FactureAchat, MouvementDelegue, User, Produit } = require('../models');

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

// Revendeur : marque le paiement comme envoyé
const marquerEnvoye = async (req, res) => {
  const { id } = req.params;
  const { mode_paiement } = req.body;

  const facture = await FactureAchat.findByPk(id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });

  if (facture.delegue_id !== req.utilisateur.id) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (facture.statut_paiement !== 'en_attente') {
    return res.status(400).json({ message: 'Le paiement a déjà été envoyé ou confirmé' });
  }

  await facture.update({
    statut_paiement: 'envoye',
    mode_paiement: mode_paiement || 'especes',
  });

  res.json(facture);
};

// Stockiste : confirme la réception du paiement
const marquerPaye = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.utilisateur;

  const facture = await FactureAchat.findByPk(id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });

  if (role === 'stockiste' && facture.stockiste_id !== userId) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (facture.statut_paiement === 'paye') {
    return res.status(400).json({ message: 'Facture déjà confirmée' });
  }

  await facture.update({
    statut_paiement: 'paye',
    date_paiement: new Date().toISOString().split('T')[0],
  });

  res.json(facture);
};

module.exports = { lister, marquerEnvoye, marquerPaye };
