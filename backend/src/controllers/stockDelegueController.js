'use strict';

const { StockDelegue, MouvementDelegue, Facture, FactureAchat, Produit, StockMouvement, User, Exercice, Patient, CommandeApprovisionnement, Ordonnance, sequelize } = require('../models');
const { Op } = require('sequelize');

// Récupère l'exercice ouvert ou lance une erreur métier
const getExerciceOuvert = async () => {
  const exercice = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
    attributes: ['id', 'numero', 'date_ouverture'],
  });
  return exercice;
};

// Récupère les taux du délégué (son propre taux) et de son stockiste parrain
const getTaux = async (delegueId) => {
  const delegue = await User.findByPk(delegueId, {
    attributes: ['commission_rate', 'stockiste_id'],
    include: [{ model: User, as: 'stockiste', attributes: ['commission_rate'] }],
  });
  const tauxStockiste = parseFloat(delegue?.stockiste?.commission_rate ?? 25) / 100;
  const tauxDelegue   = parseFloat(delegue?.commission_rate ?? 15) / 100;
  return { tauxStockiste, tauxDelegue };
};

const listerMonStock = async (req, res) => {
  const items = await StockDelegue.findAll({
    where: { delegue_id: req.utilisateur.id },
    include: [{
      model: Produit,
      as: 'produit',
      attributes: ['id', 'nom', 'categorie', 'prix_unitaire', 'actif'],
    }],
    order: [[{ model: Produit, as: 'produit' }, 'nom', 'ASC']],
  });
  res.json(items);
};

const acheter = async (req, res) => {
  const { produit_id, quantite } = req.body;
  if (!produit_id || !quantite || quantite < 1) {
    return res.status(400).json({ message: 'produit_id et quantite (≥ 1) sont requis' });
  }

  const produit = await Produit.findByPk(produit_id);
  if (!produit || !produit.actif) {
    return res.status(404).json({ message: 'Produit introuvable ou inactif' });
  }

  if (produit.quantite_stock < quantite) {
    return res.status(409).json({
      message: `Stock cabinet insuffisant (disponible : ${produit.quantite_stock})`,
    });
  }

  const montant_total = produit.prix_unitaire * quantite;
  const today = new Date().toISOString().split('T')[0];

  // Récupérer le stockiste parrain du revendeur
  const delegue = await User.findByPk(req.utilisateur.id, { attributes: ['stockiste_id'] });
  const stockiste_id = delegue?.stockiste_id;

  const transaction = await sequelize.transaction();
  try {
    // Décrémenter le stock cabinet (avec verrou pour éviter les sursouscriptions simultanées)
    const produitLock = await Produit.findByPk(produit_id, { transaction, lock: true });
    if (produitLock.quantite_stock < quantite) {
      await transaction.rollback();
      return res.status(409).json({
        message: `Stock cabinet insuffisant (disponible : ${produitLock.quantite_stock})`,
      });
    }
    const stockApres = produitLock.quantite_stock - quantite;
    await produitLock.update({ quantite_stock: stockApres }, { transaction });

    await StockMouvement.create({
      produit_id,
      type: 'sortie',
      quantite: -quantite,
      motif: `Transfert revendeur — ${req.utilisateur.prenom ?? ''} ${req.utilisateur.nom ?? ''}`.trim(),
      user_id: req.utilisateur.id,
      stock_apres: stockApres,
    }, { transaction });

    const [item] = await StockDelegue.findOrCreate({
      where: { delegue_id: req.utilisateur.id, produit_id },
      defaults: { quantite: 0 },
      transaction,
    });
    await item.increment('quantite', { by: quantite, transaction });

    const mouvement = await MouvementDelegue.create({
      delegue_id: req.utilisateur.id,
      type: 'achat',
      produit_id,
      quantite,
      montant_total,
      commission_stockiste: 0,
      gain_delegue: 0,
      date_mouvement: today,
    }, { transaction });

    if (stockiste_id) {
      await FactureAchat.create({
        mouvement_id:    mouvement.id,
        delegue_id:      req.utilisateur.id,
        stockiste_id,
        montant_total,
        statut_paiement: 'en_attente',
      }, { transaction });
    }

    await transaction.commit();
    await item.reload({
      include: [{ model: Produit, as: 'produit', attributes: ['id', 'nom', 'categorie', 'prix_unitaire', 'actif'] }],
    });
    res.status(201).json(item);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

const vendre = async (req, res) => {
  const { lignes = [], client_nom } = req.body;
  if (lignes.length === 0) {
    return res.status(400).json({ message: 'Ajoutez au moins un produit à vendre.' });
  }

  // Vérifier qu'un exercice est ouvert
  const exercice = await getExerciceOuvert();
  if (!exercice) {
    return res.status(422).json({
      message: 'Aucun exercice comptable ouvert. Ouvrez un exercice avant d\'enregistrer une vente.',
      code: 'EXERCICE_REQUIS',
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const transaction = await sequelize.transaction();

  try {
    for (const ligne of lignes) {
      const item = await StockDelegue.findOne({
        where: { delegue_id: req.utilisateur.id, produit_id: ligne.produit_id },
        transaction,
        lock: true,
      });
      if (!item || item.quantite < ligne.quantite) {
        await transaction.rollback();
        return res.status(422).json({ message: `Stock insuffisant pour "${ligne.nom_produit}"` });
      }
      await item.decrement('quantite', { by: ligne.quantite, transaction });
    }

    const montant_total = lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);
    // Vente depuis stock perso : commission déjà comptabilisée lors de l'approvisionnement

    const mouvement = await MouvementDelegue.create({
      delegue_id: req.utilisateur.id,
      type: 'vente',
      lignes,
      montant_total,
      commission_stockiste: 0,
      gain_delegue: 0,
      client_nom: client_nom?.trim() || null,
      date_mouvement: today,
      statut: 'en_attente',
      exercice_id: exercice.id,
    }, { transaction });

    await transaction.commit();
    res.status(201).json(mouvement);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

const listerMesVentes = async (req, res) => {
  const { debut, fin } = req.query;
  const where = { delegue_id: req.utilisateur.id, type: 'vente' };
  if (debut && fin) where.date_mouvement = { [Op.between]: [debut, fin] };
  else if (debut) where.date_mouvement = { [Op.gte]: debut };

  const ventes = await MouvementDelegue.findAll({
    where,
    order: [['date_mouvement', 'DESC'], ['created_at', 'DESC']],
  });
  res.json(ventes);
};

// Stats délégué — commission uniquement sur les achats au stockiste (commandeAppro + source='achat')
const obtenirStatsStock = async (req, res) => {
  const exercice = await getExerciceOuvert();
  const dateOuverture = exercice?.date_ouverture;

  const whereAchat = { delegue_id: req.utilisateur.id, type: 'achat' };
  if (dateOuverture) whereAchat.date_mouvement = { [Op.gte]: dateOuverture };

  const whereVente = { delegue_id: req.utilisateur.id, type: 'vente' };
  if (exercice) whereVente.exercice_id = exercice.id;

  const whereOrd = { medecin_id: req.utilisateur.id, statut: { [Op.ne]: 'annulee' } };
  if (dateOuverture) whereOrd.date_ordonnance = { [Op.gte]: dateOuverture };

  const [achats, toutesVentes, nbProduits, ordonnances] = await Promise.all([
    MouvementDelegue.findAll({
      where: whereAchat,
      attributes: ['montant_total', 'gain_delegue'], raw: true,
    }),
    MouvementDelegue.findAll({
      where: whereVente,
      attributes: ['montant_total', 'statut'], raw: true,
    }),
    StockDelegue.count({ where: { delegue_id: req.utilisateur.id } }),
    Ordonnance.findAll({ where: whereOrd, attributes: ['lignes'], raw: true }),
  ]);

  // Décomposition des ordonnances par source (stock perso vs achat direct au stockiste)
  let ca_ord_depuis_stock = 0;
  let ca_ord_achat_direct = 0;
  for (const ord of ordonnances) {
    let lignes = ord.lignes;
    if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
    for (const l of (Array.isArray(lignes) ? lignes : [])) {
      const montant = (l.prix_unitaire || 0) * (l.quantite || 0);
      if (l.source === 'stock') ca_ord_depuis_stock += montant;
      else ca_ord_achat_direct += montant;
    }
  }

  const ventesEnAttente = toutesVentes.filter((v) => v.statut === 'en_attente');
  const gainAchatsMois  = achats.reduce((s, a) => s + (a.gain_delegue || 0), 0);

  res.json({
    achats_mois:          achats.reduce((s, a) => s + (a.montant_total || 0), 0),
    ventes_mois:          toutesVentes.reduce((s, v) => s + (v.montant_total || 0), 0),
    gain_delegue_mois:    gainAchatsMois,
    nb_produits_stock:    nbProduits,
    ventes_en_attente:    ventesEnAttente.length,
    ca_ord_depuis_stock,
    ca_ord_achat_direct,
  });
};

// Gains des délégués — admin et stockiste : commission calculée sur les achats au stockiste uniquement
// (commandeAppro + lignes ordonnance source='achat'). Les ventes depuis stock perso ne génèrent pas
// de nouvelle commission car elle a été prise lors de l'approvisionnement.
const obtenirGainsDelegues = async (req, res) => {
  const estAdmin = req.utilisateur.role === 'administrateur';

  const exercice = await getExerciceOuvert();
  if (!exercice) return res.json([]);

  const whereDelegue = { role: 'delegue', actif: true };
  if (!estAdmin) whereDelegue.stockiste_id = req.utilisateur.id;

  const delegues = await User.findAll({
    where: whereDelegue,
    attributes: ['id', 'nom', 'prenom', 'commission_rate'],
    include: [{ model: User, as: 'stockiste', attributes: ['commission_rate'] }],
  });

  if (delegues.length === 0) return res.json([]);

  const ids = delegues.map((d) => d.id);

  const [mouvAchats, ventesStock, facturesOrd] = await Promise.all([
    // Achats au stockiste — base de commission (valeurs stockées à la création)
    MouvementDelegue.findAll({
      where: {
        delegue_id: { [Op.in]: ids },
        type: 'achat',
        date_mouvement: { [Op.gte]: exercice.date_ouverture },
      },
      attributes: ['delegue_id', 'montant_total', 'gain_delegue', 'commission_stockiste'],
      raw: true,
    }),
    // Ventes directes stock — CA patient uniquement (pas de nouvelle commission)
    MouvementDelegue.findAll({
      where: { delegue_id: { [Op.in]: ids }, type: 'vente', statut: 'valide', exercice_id: exercice.id },
      attributes: ['delegue_id', 'montant_total'],
      raw: true,
    }),
    // Factures ordonnances — CA patient (commission déjà captée sur les lignes source='achat')
    Facture.findAll({
      where: {
        created_by: { [Op.in]: ids },
        statut: { [Op.ne]: 'annulee' },
        date_facture: { [Op.gte]: exercice.date_ouverture },
      },
      attributes: ['created_by', 'montant_total'],
      raw: true,
    }),
  ]);

  const resultat = delegues.map((d) => {
    const mouvAchatsD   = mouvAchats.filter((m) => m.delegue_id === d.id);
    const ventesStockD  = ventesStock.filter((v) => v.delegue_id === d.id);
    const facturesD     = facturesOrd.filter((f) => f.created_by === d.id);

    const tauxTotal   = parseFloat(d.stockiste?.commission_rate ?? 25);
    const tauxDelegue = parseFloat(d.commission_rate ?? 15);

    // Commission depuis les valeurs stockées (évite le double-compte des lignes source='stock')
    const achats_stockiste          = mouvAchatsD.reduce((s, m) => s + (m.montant_total || 0), 0);
    const gain_delegue_mois         = mouvAchatsD.reduce((s, m) => s + (m.gain_delegue || 0), 0);
    const commission_stockiste_mois = mouvAchatsD.reduce((s, m) => s + (m.commission_stockiste || 0), 0);
    const part_mapa_mois            = achats_stockiste - gain_delegue_mois - commission_stockiste_mois;

    // CA patient (pour information — ne sert pas au calcul de commission)
    const ca_ventes_directes = ventesStockD.reduce((s, v) => s + (v.montant_total || 0), 0);
    const ca_ordonnances     = facturesD.reduce((s, f) => s + (f.montant_total || 0), 0);

    return {
      delegue: { id: d.id, nom: d.nom, prenom: d.prenom },
      taux_commission: tauxTotal,
      taux_delegue:    tauxDelegue,
      ventes_mois:            achats_stockiste,       // base de commission = achats au stockiste
      ca_ventes_directes,                             // CA ventes directes (info)
      ca_ordonnances,                                 // CA ordonnances patient (info)
      gain_delegue_mois,
      commission_stockiste_mois,
      part_mapa_mois,
    };
  });

  res.json(resultat);
};

// Ventes en attente de validation — stockiste voit les ventes de ses délégués à valider
const ventesEnAttente = async (req, res) => {
  const estAdmin = req.utilisateur.role === 'administrateur';
  const whereDelegue = { role: 'delegue', actif: true };
  if (!estAdmin) whereDelegue.stockiste_id = req.utilisateur.id;

  const delegues = await User.findAll({
    where: whereDelegue,
    attributes: ['id'],
  });
  if (delegues.length === 0) return res.json([]);

  const ids = delegues.map((d) => d.id);
  const ventes = await MouvementDelegue.findAll({
    where: { delegue_id: { [Op.in]: ids }, type: 'vente', statut: 'en_attente' },
    include: [{ model: User, as: 'delegue', attributes: ['id', 'nom', 'prenom'] }],
    order: [['date_mouvement', 'ASC'], ['created_at', 'ASC']],
  });
  res.json(ventes);
};

// Valider une vente directe — stockiste enregistre le moyen de paiement
const validerVente = async (req, res) => {
  const { mode_paiement } = req.body;
  const mouvement = await MouvementDelegue.findByPk(req.params.id, {
    include: [{ model: User, as: 'delegue', attributes: ['id', 'nom', 'prenom', 'stockiste_id'] }],
  });
  if (!mouvement || mouvement.type !== 'vente') {
    return res.status(404).json({ message: 'Vente introuvable' });
  }
  if (mouvement.statut !== 'en_attente') {
    return res.status(409).json({ message: 'Cette vente a déjà été traitée' });
  }
  const estAdmin = req.utilisateur.role === 'administrateur';
  if (!estAdmin && mouvement.delegue?.stockiste_id !== req.utilisateur.id) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  await mouvement.update({ statut: 'valide', mode_paiement: mode_paiement || null });
  res.json(mouvement);
};

// Refuser une vente directe — stock du délégué restauré
const refuserVente = async (req, res) => {
  const mouvement = await MouvementDelegue.findByPk(req.params.id, {
    include: [{ model: User, as: 'delegue', attributes: ['id', 'nom', 'prenom', 'stockiste_id'] }],
  });
  if (!mouvement || mouvement.type !== 'vente') {
    return res.status(404).json({ message: 'Vente introuvable' });
  }
  if (mouvement.statut !== 'en_attente') {
    return res.status(409).json({ message: 'Cette vente a déjà été traitée' });
  }
  const estAdmin = req.utilisateur.role === 'administrateur';
  if (!estAdmin && mouvement.delegue?.stockiste_id !== req.utilisateur.id) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  let lignes = mouvement.lignes;
  if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
  if (!Array.isArray(lignes)) lignes = [];

  const transaction = await sequelize.transaction();
  try {
    for (const ligne of lignes) {
      const [item] = await StockDelegue.findOrCreate({
        where: { delegue_id: mouvement.delegue_id, produit_id: ligne.produit_id },
        defaults: { quantite: 0 },
        transaction,
      });
      await item.increment('quantite', { by: ligne.quantite, transaction });
    }
    await mouvement.update({ statut: 'refuse' }, { transaction });
    await transaction.commit();
    res.json(mouvement);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

// Ventes directes des délégués — admin et stockiste : toutes les ventes hors ordonnance
const ventesDirectesDelegues = async (req, res) => {
  const estAdmin = req.utilisateur.role === 'administrateur';
  const { debut, fin } = req.query;

  const whereDelegue = { role: 'delegue', actif: true };
  if (!estAdmin) whereDelegue.stockiste_id = req.utilisateur.id;

  const delegues = await User.findAll({
    where: whereDelegue,
    attributes: ['id', 'nom', 'prenom', 'stockiste_id', 'commission_rate'],
    include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
  });

  if (delegues.length === 0) return res.json([]);

  const ids = delegues.map((d) => d.id);
  const whereVentes = { delegue_id: { [Op.in]: ids }, type: 'vente', statut: 'valide' };
  if (debut && fin) whereVentes.date_mouvement = { [Op.between]: [debut, fin] };
  else if (debut) whereVentes.date_mouvement = { [Op.gte]: debut };

  const ventes = await MouvementDelegue.findAll({
    where: whereVentes,
    attributes: ['delegue_id', 'montant_total'],
    raw: true,
  });

  const resultat = delegues
    .map((d) => {
      const ventesD = ventes.filter((v) => v.delegue_id === d.id);
      if (ventesD.length === 0) return null;
      const tauxTotal   = parseFloat(d.stockiste?.commission_rate ?? 25);
      const tauxDelegue = parseFloat(d.commission_rate ?? 15);
      const ventes_total = ventesD.reduce((s, v) => s + (v.montant_total || 0), 0);
      const gain_delegue = Math.round(ventes_total * tauxDelegue / 100);
      const commission_stockiste = Math.round(ventes_total * (tauxTotal - tauxDelegue) / 100);
      return {
        delegue: {
          id: d.id,
          nom: d.nom,
          prenom: d.prenom,
          stockiste_id: d.stockiste_id,
          stockiste: d.stockiste,
        },
        ventes_total,
        gain_delegue,
        commission_stockiste,
      };
    })
    .filter(Boolean);

  res.json(resultat);
};

// Bilan personnel du délégué sur une période
const monBilan = async (req, res) => {
  const userId = req.utilisateur.id;
  const { debut, fin } = req.query;

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const dateDebut = debut ? new Date(debut) : debutMois;
  const dateFin = fin ? new Date(fin) : new Date();
  dateFin.setHours(23, 59, 59, 999);

  const debutStr = dateDebut.toISOString().split('T')[0];
  const finStr   = dateFin.toISOString().split('T')[0];

  const [commandesAppro, facturesOrd, ventesDirectes, mouvAchats] = await Promise.all([
    CommandeApprovisionnement.findAll({
      where: {
        revendeur_id: userId,
        statut: 'validee',
        date_validation: { [Op.between]: [debutStr, finStr] },
      },
      include: [
        { model: FactureAchat, as: 'facture', attributes: ['id', 'statut_paiement', 'montant_total', 'mode_paiement', 'date_paiement'] },
        { model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom'] },
      ],
      order: [['date_validation', 'DESC']],
    }),
    Facture.findAll({
      where: {
        created_by: userId,
        statut: { [Op.ne]: 'annulee' },
        date_facture: { [Op.between]: [debutStr, finStr] },
      },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'numero_dossier'] }],
      order: [['date_facture', 'DESC']],
    }),
    MouvementDelegue.findAll({
      where: {
        delegue_id: userId,
        type: 'vente',
        date_mouvement: { [Op.between]: [debutStr, finStr] },
      },
      include: [{ model: Produit, as: 'produit', attributes: ['id', 'nom'] }],
      order: [['date_mouvement', 'DESC']],
    }),
    MouvementDelegue.findAll({
      where: {
        delegue_id: userId,
        type: 'achat',
        date_mouvement: { [Op.between]: [debutStr, finStr] },
      },
      attributes: ['gain_delegue', 'montant_total'],
      raw: true,
    }),
  ]);

  const total_achats         = commandesAppro.reduce((s, c) => s + (c.montant_total || 0), 0);
  const total_ventes_ord     = facturesOrd.reduce((s, f) => s + (f.montant_total || 0), 0);
  const total_ventes_dir     = ventesDirectes.filter((v) => v.statut === 'valide').reduce((s, v) => s + (v.montant_total || 0), 0);
  const total_gains          = mouvAchats.reduce((s, m) => s + (m.gain_delegue || 0), 0);

  res.json({
    periode:       { debut: dateDebut, fin: dateFin },
    commandes_appro:      commandesAppro,
    factures_ordonnances: facturesOrd,
    ventes_directes:      ventesDirectes,
    totaux: {
      achats:             total_achats,
      ventes:             total_ventes_ord + total_ventes_dir,
      ventes_ordonnances: total_ventes_ord,
      ventes_directes:    total_ventes_dir,
      gains:              total_gains,
    },
  });
};

module.exports = {
  listerMonStock, acheter, vendre, listerMesVentes, obtenirStatsStock,
  obtenirGainsDelegues, ventesDirectesDelegues,
  ventesEnAttente, validerVente, refuserVente,
  monBilan,
};
