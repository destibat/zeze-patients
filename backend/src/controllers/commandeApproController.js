'use strict';

const {
  CommandeApprovisionnement, FactureAchat,
  StockDelegue, MouvementDelegue, StockMouvement,
  Produit, User, sequelize,
} = require('../models');
const { Op } = require('sequelize');

const includeParties = [
  { model: User, as: 'revendeur', attributes: ['id', 'nom', 'prenom', 'email'] },
  { model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom'] },
  { model: FactureAchat, as: 'facture', attributes: ['id', 'statut_paiement', 'mode_paiement', 'date_paiement', 'montant_total'] },
];

// ── Revendeur : obtenir ou créer le brouillon courant ─────────────────────────
const obtenirBrouillon = async (req, res) => {
  const revendeur_id = req.utilisateur.id;

  const delegue = await User.findByPk(revendeur_id, { attributes: ['stockiste_id'] });
  if (!delegue?.stockiste_id) {
    return res.status(422).json({ message: 'Aucun stockiste associé à votre compte.' });
  }

  let brouillon = await CommandeApprovisionnement.findOne({
    where: { revendeur_id, statut: 'brouillon' },
    include: includeParties,
  });

  if (!brouillon) {
    brouillon = await CommandeApprovisionnement.create({
      revendeur_id,
      stockiste_id: delegue.stockiste_id,
      lignes: [],
      montant_total: 0,
    });
    brouillon = await CommandeApprovisionnement.findByPk(brouillon.id, { include: includeParties });
  }

  res.json(brouillon);
};

// ── Revendeur : mettre à jour les lignes du brouillon ─────────────────────────
const mettreAJourLignes = async (req, res) => {
  const { lignes = [] } = req.body;

  const brouillon = await CommandeApprovisionnement.findOne({
    where: { revendeur_id: req.utilisateur.id, statut: 'brouillon' },
  });
  if (!brouillon) return res.status(404).json({ message: 'Aucun brouillon en cours.' });

  const montant_total = lignes.reduce((s, l) => s + (l.prix_unitaire * l.quantite), 0);
  await brouillon.update({ lignes, montant_total });

  res.json(brouillon);
};

// ── Revendeur : envoyer la commande au stockiste ──────────────────────────────
const envoyer = async (req, res) => {
  const brouillon = await CommandeApprovisionnement.findOne({
    where: { revendeur_id: req.utilisateur.id, statut: 'brouillon' },
    include: includeParties,
  });
  if (!brouillon) return res.status(404).json({ message: 'Aucun brouillon en cours.' });

  const lignes = Array.isArray(brouillon.lignes) ? brouillon.lignes : [];
  if (lignes.length === 0) {
    return res.status(400).json({ message: 'Ajoutez au moins un produit avant d\'envoyer.' });
  }

  await brouillon.update({
    statut: 'en_attente',
    date_commande: new Date().toISOString().split('T')[0],
    notes_revendeur: req.body.notes_revendeur || null,
  });

  res.json(brouillon);
};

// ── Revendeur : supprimer son brouillon ───────────────────────────────────────
const supprimerBrouillon = async (req, res) => {
  const brouillon = await CommandeApprovisionnement.findOne({
    where: { revendeur_id: req.utilisateur.id, statut: 'brouillon' },
  });
  if (!brouillon) return res.status(404).json({ message: 'Aucun brouillon à supprimer.' });

  await brouillon.destroy();
  res.status(204).end();
};

// ── Lister les commandes (selon le rôle) ─────────────────────────────────────
const lister = async (req, res) => {
  const { id, role } = req.utilisateur;
  let where = {};

  if (role === 'delegue') {
    where.revendeur_id = id;
  } else if (role === 'stockiste') {
    where.stockiste_id = id;
  }
  // admin voit tout

  const commandes = await CommandeApprovisionnement.findAll({
    where,
    include: includeParties,
    order: [['created_at', 'DESC']],
  });

  res.json(commandes);
};

// ── Stockiste : valider une commande ─────────────────────────────────────────
const valider = async (req, res) => {
  const commande = await CommandeApprovisionnement.findByPk(req.params.id, { include: includeParties });
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  if (commande.statut !== 'en_attente') {
    return res.status(409).json({ message: 'Cette commande a déjà été traitée.' });
  }

  const estAdmin = req.utilisateur.role === 'administrateur';
  if (!estAdmin && commande.stockiste_id !== req.utilisateur.id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  const lignes = Array.isArray(commande.lignes) ? commande.lignes : [];
  const today  = new Date().toISOString().split('T')[0];

  // Taux de commission du stockiste pour calculer la répartition
  const stockisteUser = await User.findByPk(commande.stockiste_id, { attributes: ['commission_rate'] });
  const tauxTotal = parseFloat(stockisteUser?.commission_rate ?? 25) / 100;

  const transaction = await sequelize.transaction();
  try {
    // Vérifier et décrémenter le stock cabinet pour chaque ligne
    for (const ligne of lignes) {
      const produit = await Produit.findByPk(ligne.produit_id, { transaction, lock: true });
      if (!produit) {
        await transaction.rollback();
        return res.status(404).json({ message: `Produit introuvable : ${ligne.nom_produit}` });
      }
      if (produit.quantite_stock < ligne.quantite) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Stock cabinet insuffisant pour "${produit.nom}" (disponible : ${produit.quantite_stock}, demandé : ${ligne.quantite})`,
        });
      }

      const stockApres = produit.quantite_stock - ligne.quantite;
      await produit.update({ quantite_stock: stockApres }, { transaction });

      await StockMouvement.create({
        produit_id: ligne.produit_id,
        type: 'sortie',
        quantite: -ligne.quantite,
        motif: `Commande revendeur — ${commande.revendeur?.prenom ?? ''} ${commande.revendeur?.nom ?? ''}`.trim(),
        user_id: req.utilisateur.id,
        stock_apres: stockApres,
      }, { transaction });

      // Stock revendeur
      const [item] = await StockDelegue.findOrCreate({
        where: { delegue_id: commande.revendeur_id, produit_id: ligne.produit_id },
        defaults: { quantite: 0 },
        transaction,
      });
      await item.increment('quantite', { by: ligne.quantite, transaction });

      // Mouvement délégué avec gains calculés
      const montant_ligne = ligne.prix_unitaire * ligne.quantite;
      await MouvementDelegue.create({
        delegue_id:           commande.revendeur_id,
        type:                 'achat',
        produit_id:           ligne.produit_id,
        quantite:             ligne.quantite,
        montant_total:        montant_ligne,
        gain_delegue:         Math.round(montant_ligne * 0.15),
        commission_stockiste: Math.round(montant_ligne * (tauxTotal - 0.15)),
        date_mouvement:       today,
      }, { transaction });
    }

    // Créer la facture achat liée à la commande
    await FactureAchat.create({
      commande_id:     commande.id,
      delegue_id:      commande.revendeur_id,
      stockiste_id:    commande.stockiste_id,
      montant_total:   commande.montant_total,
      statut_paiement: 'en_attente',
    }, { transaction });

    await commande.update({
      statut:          'validee',
      date_validation: today,
      notes_stockiste: req.body.notes_stockiste || null,
    }, { transaction });

    await transaction.commit();

    const commandeMaj = await CommandeApprovisionnement.findByPk(commande.id, { include: includeParties });
    res.json(commandeMaj);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// ── Stockiste : refuser une commande ─────────────────────────────────────────
const refuser = async (req, res) => {
  const commande = await CommandeApprovisionnement.findByPk(req.params.id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  if (commande.statut !== 'en_attente') {
    return res.status(409).json({ message: 'Cette commande a déjà été traitée.' });
  }

  const estAdmin = req.utilisateur.role === 'administrateur';
  if (!estAdmin && commande.stockiste_id !== req.utilisateur.id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  await commande.update({
    statut: 'refusee',
    notes_stockiste: req.body.notes_stockiste || null,
  });

  res.json(commande);
};

module.exports = { obtenirBrouillon, mettreAJourLignes, envoyer, supprimerBrouillon, lister, valider, refuser };
