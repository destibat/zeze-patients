'use strict';

const { BonCommandeMapa, Produit, StockMouvement, ParametreCabinet, User, sequelize } = require('../models');
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
  const {
    lignes, notes,
    nom_commandeur, prenoms_commandeur, telephone_commandeur,
    lieu_livraison, nom_stockiste_mapa, date_livraison_prevue, mention_livraison,
  } = req.body || {};

  const lignesValidees = Array.isArray(lignes) ? lignes : [];
  const montant_total = lignesValidees.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0);

  const bc = await BonCommandeMapa.create({
    created_by: req.utilisateur.id,
    numero,
    lignes: lignesValidees,
    montant_total,
    notes,
    nom_commandeur,
    prenoms_commandeur,
    telephone_commandeur,
    lieu_livraison,
    nom_stockiste_mapa,
    date_livraison_prevue,
    mention_livraison,
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

  const { lignes, notes, nom_commandeur, prenoms_commandeur, telephone_commandeur, lieu_livraison, nom_stockiste_mapa, date_livraison_prevue, mention_livraison } = req.body;
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
    ...(mention_livraison !== undefined ? { mention_livraison } : {}),
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
  await bc.update({
    statut: 'envoye',
    date_commande: new Date().toISOString().split('T')[0],
  });

  const bcMaj = await BonCommandeMapa.findByPk(bc.id, { include: includeCreateur });
  res.json(bcMaj);
};

// ── Valider la livraison → statut 'livre' + mise à jour stock ─────────────
const validerLivraison = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id, { include: includeCreateur });
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (bc.statut !== 'envoye') {
    return res.status(409).json({ message: 'Seul un BC envoyé peut être marqué comme livré.' });
  }

  const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];
  const today  = new Date().toISOString().split('T')[0];

  const transaction = await sequelize.transaction();
  try {
    for (const ligne of lignes) {
      const produit = await Produit.findByPk(ligne.produit_id, { transaction, lock: true });
      if (!produit) {
        await transaction.rollback();
        return res.status(404).json({ message: `Produit introuvable : ${ligne.nom_produit}` });
      }

      const stockApres = (produit.quantite_stock || 0) + ligne.quantite;
      await produit.update({ quantite_stock: stockApres, actif: true }, { transaction });

      await StockMouvement.create({
        produit_id:  ligne.produit_id,
        type:        'entree',
        quantite:    ligne.quantite,
        motif:       `Livraison MAPA — ${bc.numero}`,
        user_id:     req.utilisateur.id,
        stock_apres: stockApres,
      }, { transaction });
    }

    await bc.update({
      statut:                  'livre',
      date_livraison_effective: today,
      ...(req.body.notes_livraison !== undefined ? { notes: req.body.notes_livraison } : {}),
    }, { transaction });

    await transaction.commit();

    const bcMaj = await BonCommandeMapa.findByPk(bc.id, { include: includeCreateur });
    res.json(bcMaj);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
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

module.exports = { lister, obtenirParId, creer, mettreAJour, confirmer, validerLivraison, supprimer, genererPdf };
