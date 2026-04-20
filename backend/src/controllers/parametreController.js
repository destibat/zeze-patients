'use strict';

const { ParametreCabinet } = require('../models');

const lister = async (req, res) => {
  const parametres = await ParametreCabinet.findAll({ order: [['cle', 'ASC']] });
  res.json(parametres);
};

const mettreAJour = async (req, res) => {
  const updates = req.body; // { commission_stockiste: '25', commission_proprietaire: '30', ... }

  for (const [cle, valeur] of Object.entries(updates)) {
    const param = await ParametreCabinet.findOne({ where: { cle } });
    if (param) {
      await param.update({ valeur: String(valeur) });
    }
  }

  const parametres = await ParametreCabinet.findAll({ order: [['cle', 'ASC']] });
  res.json(parametres);
};

module.exports = { lister, mettreAJour };
