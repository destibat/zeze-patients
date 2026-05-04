'use strict';

const { StockDelegue, MouvementDelegue, FactureAchat, Produit, StockMouvement, User, Exercice, sequelize } = require('../models');
const { Op } = require('sequelize');

// Récupère l'exercice ouvert ou lance une erreur métier
const getExerciceOuvert = async () => {
  const exercice = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
    attributes: ['id', 'numero'],
  });
  return exercice;
};

// Taux délégué fixe : 15% du montant total de la vente
const TAUX_DELEGUE = 0.15;

// Récupère le taux commission du stockiste parrain du délégué
const getTauxStockiste = async (delegueId) => {
  const delegue = await User.findByPk(delegueId, {
    attributes: ['stockiste_id'],
    include: [{ model: User, as: 'stockiste', attributes: ['commission_rate'] }],
  });
  const tauxTotal = parseFloat(delegue?.stockiste?.commission_rate ?? 25) / 100;
  return tauxTotal; // ex: 0.25 si commission_rate = 25
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

  // Taux dynamique selon commission_rate du stockiste parrain
  const tauxTotal = await getTauxStockiste(req.utilisateur.id);
  // MAPA garde (1 - tauxTotal), stockiste+délégué partagent tauxTotal
  // Délégué = 15% fixe, Stockiste = (tauxTotal - 15%)
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
    const gain_delegue        = Math.round(montant_total * TAUX_DELEGUE);
    const commission_stockiste = Math.round(montant_total * (tauxTotal - TAUX_DELEGUE));
    // part_mapa = montant_total - gain_delegue - commission_stockiste

    const mouvement = await MouvementDelegue.create({
      delegue_id: req.utilisateur.id,
      type: 'vente',
      lignes,
      montant_total,
      commission_stockiste,
      gain_delegue,
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

// Stats délégué — ventes_mois = toutes les ventes, gain = uniquement les ventes validées
const obtenirStatsStock = async (req, res) => {
  const debutMois = new Date();
  debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
  const debutMoisStr = debutMois.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const periode = { [Op.between]: [debutMoisStr, today] };

  const [achats, toutesVentes, ventesValidees, nbProduits] = await Promise.all([
    MouvementDelegue.findAll({
      where: { delegue_id: req.utilisateur.id, type: 'achat', date_mouvement: periode },
      attributes: ['montant_total', 'gain_delegue'], raw: true,
    }),
    MouvementDelegue.findAll({
      where: { delegue_id: req.utilisateur.id, type: 'vente', date_mouvement: periode },
      attributes: ['montant_total', 'statut'], raw: true,
    }),
    MouvementDelegue.findAll({
      where: { delegue_id: req.utilisateur.id, type: 'vente', statut: 'valide', date_mouvement: periode },
      attributes: ['montant_total'], raw: true,
    }),
    StockDelegue.count({ where: { delegue_id: req.utilisateur.id } }),
  ]);

  const ventesEnAttente = toutesVentes.filter((v) => v.statut === 'en_attente');
  const gainAchatsMois  = achats.reduce((s, a) => s + (a.gain_delegue || 0), 0);

  res.json({
    achats_mois:       achats.reduce((s, a) => s + (a.montant_total || 0), 0),
    ventes_mois:       toutesVentes.reduce((s, v) => s + (v.montant_total || 0), 0),
    gain_delegue_mois: Math.round(ventesValidees.reduce((s, v) => s + (v.montant_total || 0), 0) * TAUX_DELEGUE) + gainAchatsMois,
    nb_produits_stock: nbProduits,
    ventes_en_attente: ventesEnAttente.length,
  });
};

// Gains des délégués — admin et stockiste : voit gain délégué, part stockiste ET part MAPA
const obtenirGainsDelegues = async (req, res) => {
  const estAdmin = req.utilisateur.role === 'administrateur';
  const debutMois = new Date();
  debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
  const debutMoisStr = debutMois.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const whereDelegue = { role: 'delegue', actif: true };
  if (!estAdmin) whereDelegue.stockiste_id = req.utilisateur.id;

  const delegues = await User.findAll({
    where: whereDelegue,
    attributes: ['id', 'nom', 'prenom'],
    include: [{ model: User, as: 'stockiste', attributes: ['commission_rate'] }],
  });

  if (delegues.length === 0) return res.json([]);

  const ids = delegues.map((d) => d.id);
  const periode = { [Op.between]: [debutMoisStr, today] };

  const [ventes, achats] = await Promise.all([
    MouvementDelegue.findAll({
      where: { delegue_id: { [Op.in]: ids }, type: 'vente', statut: 'valide', date_mouvement: periode },
      attributes: ['delegue_id', 'montant_total'],
      raw: true,
    }),
    MouvementDelegue.findAll({
      where: { delegue_id: { [Op.in]: ids }, type: 'achat', date_mouvement: periode },
      attributes: ['delegue_id', 'montant_total', 'gain_delegue', 'commission_stockiste'],
      raw: true,
    }),
  ]);

  const resultat = delegues.map((d) => {
    const ventesD  = ventes.filter((v) => v.delegue_id === d.id);
    const achatsD  = achats.filter((a) => a.delegue_id === d.id);
    const tauxTotal = parseFloat(d.stockiste?.commission_rate ?? 25);

    const ventes_mois  = ventesD.reduce((s, v) => s + (v.montant_total || 0), 0);
    const achats_mois  = achatsD.reduce((s, a) => s + (a.montant_total || 0), 0);

    const gain_delegue_vente         = Math.round(ventes_mois * 15 / 100);
    const commission_stockiste_vente  = Math.round(ventes_mois * (tauxTotal - 15) / 100);
    const gain_delegue_achat         = achatsD.reduce((s, a) => s + (a.gain_delegue || 0), 0);
    const commission_stockiste_achat  = achatsD.reduce((s, a) => s + (a.commission_stockiste || 0), 0);

    const gain_delegue_mois         = gain_delegue_vente + gain_delegue_achat;
    const commission_stockiste_mois  = commission_stockiste_vente + commission_stockiste_achat;
    const part_mapa_mois            = (ventes_mois + achats_mois) - gain_delegue_mois - commission_stockiste_mois;

    return {
      delegue: { id: d.id, nom: d.nom, prenom: d.prenom },
      taux_commission: tauxTotal,
      ventes_mois: ventes_mois + achats_mois, // CA total pour l'affichage
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
    attributes: ['id', 'nom', 'prenom', 'stockiste_id'],
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
      const tauxTotal = parseFloat(d.stockiste?.commission_rate ?? 25);
      const ventes_total = ventesD.reduce((s, v) => s + (v.montant_total || 0), 0);
      const gain_delegue = Math.round(ventes_total * 15 / 100);
      const commission_stockiste = Math.round(ventes_total * (tauxTotal - 15) / 100);
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

module.exports = {
  listerMonStock, acheter, vendre, listerMesVentes, obtenirStatsStock,
  obtenirGainsDelegues, ventesDirectesDelegues,
  ventesEnAttente, validerVente, refuserVente,
};
