'use strict';

const jwt = require('jsonwebtoken');
const { runWithCabinet } = require('../config/cabinetContext');

const identifierCabinet = async (req, res, next) => {
  // Priorité 1 : JWT contient cabinet_id (routes authentifiées)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      if (payload?.cabinet_id) {
        return runWithCabinet(payload.cabinet_id, next);
      }
    } catch {
      // Token invalide ou expiré — on passe au fallback
    }
  }

  // Priorité 2 : Domaine du Host header (routes publiques : login, refresh)
  try {
    const { Cabinet } = require('../models');
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    const cabinet = await Cabinet.findOne({ where: { domaine: host }, _bypass_cabinet: true });
    if (cabinet) {
      req.cabinet = cabinet;
      return runWithCabinet(cabinet.id, next);
    }

    // Fallback dev : utilise le premier cabinet disponible si domaine non trouvé
    if (process.env.NODE_ENV !== 'production') {
      const premier = await Cabinet.findOne({ _bypass_cabinet: true });
      if (premier) {
        req.cabinet = premier;
        return runWithCabinet(premier.id, next);
      }
    }
  } catch (err) {
    // Ne bloque jamais sur une erreur de cabinet
  }

  next();
};

module.exports = { identifierCabinet };
