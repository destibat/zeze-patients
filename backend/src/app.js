const config = require('./config/env');
const logger = require('./config/logger');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const { connecterDB } = require('./models');
const routes = require('./routes');
const { gestionErreurs } = require('./middlewares/errorHandler');
const { authentifier } = require('./middlewares/authenticate');

const app = express();

// Nginx reverse proxy — trust first hop so rate-limit sees real client IPs
app.set('trust proxy', 1);

// --- Sécurité HTTP ---
app.use(helmet());

// --- CORS ---
const originesAutorisees = config.app.frontendUrl
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

// Domaines wildcard autorisés (ex: *.zezepagnon.solutions pour tous les cabinets MT)
const WILDCARD_DOMAINS = ['zezepagnon.solutions'];

const origineAutorisee = (origin) => {
  if (!origin) return true;
  if (config.env === 'development') return true;
  if (originesAutorisees.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return WILDCARD_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (origineAutorisee(origin)) return callback(null, true);
    callback(new Error(`Origine CORS non autorisée : ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- Compression ---
app.use(compression());

// --- Parsing JSON ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Logs des requêtes HTTP ---
const formatMorgan = config.env === 'development' ? 'dev' : 'combined';
app.use(morgan(formatMorgan, {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// --- Fichiers uploadés (photos patients, examens) ---
// Données médicales : accès réservé aux utilisateurs authentifiés (JWT requis,
// donc récupération côté frontend en fetch + blob, pas en <img src> direct)
app.use('/uploads', authentifier, express.static(path.join(__dirname, '..', 'uploads')));

// --- Routes API ---
app.use('/api', routes);

// --- Santé de l'API ---
app.get('/health', (req, res) => {
  res.json({
    statut: 'ok',
    application: config.app.name,
    version: require('../package.json').version,
    environnement: config.env,
    horodatage: new Date().toISOString(),
  });
});

// --- Gestion globale des erreurs (doit être en dernier) ---
app.use(gestionErreurs);

// --- Démarrage ---
const demarrer = async () => {
  try {
    await connecterDB();
    app.listen(config.port, () => {
      logger.info(`🌿 ${config.app.name} démarré sur le port ${config.port} [${config.env}]`);
    });
  } catch (err) {
    logger.error('Impossible de démarrer l\'application :', err);
    process.exit(1);
  }
};

demarrer();

module.exports = app;
