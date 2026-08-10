'use strict';

const { BonCommandeMapa, Produit, StockMouvement, ParametreCabinet, User, sequelize } = require('../models');
const { genererNumeroBonCommande } = require('../services/numeroBonCommandeService');
const { genererPdfBonCommande }  = require('../services/pdfBonCommandeMapaService');
const { genererPdfReceptionBC }  = require('../services/pdfBonReceptionMapaService');

const includeCreateur = [
  { model: User, as: 'createur', attributes: ['id', 'nom', 'prenom', 'email'] },
];

// Lignes d'un BC : quantité entière ≥ 1, prix unitaire entier ≥ 0.
// Des valeurs négatives ou non numériques passeraient les calculs coercitifs
// (montant_total négatif ou NaN → erreur SQL 500 au lieu d'un 400).
const validerLignesBC = (lignes) => {
  for (const l of lignes) {
    l.quantite = parseInt(l.quantite, 10);
    l.prix_unitaire = parseInt(l.prix_unitaire, 10);
    if (!Number.isInteger(l.quantite) || l.quantite < 1 || !Number.isInteger(l.prix_unitaire) || l.prix_unitaire < 0) {
      return `Ligne invalide pour "${l.nom_produit || 'produit'}" : quantité entière ≥ 1 et prix ≥ 0 requis.`;
    }
  }
  return null;
};

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
  const {
    lignes, notes,
    nom_commandeur, prenoms_commandeur, telephone_commandeur,
    lieu_livraison, nom_stockiste_mapa, date_livraison_prevue, mention_livraison,
  } = req.body || {};

  const lignesValidees = Array.isArray(lignes) ? lignes : [];
  const erreurLignes = validerLignesBC(lignesValidees);
  if (erreurLignes) return res.status(400).json({ message: erreurLignes });
  const montant_total = lignesValidees.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);

  // Le numéro est généré par lecture du max + 1 : en cas de création
  // concurrente, l'index unique (cabinet_id, numero) rejette → on regénère.
  let bc;
  for (let tentative = 0; ; tentative++) {
    try {
      bc = await BonCommandeMapa.create({
        created_by: req.utilisateur.id,
        numero: await genererNumeroBonCommande(),
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
      break;
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError' || tentative >= 2) throw err;
    }
  }
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
  if (Array.isArray(lignes)) {
    const erreurLignes = validerLignesBC(lignes);
    if (erreurLignes) return res.status(400).json({ message: erreurLignes });
  }
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

// ── Valider la livraison (totale ou partielle) ────────────────────────────
const validerLivraison = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id, { include: includeCreateur });
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (!['envoye', 'livre_partiel'].includes(bc.statut)) {
    return res.status(409).json({ message: 'Seul un BC envoyé ou partiellement livré peut être réceptionné.' });
  }

  const lignesCommandees = Array.isArray(bc.lignes) ? bc.lignes : [];
  // lignes_livrees envoyées par le client : [{ produit_id, quantite_livree, nom_produit }]
  const lignesLivrees = Array.isArray(req.body.lignes_livrees) ? req.body.lignes_livrees : [];
  if (lignesLivrees.length === 0) {
    return res.status(400).json({ message: 'Aucune quantité livrée renseignée.' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Quantités déjà reçues lors des réceptions précédentes (BC livre_partiel)
  const cumulRecu = {};
  for (const dl of (Array.isArray(bc.lignes_livrees) ? bc.lignes_livrees : [])) {
    cumulRecu[dl.produit_id] = (cumulRecu[dl.produit_id] || 0) + (parseInt(dl.quantite_livree, 10) || 0);
  }

  // Vérifier cohérence : quantité livrée ≤ reliquat restant à livrer.
  // parseInt obligatoire : une chaîne "3" passerait les comparaisons puis
  // concatènerait dans le calcul de stock (10 + "3" = "103").
  for (const ll of lignesLivrees) {
    const lc = lignesCommandees.find((l) => l.produit_id === ll.produit_id);
    if (!lc) return res.status(400).json({ message: `Produit inconnu dans la commande : ${ll.nom_produit}` });
    ll.quantite_livree = parseInt(ll.quantite_livree, 10);
    const restant = lc.quantite - (cumulRecu[ll.produit_id] || 0);
    if (!Number.isInteger(ll.quantite_livree) || ll.quantite_livree < 0 || ll.quantite_livree > restant) {
      return res.status(400).json({
        message: `Quantité livrée invalide pour "${lc.nom_produit}" (max restant : ${restant})`,
      });
    }
    cumulRecu[ll.produit_id] = (cumulRecu[ll.produit_id] || 0) + ll.quantite_livree;
  }

  // Statut : livre si tout livré (cumul des réceptions successives), livre_partiel sinon
  const toutLivre = lignesCommandees.every((lc) => (cumulRecu[lc.produit_id] || 0) >= lc.quantite);

  const transaction = await sequelize.transaction();
  try {
    for (const ll of lignesLivrees) {
      if (ll.quantite_livree === 0) continue; // rien reçu pour ce produit

      const produit = await Produit.findByPk(ll.produit_id, { transaction, lock: true });
      if (!produit) {
        await transaction.rollback();
        return res.status(404).json({ message: `Produit introuvable : ${ll.nom_produit}` });
      }

      const stockApres = (produit.quantite_stock || 0) + ll.quantite_livree;
      await produit.update({ quantite_stock: stockApres, actif: true }, { transaction });

      await StockMouvement.create({
        produit_id:  ll.produit_id,
        type:        'entree',
        quantite:    ll.quantite_livree,
        motif:       `Livraison MAPA — ${bc.numero}`,
        user_id:     req.utilisateur.id,
        stock_apres: stockApres,
      }, { transaction });
    }

    await bc.update({
      statut:                   toutLivre ? 'livre' : 'livre_partiel',
      date_livraison_effective:  today,
      // Cumul de toutes les réceptions, pas seulement la dernière saisie
      lignes_livrees:            lignesCommandees
        .map((lc) => ({ produit_id: lc.produit_id, nom_produit: lc.nom_produit, quantite_livree: cumulRecu[lc.produit_id] || 0 }))
        .filter((l) => l.quantite_livree > 0),
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

// ── Annuler un BC envoyé ou partiellement livré ───────────────────────────
const annuler = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id);
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (!['envoye', 'livre_partiel'].includes(bc.statut)) {
    return res.status(409).json({ message: 'Seul un BC envoyé ou partiellement livré peut être annulé.' });
  }
  await bc.update({ statut: 'annule' });
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

// ── Générer le PDF Bon de Réception ──────────────────────────────────────
const genererPdfReception = async (req, res) => {
  const bc = await BonCommandeMapa.findByPk(req.params.id, { include: includeCreateur });
  if (!bc) return res.status(404).json({ message: 'Bon de commande introuvable.' });
  if (!['livre', 'livre_partiel'].includes(bc.statut)) {
    return res.status(409).json({ message: 'Le bon de réception n\'est disponible que pour les BCs livrés.' });
  }

  const parametres = await ParametreCabinet.findAll();
  const infosCabinet = {};
  parametres.forEach((p) => { infosCabinet[p.cle] = p.valeur; });

  const buffer = await genererPdfReceptionBC(bc.toJSON(), infosCabinet);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="BR-MAPA-${bc.numero}.pdf"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
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

module.exports = { lister, obtenirParId, creer, mettreAJour, confirmer, validerLivraison, annuler, supprimer, genererPdf, genererPdfReception };
