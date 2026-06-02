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
const { verifierAbonnement, obtenirStatut } = require('../middlewares/verifierAbonnement');
const { identifierCabinet } = require('../middlewares/identifierCabinet');
const { sequelize } = require('../models');

const router = express.Router();

// Limiteur de taux global sur toutes les routes /api
router.use(limiteurGeneral);

// Identification du cabinet — toujours en premier (domain ou JWT)
router.use(identifierCabinet);

// Routes sans vérification d'abonnement
router.use('/auth', authRoutes);
router.use('/superadmin', require('./superadminRoutes'));

// Statut de l'abonnement — accessible à tout utilisateur authentifié
router.get('/abonnement/statut', authentifier, asyncHandler(async (req, res) => {
  const statut = await obtenirStatut();
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const [countRow] = await sequelize.query(
    `SELECT COUNT(*) AS nb FROM analyses_biologiques WHERE analyse_ia_texte IS NOT NULL AND created_at >= :debutMois`,
    { replacements: { debutMois }, type: sequelize.QueryTypes.SELECT },
  );
  const [quotaRow] = await sequelize.query(
    `SELECT valeur FROM parametres_cabinet WHERE cle = 'quota_ia_mensuel' LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT },
  );
  const quota = parseInt(quotaRow?.valeur || '100', 10);
  const nb = Number(countRow.nb);
  res.json({
    actif: statut.actif,
    expire_le: statut.expireLe,
    quota_ia_mensuel: quota,
    nb_analyses_ce_mois: nb,
    peut_utiliser_ia: statut.actif && nb < quota,
  });
}));

// Middleware abonnement : bloque les écritures si inactif/expiré
router.use(verifierAbonnement);

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
router.use('/prets-emprunts', require('./pretEmpruntRoutes'));
router.use('/admin', require('./adminRoutes'));

// Routes de développement — jamais chargées en production
if (process.env.NODE_ENV === 'development') {
  router.use('/dev', require('./devRoutes'));
}

// Route 404 pour les endpoints inconnus
router.use('*', (req, res) => {
  res.status(404).json({ succes: false, message: `Route introuvable : ${req.originalUrl}` });
});

module.exports = router;
