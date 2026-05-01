const express = require('express');
const { limiteurGeneral } = require('../middlewares/rateLimiter');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const patientRoutes = require('./patientRoutes');
const produitRoutes = require('./produitRoutes');
const ordonnanceRoutes = require('./ordonnanceRoutes');
const { authentifier } = require('../middlewares/authenticate');
const { asyncHandler } = require('../middlewares/errorHandler');
const { obtenirStats, obtenirStatsDetaillees } = require('../controllers/statsController');

const router = express.Router();

// Limiteur de taux global sur toutes les routes /api
router.use(limiteurGeneral);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/produits', produitRoutes);
router.use('/ordonnances', ordonnanceRoutes);
router.use('/stock', require('./stockRoutes'));
router.use('/rendez-vous', require('./rendezVousRoutes'));
router.get('/consultations', authentifier, asyncHandler(require('../controllers/consultationController').listerToutes));
router.use('/factures', require('./factureRoutes'));
router.use('/stock-delegue', require('./stockDelegueRoutes'));
router.use('/factures-achat', require('./factureAchatRoutes'));
router.use('/commandes-appro', require('./commandeApproRoutes'));
router.use('/parametres', require('./parametreRoutes'));
router.use('/exercices', require('./exerciceRoutes'));
router.get('/stats', authentifier, asyncHandler(obtenirStats));
router.get('/stats/detaillees', authentifier, asyncHandler(obtenirStatsDetaillees));

// Routes de développement — jamais chargées en production
if (process.env.NODE_ENV === 'development') {
  router.use('/dev', require('./devRoutes'));
}

// Route 404 pour les endpoints inconnus
router.use('*', (req, res) => {
  res.status(404).json({ succes: false, message: `Route introuvable : ${req.originalUrl}` });
});

module.exports = router;
