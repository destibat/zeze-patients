'use strict';

const { Exercice, Facture, MouvementDelegue, Patient, Produit, StockDelegue, User, ParametreCabinet } = require('../models');
const { Op } = require('sequelize');
const { calculerBilan } = require('./exerciceController');
const {
  genererFicheMAPAPDF,
  genererDetailProduitsPDF,
  genererRecapDeleguesPDF,
  genererBilanIndividuelPDF,
  genererBilanStockistePDF,
  genererBilanCompletPDF,
} = require('../services/pdfFichesService');

// ── Charge les infos cabinet depuis parametres_cabinet ────────────────────────
const chargerInfosCabinet = async () => {
  const params = await ParametreCabinet.findAll({
    where: { cle: ['nom_cabinet', 'adresse'] },
    raw: true,
  });
  const map = {};
  params.forEach((p) => { map[p.cle] = p.valeur; });
  return {
    nom_cabinet: map.nom_cabinet || 'ZEZEPAGNON — Dossiers Patients',
    adresse: map.adresse || '',
  };
};

// ── Utilitaire : charge exercice + bilan (snapshot si clôturé) ────────────────
const chargerExerciceEtBilan = async (id) => {
  const exercice = await Exercice.findByPk(id, {
    include: [
      { model: User, as: 'rouvreur', attributes: ['id', 'nom', 'prenom'] },
      { model: User, as: 'clotureur', attributes: ['id', 'nom', 'prenom'] },
    ],
  });
  if (!exercice) return null;

  const dureeJours = exercice.date_cloture
    ? Math.floor((new Date(exercice.date_cloture) - new Date(exercice.date_ouverture)) / 86400000)
    : Math.floor((new Date() - new Date(exercice.date_ouverture)) / 86400000);

  const exercicePlat = {
    id: exercice.id,
    numero: exercice.numero,
    statut: exercice.statut,
    date_ouverture: exercice.date_ouverture,
    date_cloture: exercice.date_cloture,
    duree_jours: dureeJours,
    motif_reouverture: exercice.motif_reouverture,
    rouvreur_nom: exercice.rouvreur
      ? `${exercice.rouvreur.prenom} ${exercice.rouvreur.nom}`
      : null,
  };

  // Clôturé + snapshot → données figées ; sinon recalcul avec taux actuels
  let bilan;
  if (exercice.statut === 'cloture' && exercice.bilan_snapshot) {
    bilan = exercice.bilan_snapshot;
  } else {
    bilan = await calculerBilan(exercice.id, exercice.statut);
  }

  return { exercice: exercicePlat, bilan };
};

// ── Envoi PDF en réponse HTTP ─────────────────────────────────────────────────
const envoyerPDF = (res, buffer, nomFichier) => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${nomFichier}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
};

// ── GET /exercices/:id/fiches/mapa.pdf ────────────────────────────────────────
const ficheMapa = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const parrain_nom = (req.query.parrain || '').trim();
  const infos = await chargerInfosCabinet();

  const buffer = await genererFicheMAPAPDF(exercice, bilan, parrain_nom, infos);
  envoyerPDF(res, buffer, `fiche-mapa-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/detail-produits.pdf ─────────────────────────────
const ficheDetailProduits = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const infos = await chargerInfosCabinet();

  const buffer = await genererDetailProduitsPDF(exercice, bilan, infos);
  envoyerPDF(res, buffer, `detail-produits-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/recap-delegues.pdf ──────────────────────────────
const ficheRecapDelegues = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const infos = await chargerInfosCabinet();

  const buffer = await genererRecapDeleguesPDF(exercice, bilan, infos);
  envoyerPDF(res, buffer, `recap-delegues-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/delegue/:delegueId.pdf ─────────────────────────
const ficheBilanDelegue = async (req, res) => {
  const { id: exerciceId, delegueId } = req.params;
  const utilisateur = req.utilisateur;

  // Un délégué peut uniquement voir son propre bilan
  if (utilisateur.role === 'delegue' && utilisateur.id !== delegueId) {
    return res.status(403).json({ message: 'Accès refusé : vous ne pouvez voir que votre propre bilan' });
  }

  const resultat = await chargerExerciceEtBilan(exerciceId);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice } = resultat;

  const delegue = await User.findByPk(delegueId, {
    attributes: ['id', 'nom', 'prenom', 'role', 'commission_rate'],
  });
  if (!delegue || delegue.role !== 'delegue') {
    return res.status(404).json({ message: 'Délégué introuvable' });
  }

  // Achats appro : commandeAppro validées uniquement (MouvementDelegue type='achat' AVEC lignes JSON)
  // Les ordonnances source='achat' (sans lignes) sont des ventes directes cabinet → passent dans ventesDirectes
  const filtreDate = {
    [Op.gte]: new Date(exercice.date_ouverture).toISOString().split('T')[0],
    ...(exercice.date_cloture ? { [Op.lte]: new Date(exercice.date_cloture).toISOString().split('T')[0] } : {}),
  };
  const achatsRaw = await MouvementDelegue.findAll({
    where: {
      delegue_id: delegueId,
      type: 'achat',
      statut: 'valide',
      montant_total: { [Op.gt]: 0 },
      date_mouvement: filtreDate,
    },
    include: [{ model: Produit, as: 'produit', attributes: ['nom', 'prix_unitaire'] }],
    order: [['date_mouvement', 'ASC'], ['created_at', 'ASC']],
  });

  const normaliserLignes = (a) => {
    const raw = a.toJSON ? a.toJSON() : a;
    let lignes = raw.lignes;
    if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
    if (!Array.isArray(lignes) || lignes.length === 0) {
      if (raw.produit_id) {
        const prixUnit = raw.quantite > 0 ? Math.round(raw.montant_total / raw.quantite) : null;
        lignes = [{ nom_produit: raw.produit?.nom || '—', quantite: raw.quantite, prix_unitaire: prixUnit }];
      }
    }
    return { ...raw, lignes };
  };

  const hasLignes = (a) => {
    const raw = a.toJSON ? a.toJSON() : a;
    let l = raw.lignes;
    if (typeof l === 'string') { try { l = JSON.parse(l); } catch { l = []; } }
    return Array.isArray(l) && l.length > 0;
  };

  // commandeAppro = avec lignes JSON ; ventes cabinet direct = sans lignes (reconstituées depuis produit_id)
  const achatsAppro = achatsRaw.filter(hasLignes).map(normaliserLignes);
  const ventesCabinetDirect = achatsRaw.filter((a) => !hasLignes(a)).map(normaliserLignes);

  // Ventes directes : ventes depuis le stock personnel du délégué (MouvementDelegue type='vente')
  const ventesStockPerso = await MouvementDelegue.findAll({
    where: { delegue_id: delegueId, exercice_id: exerciceId, type: 'vente' },
    order: [['date_mouvement', 'ASC'], ['created_at', 'ASC']],
    raw: true,
  });

  // Combiner ventes cabinet direct + ventes stock perso dans la section "Ventes directes" du PDF
  const ventesDirectes = [...ventesCabinetDirect, ...ventesStockPerso];

  // Stock actuel du délégué (produits avec quantité > 0)
  const stockItems = await StockDelegue.findAll({
    where: { delegue_id: delegueId, quantite: { [Op.gt]: 0 } },
    include: [{ model: Produit, as: 'produit', attributes: ['nom', 'prix_unitaire'] }],
    order: [[{ model: Produit, as: 'produit' }, 'nom', 'ASC']],
  });
  const stockActuel = stockItems.map((s) => ({
    nom: s.produit?.nom || '—',
    quantite: s.quantite,
    prix_unitaire: s.produit?.prix_unitaire || 0,
    valeur_totale: s.quantite * (s.produit?.prix_unitaire || 0),
  }));

  const infos = await chargerInfosCabinet();
  const buffer = await genererBilanIndividuelPDF(exercice, delegue, achatsAppro, ventesDirectes, stockActuel, infos);
  const nom = `${delegue.prenom}-${delegue.nom}`.toLowerCase().replace(/\s+/g, '-');
  envoyerPDF(res, buffer, `bilan-delegue-${nom}-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/stockiste/:stockisteId.pdf ──────────────────────
const ficheBilanStockiste = async (req, res) => {
  const { id: exerciceId, stockisteId } = req.params;

  if (req.utilisateur.role === 'stockiste' && req.utilisateur.id !== stockisteId) {
    return res.status(403).json({ message: 'Accès refusé : vous ne pouvez voir que votre propre bilan' });
  }

  const resultat = await chargerExerciceEtBilan(exerciceId);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });
  const { exercice } = resultat;

  const stockiste = await User.findByPk(stockisteId, {
    attributes: ['id', 'nom', 'prenom', 'role', 'commission_rate'],
  });
  if (!stockiste) return res.status(404).json({ message: 'Stockiste introuvable' });

  // Ventes directes : Factures créées par le stockiste pendant l'exercice
  const factures = await Facture.findAll({
    where: {
      exercice_id: exerciceId,
      created_by: stockisteId,
      statut: { [Op.ne]: 'annulee' },
    },
    include: [{ model: Patient, as: 'patient', attributes: ['nom', 'prenom'] }],
    order: [['date_facture', 'ASC']],
  });

  // Appros délégués : commissions stockiste sur les achats des revendeurs rattachés
  const filtreDate = {
    [Op.gte]: new Date(exercice.date_ouverture).toISOString().split('T')[0],
    ...(exercice.date_cloture ? { [Op.lte]: new Date(exercice.date_cloture).toISOString().split('T')[0] } : {}),
  };
  const approsRaw = await MouvementDelegue.findAll({
    where: { type: 'achat', statut: 'valide', montant_total: { [Op.gt]: 0 }, date_mouvement: filtreDate },
    include: [{
      model: User, as: 'delegue',
      attributes: ['id', 'nom', 'prenom'],
      where: { stockiste_id: stockisteId },
      required: true,
    }],
    order: [['date_mouvement', 'ASC']],
    raw: false,
  });

  // Agréger par délégué
  const parDelegue = {};
  approsRaw.forEach((a) => {
    const del = a.delegue;
    if (!del) return;
    if (!parDelegue[del.id]) {
      parDelegue[del.id] = { nom: `${del.prenom} ${del.nom}`, nb: 0, ca: 0, commission: 0 };
    }
    parDelegue[del.id].nb++;
    parDelegue[del.id].ca         += a.montant_total || 0;
    parDelegue[del.id].commission += a.commission_stockiste || 0;
  });
  const resumeAppros = Object.values(parDelegue).sort((a, b) => b.ca - a.ca);

  const infos = await chargerInfosCabinet();
  const buffer = await genererBilanStockistePDF(exercice, stockiste, factures, resumeAppros, infos);
  const nom = `${stockiste.prenom}-${stockiste.nom}`.toLowerCase().replace(/\s+/g, '-');
  envoyerPDF(res, buffer, `bilan-stockiste-${nom}-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/bilan-complet.pdf ───────────────────────────────
const ficheBilanComplet = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const infos = await chargerInfosCabinet();

  const buffer = await genererBilanCompletPDF(exercice, bilan, infos);
  envoyerPDF(res, buffer, `bilan-complet-${exercice.numero}.pdf`);
};

module.exports = { ficheMapa, ficheDetailProduits, ficheRecapDelegues, ficheBilanDelegue, ficheBilanStockiste, ficheBilanComplet };
