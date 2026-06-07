'use strict';

const { BonCommandeMapa, ParametreCabinet, User } = require('../models');
const { genererNumeroBonCommande } = require('../services/numeroBonCommandeService');
const { genererPdfBonCommande } = require('../services/pdfBonCommandeMapaService');

const includeCreateur = [
  { model: User, as: 'createur', attributes: ['id', 'nom', 'prenom', 'email'] },
];

// ── Lister tous les bons de commande du cabinet ────────────────────────────
const lister = async (req, res) => {
  const bons = await BonCommandeMapa.findAll({
    include: includeCreateur,
    order: [['created_at', 'DESC']],
  });
  res.json(bons);
};

// ── Obtenir un BC par ID ───────────────────────────────────────────────────
const obtenirParId = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id, { include: includeCreateur });
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  res.json(bc);
};

// ── Créer un nouveau brouillon ─────────────────────────────────────────────
const creer = async (req, res) => {
  const numero = await genererNumeroBonCommande();
  const bc = await BonCommandeMapa.create({
    created_by: req.utilisateur.id,
    numero,
    lignes: [],
    montant_total: 0,
  });
  const bcComplet = await BonCommandeMapa.findByPk(bc.id, { include: includeCreateur });
  res.status(201).json(bcComplet);
};

// ── Mettre à jour un brouillon (lignes + notes) ────────────────────────────
const mettreAJour = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id);
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (bc.statut !== 'brouillon') {
    return res.status(409).json({ message: 'Seul un brouillon peut être modifié.' });
  }

  const { lignes, notes, nom_commandeur, prenoms_commandeur, telephone_commandeur, lieu_livraison, nom_stockiste_mapa, date_livraison_prevue } = req.body;
  const montant_total = Array.isArray(lignes)
    ? lignes.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0)
    : bc.montant_total;

  await bc.update({
    ...(Array.isArray(lignes) ? { lignes, montant_total } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(nom_commandeur !== undefined ? { nom_commandeur } : {}),
    ...(prenoms_commandeur !== undefined ? { prenoms_commandeur } : {}),
    ...(telephone_commandeur !== undefined ? { telephone_commandeur } : {}),
    ...(lieu_livraison !== undefined ? { lieu_livraison } : {}),
    ...(nom_stockiste_mapa !== undefined ? { nom_stockiste_mapa } : {}),
    ...(date_livraison_prevue !== undefined ? { date_livraison_prevue } : {}),
  });

  const bcMaj = await BonCommandeMapa.findByPk(bc.id, { include: includeCreateur });
  res.json(bcMaj);
};

// ── Confirmer (envoyer) un brouillon → statut 'envoye' ────────────────────
const confirmer = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id, { include: includeCreateur });
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (bc.statut !== 'brouillon') {
    return res.status(409).json({ message: 'Ce bon de commande a déjà été envoyé.' });
  }

  const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];
  if (lignes.length === 0) {
    return res.status(400).json({ message: 'Ajoutez au moins un produit avant d\'envoyer.' });
  }
  if (!bc.nom_stockiste_mapa?.trim()) {
    return res.status(400).json({ message: 'Le nom du stockiste MAPA est obligatoire.' });
  }

  await bc.update({
    statut: 'envoye',
    date_commande: new Date().toISOString().split('T')[0],
  });

  const bcMaj = await BonCommandeMapa.findByPk(bc.id, { include: includeCreateur });
  res.json(bcMaj);
};

// ── Supprimer un brouillon ────────────────────────────────────────────────
const supprimer = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id);
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (bc.statut !== 'brouillon') {
    return res.status(409).json({ message: 'Seul un brouillon peut être supprimé.' });
  }
  await bc.destroy();
  res.status(204).end();
};

// ── Générer le PDF d'un BC ────────────────────────────────────────────────
const genererPdf = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id, { include: includeCreateur });
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });

  const parametres = await ParametreCabinet.findAll();
  const infosCabinet = {};
  parametres.forEach((p) => { infosCabinet[p.cle] = p.valeur; });

  const buffer = await genererPdfBonCommande(bc.toJSON(), infosCabinet);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="BC-MAPA-${bc.numero}.pdf"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
};

module.exports = { lister, obtenirParId, creer, mettreAJour, confirmer, supprimer, genererPdf };
