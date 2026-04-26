'use strict';

const { ParametreCabinet, User } = require('../models');

const lister = async (req, res) => {
  const parametres = await ParametreCabinet.findAll({ order: [['cle', 'ASC']] });
  // Retourner un objet clé→valeur plus pratique côté frontend
  const map = {};
  parametres.forEach((p) => { map[p.cle] = p.valeur; });
  res.json(map);
};

const mettreAJour = async (req, res) => {
  const updates = req.body; // { commission_stockiste: '30', commission_delegue: '15', nom_cabinet: '...', ... }

  for (const [cle, valeur] of Object.entries(updates)) {
    const param = await ParametreCabinet.findOne({ where: { cle } });
    if (param) {
      await param.update({ valeur: String(valeur) });
    }
  }

  // Propager le taux stockiste global vers commission_rate de tous les stockistes actifs
  if (updates.commission_stockiste !== undefined) {
    const nouveauTaux = parseFloat(updates.commission_stockiste);
    if (!isNaN(nouveauTaux) && nouveauTaux >= 0 && nouveauTaux <= 100) {
      await User.update(
        { commission_rate: nouveauTaux },
        { where: { role: 'stockiste', actif: true } }
      );
    }
  }

  // Retourner l'état mis à jour
  const parametres = await ParametreCabinet.findAll({ order: [['cle', 'ASC']] });
  const map = {};
  parametres.forEach((p) => { map[p.cle] = p.valeur; });
  res.json(map);
};

module.exports = { lister, mettreAJour };
