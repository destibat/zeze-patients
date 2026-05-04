'use strict';

const { PretEmprunt, Produit, User, StockMouvement, sequelize } = require('../models');
const { Op } = require('sequelize');

const includeDetails = [
  { model: User,   as: 'stockiste', attributes: ['id', 'nom', 'prenom'] },
  { model: Produit, as: 'produit',  attributes: ['id', 'nom', 'quantite_stock'] },
];

// Vérifie que l'opération appartient au stockiste connecté (ou qu'on est admin)
const verifierAcces = (pret, utilisateur) => {
  if (utilisateur.role === 'administrateur') return true;
  return pret.stockiste_id === utilisateur.id;
};

// ── POST /api/prets-emprunts ──────────────────────────────────────────────────
const creer = async (req, res) => {
  const {
    type, partenaire_nom, partenaire_telephone, partenaire_cabinet,
    produit_id, quantite, date_pret, note,
  } = req.body;

  if (!['pret', 'emprunt'].includes(type))
    return res.status(400).json({ message: 'Type invalide (pret ou emprunt)' });
  if (!partenaire_nom?.trim())
    return res.status(400).json({ message: 'Le nom du partenaire est obligatoire' });
  if (!produit_id)
    return res.status(400).json({ message: 'Le produit est obligatoire' });
  if (!Number.isInteger(quantite) || quantite <= 0)
    return res.status(400).json({ message: 'La quantité doit être un entier positif' });

  const dateOp = date_pret || new Date().toISOString().split('T')[0];
  const t = await sequelize.transaction();

  try {
    const produit = await Produit.findByPk(produit_id, { transaction: t, lock: true });
    if (!produit) { await t.rollback(); return res.status(404).json({ message: 'Produit introuvable' }); }

    // Prêt : le stock doit être suffisant
    if (type === 'pret' && produit.quantite_stock < quantite) {
      await t.rollback();
      return res.status(400).json({
        message: `Stock insuffisant pour ce prêt (disponible : ${produit.quantite_stock}, demandé : ${quantite})`,
      });
    }

    const delta      = type === 'pret' ? -quantite : +quantite;
    const stockApres = produit.quantite_stock + delta;

    await produit.update({ quantite_stock: stockApres }, { transaction: t });

    const motif = type === 'pret'
      ? `Prêt à ${partenaire_nom.trim()}`
      : `Emprunt auprès de ${partenaire_nom.trim()}`;

    await StockMouvement.create({
      produit_id,
      type:       type === 'pret' ? 'sortie' : 'entree',
      quantite:   delta,
      motif,
      user_id:    req.utilisateur.id,
      stock_apres: stockApres,
    }, { transaction: t });

    const pret = await PretEmprunt.create({
      type,
      stockiste_id:          req.utilisateur.role === 'administrateur'
                               ? (req.body.stockiste_id || req.utilisateur.id)
                               : req.utilisateur.id,
      partenaire_nom:        partenaire_nom.trim(),
      partenaire_telephone:  partenaire_telephone || null,
      partenaire_cabinet:    partenaire_cabinet || null,
      produit_id,
      quantite,
      quantite_rendue: 0,
      date_pret: dateOp,
      statut: 'en_cours',
      note: note || null,
    }, { transaction: t });

    await t.commit();

    const pretAvecDetails = await PretEmprunt.findByPk(pret.id, { include: includeDetails });
    res.status(201).json({ ...pretAvecDetails.toJSON(), stock_apres: stockApres });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ── GET /api/prets-emprunts ───────────────────────────────────────────────────
const lister = async (req, res) => {
  const { type, statut, date_debut, date_fin, partenaire } = req.query;
  const where = {};

  if (req.utilisateur.role !== 'administrateur')
    where.stockiste_id = req.utilisateur.id;

  if (type)   where.type   = type;
  if (statut) where.statut = statut;

  if (date_debut && date_fin)
    where.date_pret = { [Op.between]: [date_debut, date_fin] };
  else if (date_debut)
    where.date_pret = { [Op.gte]: date_debut };

  if (partenaire)
    where.partenaire_nom = { [Op.like]: `%${partenaire}%` };

  const prets = await PretEmprunt.findAll({
    where,
    include: includeDetails,
    order: [['date_pret', 'DESC'], ['created_at', 'DESC']],
  });

  res.json(prets);
};

// ── GET /api/prets-emprunts/stats ─────────────────────────────────────────────
const obtenirStats = async (req, res) => {
  const filtreStockiste = req.utilisateur.role !== 'administrateur'
    ? { stockiste_id: req.utilisateur.id }
    : {};

  const [pretsEnCours, empruntsEnCours] = await Promise.all([
    PretEmprunt.count({ where: { ...filtreStockiste, type: 'pret',    statut: { [Op.in]: ['en_cours', 'rendu_partiel'] } } }),
    PretEmprunt.count({ where: { ...filtreStockiste, type: 'emprunt', statut: { [Op.in]: ['en_cours', 'rendu_partiel'] } } }),
  ]);

  res.json({ prets_en_cours: pretsEnCours, emprunts_en_cours: empruntsEnCours });
};

// ── GET /api/prets-emprunts/:id ───────────────────────────────────────────────
const obtenirParId = async (req, res) => {
  const pret = await PretEmprunt.findByPk(req.params.id, { include: includeDetails });
  if (!pret) return res.status(404).json({ message: 'Opération introuvable' });
  if (!verifierAcces(pret, req.utilisateur)) return res.status(403).json({ message: 'Accès refusé' });
  res.json(pret);
};

// ── PATCH /api/prets-emprunts/:id/retourner ───────────────────────────────────
const retourner = async (req, res) => {
  const pret = await PretEmprunt.findByPk(req.params.id, { include: includeDetails });
  if (!pret) return res.status(404).json({ message: 'Opération introuvable' });
  if (!verifierAcces(pret, req.utilisateur)) return res.status(403).json({ message: 'Accès refusé' });
  if (pret.statut === 'rendu') return res.status(409).json({ message: 'Cette opération est déjà totalement rendue' });

  const dateRetour     = req.body.date_retour || new Date().toISOString().split('T')[0];
  const resteARendre   = pret.quantite - pret.quantite_rendue;
  const quantiteRendue = req.body.quantite_rendue !== undefined
    ? parseInt(req.body.quantite_rendue)
    : resteARendre;

  if (!Number.isInteger(quantiteRendue) || quantiteRendue <= 0)
    return res.status(400).json({ message: 'La quantité rendue doit être un entier positif' });
  if (quantiteRendue > resteARendre)
    return res.status(400).json({ message: `Impossible de rendre plus que le restant (${resteARendre})` });

  const t = await sequelize.transaction();
  try {
    const produit = await Produit.findByPk(pret.produit_id, { transaction: t, lock: true });

    // Retour d'un prêt : le stock revient (entree)
    // Retour d'un emprunt : le stock diminue (sortie)
    const delta      = pret.type === 'pret' ? +quantiteRendue : -quantiteRendue;
    const stockApres = produit.quantite_stock + delta;

    if (stockApres < 0) {
      await t.rollback();
      return res.status(400).json({ message: `Stock insuffisant pour le retour (disponible : ${produit.quantite_stock})` });
    }

    await produit.update({ quantite_stock: stockApres }, { transaction: t });

    const motif = pret.type === 'pret'
      ? `Retour de prêt — ${pret.partenaire_nom}`
      : `Retour d'emprunt — ${pret.partenaire_nom}`;

    await StockMouvement.create({
      produit_id:  pret.produit_id,
      type:        pret.type === 'pret' ? 'entree' : 'sortie',
      quantite:    delta,
      motif,
      user_id:     req.utilisateur.id,
      stock_apres: stockApres,
    }, { transaction: t });

    const totalRendu = pret.quantite_rendue + quantiteRendue;
    const nouveauStatut = totalRendu >= pret.quantite ? 'rendu' : 'rendu_partiel';

    await pret.update({
      quantite_rendue: totalRendu,
      statut:          nouveauStatut,
      date_retour:     nouveauStatut === 'rendu' ? dateRetour : pret.date_retour,
    }, { transaction: t });

    await t.commit();

    const pretMaj = await PretEmprunt.findByPk(pret.id, { include: includeDetails });
    res.json({ ...pretMaj.toJSON(), stock_apres: stockApres });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ── PATCH /api/prets-emprunts/:id ─────────────────────────────────────────────
const modifier = async (req, res) => {
  const pret = await PretEmprunt.findByPk(req.params.id);
  if (!pret) return res.status(404).json({ message: 'Opération introuvable' });
  if (!verifierAcces(pret, req.utilisateur)) return res.status(403).json({ message: 'Accès refusé' });
  if (pret.statut !== 'en_cours')
    return res.status(409).json({ message: 'Seules les opérations en cours peuvent être modifiées' });

  const { partenaire_nom, partenaire_telephone, partenaire_cabinet, note } = req.body;
  await pret.update({
    partenaire_nom:       partenaire_nom?.trim() || pret.partenaire_nom,
    partenaire_telephone: partenaire_telephone !== undefined ? partenaire_telephone : pret.partenaire_telephone,
    partenaire_cabinet:   partenaire_cabinet   !== undefined ? partenaire_cabinet   : pret.partenaire_cabinet,
    note:                 note !== undefined ? note : pret.note,
  });

  const pretMaj = await PretEmprunt.findByPk(pret.id, { include: includeDetails });
  res.json(pretMaj);
};

// ── DELETE /api/prets-emprunts/:id ────────────────────────────────────────────
const supprimer = async (req, res) => {
  const pret = await PretEmprunt.findByPk(req.params.id);
  if (!pret) return res.status(404).json({ message: 'Opération introuvable' });
  if (!verifierAcces(pret, req.utilisateur)) return res.status(403).json({ message: 'Accès refusé' });

  const t = await sequelize.transaction();
  try {
    const produit = await Produit.findByPk(pret.produit_id, { transaction: t, lock: true });

    // Annuler le mouvement initial (inverser l'effet sur le stock)
    // pret → le stock avait diminué, on restitue
    // emprunt → le stock avait augmenté, on retire
    const deltaAnnulation = pret.type === 'pret'
      ? +(pret.quantite - pret.quantite_rendue)   // restituer ce qui n'a pas encore été rendu
      : -(pret.quantite - pret.quantite_rendue);  // retirer ce qui n'a pas encore été rendu

    if (deltaAnnulation !== 0) {
      const stockApres = produit.quantite_stock + deltaAnnulation;
      if (stockApres < 0) {
        await t.rollback();
        return res.status(400).json({ message: 'Impossible de supprimer : le stock deviendrait négatif' });
      }
      await produit.update({ quantite_stock: stockApres }, { transaction: t });
      await StockMouvement.create({
        produit_id:  pret.produit_id,
        type:        deltaAnnulation > 0 ? 'entree' : 'sortie',
        quantite:    deltaAnnulation,
        motif:       `Annulation ${pret.type === 'pret' ? 'prêt' : 'emprunt'} — ${pret.partenaire_nom}`,
        user_id:     req.utilisateur.id,
        stock_apres: stockApres,
      }, { transaction: t });
    }

    await pret.destroy({ transaction: t });
    await t.commit();
    res.status(204).end();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { creer, lister, obtenirStats, obtenirParId, retourner, modifier, supprimer };
