'use strict';

const { Exercice, MouvementDelegue, Facture, User, sequelize } = require('../models');
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
// Deux canaux revendeur : Facture (ordonnance cabinet) + MouvementDelegue (stock perso).
// Exercice ouvert/rouvert → recalcul depuis les taux individuels actuels.
// Exercice clôturé → valeurs stockées pour MouvementDelegue ; recalcul pour Factures
//   (pas de champ commission stocké sur Facture).
const calculerBilan = async (exerciceId, statut = null) => {
  const ex = await Exercice.findByPk(exerciceId, { attributes: ['statut', 'date_ouverture', 'date_cloture'] });
  const exerciceStatut = statut ?? ex?.statut ?? 'ouvert';
  const dateOuverture  = ex?.date_ouverture;
  const dateCloture    = ex?.date_cloture;
  const recalculer = ['ouvert', 'rouvert'].includes(exerciceStatut);

  // ── Toutes les Factures de l'exercice ─────────────────────────────────────
  const factures = await Facture.findAll({
    where: { exercice_id: exerciceId, statut: { [Op.ne]: 'annulee' } },
    include: [{
      model: User, as: 'createur',
      attributes: ['id', 'nom', 'prenom', 'role', 'commission_rate', 'stockiste_id'],
      include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
    }],
    raw: false,
  });

  // ── Ventes délégués directes (depuis stock perso, validées) ───────────────
  const ventesDeleg = await MouvementDelegue.findAll({
    where: { exercice_id: exerciceId, type: 'vente', statut: 'valide' },
    include: [{
      model: User, as: 'delegue',
      attributes: ['id', 'nom', 'prenom', 'commission_rate', 'stockiste_id'],
      include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
    }],
    raw: false,
  });

  // ── Achats appro (commandes validées par le stockiste) ────────────────────
  // Pas d'exercice_id sur ces mouvements → filtrage par date_mouvement
  const filtreDate = dateOuverture
    ? { [Op.gte]: dateOuverture, ...(dateCloture ? { [Op.lte]: dateCloture } : {}) }
    : undefined;
  const achatsDeleg = filtreDate ? await MouvementDelegue.findAll({
    where: { type: 'achat', statut: 'valide', montant_total: { [Op.gt]: 0 }, date_mouvement: filtreDate },
    include: [{
      model: User, as: 'delegue',
      attributes: ['id', 'nom', 'prenom', 'commission_rate', 'stockiste_id'],
      include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
    }],
    raw: false,
  }) : [];

  const parStockiste = {};
  const parDelegue   = {};
  const produitsMap  = {};

  const ajouterProduits = (lignesRaw) => {
    let lignes = lignesRaw;
    if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
    for (const l of (lignes || [])) {
      const nom = l.nom_produit || l.nom || 'Inconnu';
      if (!produitsMap[nom]) produitsMap[nom] = { quantite: 0, ca: 0 };
      produitsMap[nom].quantite += l.quantite || 0;
      produitsMap[nom].ca += (l.prix_unitaire || 0) * (l.quantite || 0);
    }
  };

  const ajouterDelegue = (id, nom, stockisteNom, montant, gainDelegue, commStockiste) => {
    if (!parDelegue[id]) {
      parDelegue[id] = { id, nom, stockiste_nom: stockisteNom, nb_ventes: 0, ca: 0, gain_delegue: 0, commission_stockiste: 0 };
    }
    parDelegue[id].nb_ventes      += 1;
    parDelegue[id].ca             += montant;
    parDelegue[id].gain_delegue   += gainDelegue;
    parDelegue[id].commission_stockiste += commStockiste;
  };

  const ajouterStockisteIndirect = (id, nom, taux, montant, commStockiste) => {
    if (!parStockiste[id]) {
      parStockiste[id] = { id, nom, taux, ca_factures: 0, gain_factures: 0, ca_delegues: 0, commission_delegues: 0 };
    }
    parStockiste[id].ca_delegues        += montant;
    parStockiste[id].commission_delegues += commStockiste;
  };

  // ── Traitement des Factures ────────────────────────────────────────────────
  for (const f of factures) {
    const createur = f.createur;
    const montant  = f.montant_paye || 0;

    if (createur?.role === 'delegue') {
      // Factures délégués = facturation patient uniquement.
      // Produits et commissions sont déjà capturés via achatsDeleg / ventesDeleg.
      continue;
    }

    ajouterProduits(f.lignes);

    // Canal direct (secrétaire / stockiste / admin) : commission 100 % au stockiste
    let tauxComm = 0, stockisteId = null, stockisteNom = '';

    if (createur?.role === 'stockiste' || createur?.role === 'administrateur') {
      tauxComm     = parseFloat(createur.commission_rate ?? 0);
      stockisteId  = createur.id;
      stockisteNom = `${createur.prenom} ${createur.nom}`;
    } else if (createur?.stockiste) {
      tauxComm     = parseFloat(createur.stockiste.commission_rate ?? 0);
      stockisteId  = createur.stockiste.id;
      stockisteNom = `${createur.stockiste.prenom} ${createur.stockiste.nom}`;
    }

    const gainStockiste = Math.round(montant * tauxComm / 100);
    if (stockisteId) {
      if (!parStockiste[stockisteId]) {
        parStockiste[stockisteId] = { id: stockisteId, nom: stockisteNom, taux: tauxComm, ca_factures: 0, gain_factures: 0, ca_delegues: 0, commission_delegues: 0 };
      }
      parStockiste[stockisteId].ca_factures  += montant;
      parStockiste[stockisteId].gain_factures += gainStockiste;
    }
  }

  // ── Traitement des ventes directes délégués (stock perso) ─────────────────
  for (const v of ventesDeleg) {
    const del = v.delegue;
    if (!del) continue;
    const stockiste    = del.stockiste;
    const stockisteId  = del.stockiste_id;
    const stockisteNom = stockiste ? `${stockiste.prenom} ${stockiste.nom}` : 'N/A';
    const tauxTotal    = parseFloat(stockiste?.commission_rate ?? 30);
    const tauxDelegue  = parseFloat(del.commission_rate ?? 15);

    const gainDelegue = recalculer
      ? Math.round(v.montant_total * tauxDelegue / 100)
      : (v.gain_delegue || 0);
    const commStock = recalculer
      ? Math.round(v.montant_total * (tauxTotal - tauxDelegue) / 100)
      : (v.commission_stockiste || 0);

    ajouterDelegue(del.id, `${del.prenom} ${del.nom}`, stockisteNom, v.montant_total, gainDelegue, commStock);
    if (stockisteId) ajouterStockisteIndirect(stockisteId, stockisteNom, tauxTotal, v.montant_total, commStock);
    ajouterProduits(v.lignes);
  }

  // ── Achats appro : gains attribués au délégué et au stockiste ───────────────
  for (const a of achatsDeleg) {
    const del = a.delegue;
    if (!del) continue;
    const stockiste    = del.stockiste;
    const stockisteId  = del.stockiste_id;
    const stockisteNom = stockiste ? `${stockiste.prenom} ${stockiste.nom}` : 'N/A';
    const tauxTotal    = parseFloat(stockiste?.commission_rate ?? 30);
    const tauxDelegue  = parseFloat(del.commission_rate ?? 15);

    const gainDelegue = recalculer
      ? Math.round(a.montant_total * tauxDelegue / 100)
      : (a.gain_delegue || 0);
    const commStock = recalculer
      ? Math.round(a.montant_total * (tauxTotal - tauxDelegue) / 100)
      : (a.commission_stockiste || 0);

    ajouterDelegue(del.id, `${del.prenom} ${del.nom}`, stockisteNom, a.montant_total, gainDelegue, commStock);
    if (stockisteId) ajouterStockisteIndirect(stockisteId, stockisteNom, tauxTotal, a.montant_total, commStock);
    ajouterProduits(a.lignes);
  }

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const ca_factures_total = factures
    .filter((f) => f.createur?.role !== 'delegue')
    .reduce((s, f) => s + (f.montant_paye || 0), 0);
  const ca_delegues_total =
    ventesDeleg.reduce((s, v) => s + (v.montant_total || 0), 0) +
    achatsDeleg.reduce((s, a) => s + (a.montant_total || 0), 0);
  const ca_total = ca_factures_total + ca_delegues_total;

  const commissions_stockistes_total = Object.values(parStockiste)
    .reduce((s, st) => s + st.gain_factures + st.commission_delegues, 0);
  const commissions_delegues_total = Object.values(parDelegue)
    .reduce((s, d) => s + d.gain_delegue, 0);
  const net_mapa = ca_total - commissions_stockistes_total - commissions_delegues_total;

  const nb_factures_directes = factures.filter((f) => f.createur?.role !== 'delegue').length;
  const nb_ventes_delegues   = Object.values(parDelegue).reduce((s, d) => s + d.nb_ventes, 0);

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
    nb_factures: nb_factures_directes,
    nb_ventes_delegues,
    ca_factures: ca_factures_total,
    ca_delegues: ca_delegues_total,
    ca_total,
    commissions_stockistes: commissions_stockistes_total,
    commissions_delegues:   commissions_delegues_total,
    net_mapa,
    par_stockiste: stockistesDetail,
    par_delegue:   Object.values(parDelegue),
    top_produits:  topProduits,
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

  // Exclure les délégués de caFactures (leurs ordonnances patients ≠ CA du stockiste)
  const delegueUsers = await User.findAll({ where: { role: 'delegue' }, attributes: ['id'], raw: true });
  const delegueIds = delegueUsers.map((u) => u.id);

  // CA accumulé : ventes directes stockiste + achats des délégués (commandeAppro + ordonnances source='achat')
  const [caFactures, caApprovisionnements] = await Promise.all([
    Facture.sum('montant_paye', {
      where: {
        exercice_id: exercice.id,
        statut: { [Op.ne]: 'annulee' },
        ...(delegueIds.length > 0 ? { created_by: { [Op.notIn]: delegueIds } } : {}),
      },
    }),
    MouvementDelegue.sum('montant_total', {
      where: {
        type: 'achat',
        statut: 'valide',
        date_mouvement: { [Op.gte]: exercice.date_ouverture },
      },
    }),
  ]);

  const dureeJours = Math.floor(
    (new Date() - new Date(exercice.date_ouverture)) / 86400000
  );

  res.json({
    exercice,
    ca_accumule: (caFactures || 0) + (caApprovisionnements || 0),
    ca_factures: caFactures || 0,
    ca_approvisionnements: caApprovisionnements || 0,
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
