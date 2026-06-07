'use strict';

const { BonCommandeMapa } = require('../models');
const { Op } = require('sequelize');

const genererNumeroBonCommande = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `BC-${annee}-`;
  const dernier = await BonCommandeMapa.findOne({
    where: { numero: { [Op.like]: `${prefixe}%` } },
    order: [['numero', 'DESC']],
  });
  const sequence = dernier ? parseInt(dernier.numero.split('-')[2], 10) + 1 : 1;
  return `${prefixe}${String(sequence).padStart(6, '0')}`;
};

module.exports = { genererNumeroBonCommande };
