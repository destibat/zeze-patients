'use strict';

const { Produit, StockMouvement, sequelize } = require('../models');
const { Op } = require('sequelize');

const listerProduits = async (req, res) => {
  const produits = await Produit.findAll({
    order: [['nom', 'ASC']],
    attributes: ['id', 'nom', 'categorie', 'prix_unitaire', 'quantite_stock', 'seuil_alerte', 'actif'],
  });
  res.json(produits);
};

const obtenirMouvements = async (req, res) => {
  const { produitId } = req.params;
  const mouvements = await StockMouvement.findAll({
    where: { produit_id: produitId },
    include: [{ model: require('../models').User, as: 'user', attributes: ['nom', 'prenom'] }],
    order: [['created_at', 'DESC']],
    limit: 50,
  });
  res.json(mouvements);
};

const enregistrerMouvement = async (req, res) => {
  const { produitId } = req.params;
  const { type, quantite, motif, date_livraison } = req.body;

  if (!['entree', 'sortie', 'ajustement'].includes(type)) {
    return res.status(400).json({ message: 'Type de mouvement invalide' });
  }
  if (!Number.isInteger(quantite) || quantite === 0) {
    return res.status(400).json({ message: 'Quantité invalide' });
  }

  const t = await sequelize.transaction();
  try {
    const produit = await Produit.findByPk(produitId, { transaction: t, lock: true });
    if (!produit) { await t.rollback(); return res.status(404).json({ message: 'Produit introuvable' }); }

    const delta = type === 'sortie' ? -Math.abs(quantite) : Math.abs(quantite);
    const stockApres = produit.quantite_stock + delta;

    if (stockApres < 0) {
      await t.rollback();
      return res.status(409).json({ message: `Stock insuffisant (disponible : ${produit.quantite_stock})` });
    }

    await produit.update({ quantite_stock: stockApres }, { transaction: t });

    const mouvement = await StockMouvement.create({
      produit_id: produitId,
      type,
      quantite: delta,
      motif,
      date_livraison: type === 'entree' ? (date_livraison || null) : null,
      user_id: req.utilisateur.id,
      stock_apres: stockApres,
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ mouvement, stock_actuel: stockApres });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { listerProduits, obtenirMouvements, enregistrerMouvement };
