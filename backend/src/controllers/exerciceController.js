'use strict';

const { Exercice, MouvementDelegue, Facture, User, ParametreCabinet, sequelize } = require('../models');
const { Op } = require('sequelize');

// ── Génération du numéro séquentiel ──────────────────────────────────────────
const genererNumero = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `EX-${annee}-`;
  const dernier = await Exercice.findOne({
    where: { numero: { [Op.like]: `${prefixe}%` } },
    order: [['numero', 'DESC']],
  });
  const seq = dernier ? parseInt(dernier.numero.split('-')[2], 10) + 1 : 1;
  return `${prefixe}${String(seq).padStart(3, '0')}`;
};

// ── Calcul du bilan complet d'un exercice ─────────────────────────────────────
// Pour un exercice ouvert/rouvert : recalcule les commissions depuis les taux actuels.
// Pour un exercice clôturé : utilise les valeurs stockées dans les mouvements.
const calculerBilan = async (exerciceId, statut = null) => {
  // Si le statut n'est pas fourni, on le charge
  let exerciceStatut = statut;
  if (!exerciceStatut) {
    const ex = await Exercice.findByPk(exerciceId, { attributes: ['statut'] });
    exerciceStatut = ex?.statut ?? 'ouvert';
  }
  const recalculer = ['ouvert', 'rouvert'].includes(exerciceStatut);

  // Taux délégué depuis parametres_cabinet (pour les exercices ouverts)
  let tauxDelegueActuel = 0.15;
  if (recalculer) {
    const paramDelegue = await ParametreCabinet.findOne({ where: { cle: 'commission_delegue' } });
    tauxDelegueActuel = parseFloat(paramDelegue?.valeur ?? 15) / 100;
  }

  // ── Factures (ventes directes stockiste/secrétaire/admin) ─────────────────
  const factures = await Facture.findAll({
    where: {
      exercice_id: exerciceId,
      statut: { [Op.ne]: 'annulee' },
    },
    include: [{
      model: User, as: 'createur',
      attributes: ['id', 'nom', 'prenom', 'role', 'commission_rate'],
      include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
    }],
    raw: false,
  });

  // ── Ventes délégués validées ───────────────────────────────────────────────
  const ventesDeleg = await MouvementDelegue.findAll({
    where: {
      exercice_id: exerciceId,
      type: 'vente',
      statut: 'valide',
    },
    include: [{
      model: User, as: 'delegue',
      attributes: ['id', 'nom', 'prenom', 'stockiste_id'],
      include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
    }],
    raw: false,
  });

  // ── Agrégation factures ────────────────────────────────────────────────────
  const parStockiste = {};
  const parDelegue = {};
  const produitsMap = {};

  for (const f of factures) {
    const createur = f.createur;
    // Si le créateur est un délégué, sa commission appartient à son stockiste
    // Ici on traite le cas général : le créateur directs de la facture
    let tauxComm = 0;
    let stockisteId = null;
    let stockisteNom = '';

    if (createur?.role === 'stockiste' || createur?.role === 'administrateur') {
      tauxComm = parseFloat(createur.commission_rate ?? 0);
      stockisteId = createur.id;
      stockisteNom = `${createur.prenom} ${createur.nom}`;
    } else if (createur?.stockiste) {
      // Délégué ou secrétaire qui facture — commission au stockiste parrain
      tauxComm = parseFloat(createur.stockiste.commission_rate ?? 0);
      stockisteId = createur.stockiste.id;
      stockisteNom = `${createur.stockiste.prenom} ${createur.stockiste.nom}`;
    }

    const montant = f.montant_paye || 0;
    const gainStockiste = Math.round(montant * tauxComm / 100);
    const partMapa = montant - gainStockiste;

    if (stockisteId) {
      if (!parStockiste[stockisteId]) {
        parStockiste[stockisteId] = {
          id: stockisteId, nom: stockisteNom,
          taux: tauxComm,
          ca_factures: 0, gain_factures: 0,
          ca_delegues: 0, commission_delegues: 0,
        };
      }
      parStockiste[stockisteId].ca_factures += montant;
      parStockiste[stockisteId].gain_factures += gainStockiste;
    }

    // Top produits factures
    let lignes = f.lignes;
    if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
    for (const l of (lignes || [])) {
      produitsMap[l.nom_produit || l.nom || 'Inconnu'] = produitsMap[l.nom_produit || l.nom || 'Inconnu'] || { quantite: 0, ca: 0 };
      produitsMap[l.nom_produit || l.nom || 'Inconnu'].quantite += l.quantite || 0;
      produitsMap[l.nom_produit || l.nom || 'Inconnu'].ca += (l.prix_unitaire || 0) * (l.quantite || 0);
    }
  }

  // ── Agrégation ventes délégués ─────────────────────────────────────────────
  for (const v of ventesDeleg) {
    const del = v.delegue;
    const stockiste = del?.stockiste;
    const stockisteId = del?.stockiste_id;
    const stockisteNom = stockiste ? `${stockiste.prenom} ${stockiste.nom}` : 'N/A';
    const tauxTotal = parseFloat(stockiste?.commission_rate ?? 25);

    // Pour un exercice ouvert : recalculer depuis les taux actuels
    // Pour un exercice clôturé : utiliser les valeurs enregistrées
    const gainDelegue = recalculer
      ? Math.round(v.montant_total * tauxDelegueActuel)
      : v.gain_delegue;
    const commissionStockiste = recalculer
      ? Math.round(v.montant_total * (tauxTotal / 100 - tauxDelegueActuel))
      : v.commission_stockiste;

    // Délégué
    if (!parDelegue[del.id]) {
      parDelegue[del.id] = {
        id: del.id, nom: `${del.prenom} ${del.nom}`,
        stockiste_nom: stockisteNom,
        nb_ventes: 0, ca: 0, gain_delegue: 0, commission_stockiste: 0,
      };
    }
    parDelegue[del.id].nb_ventes += 1;
    parDelegue[del.id].ca += v.montant_total;
    parDelegue[del.id].gain_delegue += gainDelegue;
    parDelegue[del.id].commission_stockiste += commissionStockiste;

    // Stockiste parrain
    if (stockisteId) {
      if (!parStockiste[stockisteId]) {
        parStockiste[stockisteId] = {
          id: stockisteId, nom: stockisteNom,
          taux: tauxTotal,
          ca_factures: 0, gain_factures: 0,
          ca_delegues: 0, commission_delegues: 0,
        };
      }
      parStockiste[stockisteId].ca_delegues += v.montant_total;
      parStockiste[stockisteId].commission_delegues += commissionStockiste;
    }

    // Top produits ventes délégués
    let lignes = v.lignes;
    if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
    for (const l of (lignes || [])) {
      const nom = l.nom_produit || l.nom || 'Inconnu';
      if (!produitsMap[nom]) produitsMap[nom] = { quantite: 0, ca: 0 };
      produitsMap[nom].quantite += l.quantite || 0;
      produitsMap[nom].ca += (l.prix_unitaire || 0) * (l.quantite || 0);
    }
  }

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const ca_factures_total = factures.reduce((s, f) => s + (f.montant_paye || 0), 0);
  const ca_delegues_total = ventesDeleg.reduce((s, v) => s + (v.montant_total || 0), 0);
  const ca_total = ca_factures_total + ca_delegues_total;

  const commissions_stockistes_total = Object.values(parStockiste).reduce(
    (s, st) => s + st.gain_factures + st.commission_delegues, 0
  );
  const commissions_delegues_total = Object.values(parDelegue).reduce(
    (s, d) => s + d.gain_delegue, 0
  );
  const net_mapa = ca_total - commissions_stockistes_total - commissions_delegues_total;

  // ── Structurer la réponse ─────────────────────────────────────────────────
  const stockistesDetail = Object.values(parStockiste).map((st) => ({
    ...st,
    commission_totale: st.gain_factures + st.commission_delegues,
    part_mapa_generee: (st.ca_factures - st.gain_factures) + (st.ca_delegues - st.commission_delegues),
  }));

  const topProduits = Object.entries(produitsMap)
    .map(([nom, data]) => ({ nom, ...data }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 20);

  return {
    nb_factures: factures.length,
    nb_ventes_delegues: ventesDeleg.length,
    ca_factures: ca_factures_total,
    ca_delegues: ca_delegues_total,
    ca_total,
    commissions_stockistes: commissions_stockistes_total,
    commissions_delegues: commissions_delegues_total,
    net_mapa,
    par_stockiste: stockistesDetail,
    par_delegue: Object.values(parDelegue),
    top_produits: topProduits,
  };
};

// ── POST /exercices/ouvrir ────────────────────────────────────────────────────
const ouvrir = async (req, res) => {
  // Vérifier qu'aucun exercice n'est ouvert
  const existant = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
  });
  if (existant) {
    return res.status(409).json({
      message: `Un exercice est déjà ouvert : ${existant.numero}. Clôturez-le avant d'en ouvrir un nouveau.`,
      exercice: existant,
    });
  }

  // date_ouverture optionnelle (rétroactive possible), par défaut aujourd'hui
  let dateOuverture = new Date();
  if (req.body?.date_ouverture) {
    const parsed = new Date(req.body.date_ouverture);
    if (!isNaN(parsed.getTime())) dateOuverture = parsed;
  }

  const numero = await genererNumero();
  const exercice = await Exercice.create({
    numero,
    date_ouverture: dateOuverture,
    statut: 'ouvert',
    ouvert_par: req.utilisateur.id,
  });

  res.status(201).json(exercice);
};

// ── POST /exercices/:id/cloturer ─────────────────────────────────────────────
const cloturer = async (req, res) => {
  const exercice = await Exercice.findByPk(req.params.id);
  if (!exercice) return res.status(404).json({ message: 'Exercice introuvable' });
  if (exercice.statut === 'cloture') {
    return res.status(409).json({ message: 'Cet exercice est déjà clôturé' });
  }

  const dateCloture = new Date();
  // Force recalculer avec taux actuels (l'exercice est encore ouvert à ce stade)
  const bilan = await calculerBilan(exercice.id, exercice.statut);

  const transaction = await sequelize.transaction();
  try {
    await exercice.update({
      statut: 'cloture',
      date_cloture: dateCloture,
      cloture_par: req.utilisateur.id,
      bilan_snapshot: bilan,
    }, { transaction });

    // Ouvrir automatiquement le nouvel exercice (date_ouverture = date_cloture précédent)
    const nouveauNumero = await genererNumero();
    const nouvelExercice = await Exercice.create({
      numero: nouveauNumero,
      date_ouverture: dateCloture,
      statut: 'ouvert',
      ouvert_par: req.utilisateur.id,
    }, { transaction });

    await transaction.commit();

    res.json({
      exercice_cloture: await Exercice.findByPk(exercice.id),
      exercice_suivant: nouvelExercice,
      bilan,
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// ── POST /exercices/:id/rouvrir ───────────────────────────────────────────────
const rouvrir = async (req, res) => {
  // Admin uniquement — vérifié via middleware autoriser('administrateur')
  const { motif } = req.body;
  if (!motif?.trim()) {
    return res.status(400).json({ message: 'Le motif de réouverture est obligatoire' });
  }

  const exercice = await Exercice.findByPk(req.params.id);
  if (!exercice) return res.status(404).json({ message: 'Exercice introuvable' });
  if (exercice.statut !== 'cloture') {
    return res.status(409).json({ message: 'Seul un exercice clôturé peut être rouvert' });
  }

  // Vérifier qu'aucun autre exercice n'est ouvert
  const autreOuvert = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
  });
  if (autreOuvert) {
    return res.status(409).json({
      message: `Impossible de rouvrir : l'exercice ${autreOuvert.numero} est encore ouvert. Clôturez-le d'abord.`,
    });
  }

  await exercice.update({
    statut: 'rouvert',
    date_cloture: null,
    rouvert_par: req.utilisateur.id,
    motif_reouverture: motif.trim(),
  });

  res.json(exercice);
};

// ── GET /exercices ────────────────────────────────────────────────────────────
const lister = async (req, res) => {
  const { statut, debut, fin, page = 1, limite = 20 } = req.query;
  const where = {};
  if (statut) where.statut = statut;
  if (debut && fin) where.date_ouverture = { [Op.between]: [new Date(debut), new Date(fin)] };
  else if (debut) where.date_ouverture = { [Op.gte]: new Date(debut) };

  const { rows, count } = await Exercice.findAndCountAll({
    where,
    include: [
      { model: User, as: 'ouvreur', attributes: ['id', 'nom', 'prenom'] },
      { model: User, as: 'clotureur', attributes: ['id', 'nom', 'prenom'] },
      { model: User, as: 'rouvreur', attributes: ['id', 'nom', 'prenom'] },
    ],
    order: [['date_ouverture', 'DESC']],
    limit: parseInt(limite),
    offset: (parseInt(page) - 1) * parseInt(limite),
  });

  res.json({ total: count, page: parseInt(page), exercices: rows });
};

// ── GET /exercices/actuel ─────────────────────────────────────────────────────
const obtenirActuel = async (req, res) => {
  const exercice = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
    include: [{ model: User, as: 'ouvreur', attributes: ['id', 'nom', 'prenom'] }],
  });

  if (!exercice) {
    return res.json({ exercice: null, message: 'Aucun exercice ouvert en ce moment' });
  }

  // CA accumulé rapide (factures + ventes délégués validées)
  const [caFactures, caDelegues] = await Promise.all([
    Facture.sum('montant_paye', {
      where: { exercice_id: exercice.id, statut: { [Op.ne]: 'annulee' } },
    }),
    MouvementDelegue.sum('montant_total', {
      where: { exercice_id: exercice.id, type: 'vente', statut: 'valide' },
    }),
  ]);

  const dureeJours = Math.floor(
    (new Date() - new Date(exercice.date_ouverture)) / 86400000
  );

  res.json({
    exercice,
    ca_accumule: (caFactures || 0) + (caDelegues || 0),
    ca_factures: caFactures || 0,
    ca_delegues: caDelegues || 0,
    duree_jours: dureeJours,
  });
};

// ── GET /exercices/:id ────────────────────────────────────────────────────────
const obtenir = async (req, res) => {
  const exercice = await Exercice.findByPk(req.params.id, {
    include: [
      { model: User, as: 'ouvreur', attributes: ['id', 'nom', 'prenom'] },
      { model: User, as: 'clotureur', attributes: ['id', 'nom', 'prenom'] },
      { model: User, as: 'rouvreur', attributes: ['id', 'nom', 'prenom'] },
    ],
  });
  if (!exercice) return res.status(404).json({ message: 'Exercice introuvable' });
  res.json(exercice);
};

// ── GET /exercices/:id/bilan ──────────────────────────────────────────────────
const obtenirBilan = async (req, res) => {
  const exercice = await Exercice.findByPk(req.params.id, {
    include: [
      { model: User, as: 'rouvreur', attributes: ['id', 'nom', 'prenom'] },
    ],
  });
  if (!exercice) return res.status(404).json({ message: 'Exercice introuvable' });

  const dureeJours = exercice.date_cloture
    ? Math.floor((new Date(exercice.date_cloture) - new Date(exercice.date_ouverture)) / 86400000)
    : Math.floor((new Date() - new Date(exercice.date_ouverture)) / 86400000);

  // Exercice clôturé + snapshot disponible → données figées à la clôture
  // Exercice ouvert/rouvert → recalcul à la volée avec les taux actuels
  let bilan;
  if (exercice.statut === 'cloture' && exercice.bilan_snapshot) {
    bilan = exercice.bilan_snapshot;
  } else {
    bilan = await calculerBilan(exercice.id, exercice.statut);
  }

  res.json({
    exercice: {
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
    },
    bilan,
    snapshot_disponible: !!exercice.bilan_snapshot,
  });
};

module.exports = { ouvrir, cloturer, rouvrir, lister, obtenir, obtenirActuel, obtenirBilan, calculerBilan };
