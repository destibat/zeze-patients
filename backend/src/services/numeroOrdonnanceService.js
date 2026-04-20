'use strict';

const { Ordonnance } = require('../models');
const { Op } = require('sequelize');

const genererNumeroOrdonnance = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `ORD-${annee}-`;
  const derniere = await Ordonnance.findOne({
    where: { numero: { [Op.like]: `${prefixe}%` } },
    order: [['numero', 'DESC']],
  });
  const sequence = derniere ? parseInt(derniere.numero.split('-')[2], 10) + 1 : 1;
  return `${prefixe}${String(sequence).padStart(5, '0')}`;
};

module.exports = { genererNumeroOrdonnance };
