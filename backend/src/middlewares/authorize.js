const { erreur } = require('../utils/apiResponse');

// Vérifie que l'utilisateur connecté possède l'un des rôles autorisés
const autoriser = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return erreur(res, 'Non authentifié', 401);
    }

    if (!rolesAutorises.includes(req.utilisateur.role)) {
      return erreur(res, 'Accès refusé : permissions insuffisantes', 403);
    }

    next();
  };
};

// Raccourcis pour les rôles courants
const seulementAdmin = autoriser('administrateur');
const adminOuMedecin = autoriser('administrateur', 'stockiste');
const adminMedecinOuDelegue = autoriser('administrateur', 'stockiste', 'delegue');
const tousLesRoles = autoriser('administrateur', 'stockiste', 'secretaire', 'delegue');

module.exports = { autoriser, seulementAdmin, adminOuMedecin, adminMedecinOuDelegue, tousLesRoles };
