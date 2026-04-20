'use strict';

const { Produit } = require('../models');
const { Op } = require('sequelize');

const lister = async (req, res) => {
  const { q, categorie, actif } = req.query;

  const where = {};
  if (actif !== 'tous') where.actif = true;
  if (categorie) where.categorie = categorie;
  if (q) where.nom = { [Op.like]: `%${q}%` };

  const produits = await Produit.findAll({
    where,
    order: [['nom', 'ASC']],
    attributes: ['id', 'nom', 'description', 'categorie', 'prix_unitaire', 'quantite_stock', 'seuil_alerte', 'actif'],
  });

  res.json(produits);
};

const obtenir = async (req, res) => {
  const produit = await Produit.findByPk(req.params.id);
  if (!produit) return res.status(404).json({ message: 'Produit introuvable' });
  res.json(produit);
};

const creer = async (req, res) => {
  const { nom, description, categorie, prix_unitaire, quantite_stock, seuil_alerte } = req.body;
  const produit = await Produit.create({ nom, description, categorie, prix_unitaire, quantite_stock, seuil_alerte });
  res.status(201).json(produit);
};

const modifier = async (req, res) => {
  const produit = await Produit.findByPk(req.params.id);
  if (!produit) return res.status(404).json({ message: 'Produit introuvable' });
  const { nom, description, categorie, prix_unitaire, quantite_stock, seuil_alerte, actif } = req.body;
  await produit.update({ nom, description, categorie, prix_unitaire, quantite_stock, seuil_alerte, actif });
  res.json(produit);
};

module.exports = { lister, obtenir, creer, modifier };
