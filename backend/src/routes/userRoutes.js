const express = require('express');
const {
  listerUtilisateurs,
  obtenirUtilisateur,
  creerUtilisateur,
  modifierUtilisateur,
  reinitialiserMotDePasse,
  desactiverUtilisateur,
} = require('../controllers/userController');
const { authentifier } = require('../middlewares/authenticate');
const { seulementAdmin } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Toutes les routes utilisateurs sont réservées à l'administrateur
router.use(authentifier, seulementAdmin);

router.get('/', asyncHandler(listerUtilisateurs));
router.post('/', asyncHandler(creerUtilisateur));
router.get('/:id', asyncHandler(obtenirUtilisateur));
router.put('/:id', asyncHandler(modifierUtilisateur));
router.put('/:id/reinitialiser-mdp', asyncHandler(reinitialiserMotDePasse));
router.delete('/:id', asyncHandler(desactiverUtilisateur));

module.exports = router;
