const { Sequelize, Op } = require('sequelize');
const config = require('../config/env');
const logger = require('../config/logger');
const dbConfig = require('../config/database');
const { getCabinetId } = require('../config/cabinetContext');

const env = config.env;
const conf = dbConfig[env];

const sequelize = new Sequelize(conf.database, conf.username, conf.password, conf);

// Chargement de tous les modèles
const Cabinet = require('./Cabinet')(sequelize);
const User = require('./User')(sequelize);
const RefreshToken = require('./RefreshToken')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const Patient = require('./Patient')(sequelize);
const Produit = require('./Produit')(sequelize);
const Consultation = require('./Consultation')(sequelize);
const Ordonnance = require('./Ordonnance')(sequelize);
const StockMouvement = require('./StockMouvement')(sequelize);
const RendezVous = require('./RendezVous')(sequelize);
const Facture = require('./Facture')(sequelize);
const ParametreCabinet = require('./ParametreCabinet')(sequelize);
const StockDelegue = require('./StockDelegue')(sequelize);
const MouvementDelegue = require('./MouvementDelegue')(sequelize);
const FichierPatient = require('./FichierPatient')(sequelize);
const AnalyseNFS = require('./AnalyseNFS')(sequelize);
const AnalyseBiologique = require('./AnalyseBiologique')(sequelize);
const Exercice = require('./Exercice')(sequelize);
const FactureAchat = require('./FactureAchat')(sequelize);
const CommandeApprovisionnement = require('./CommandeApprovisionnement')(sequelize);
const PretEmprunt = require('./PretEmprunt')(sequelize);

const models = { Cabinet, User, RefreshToken, AuditLog, Patient, Produit, Consultation, Ordonnance, StockMouvement, RendezVous, Facture, ParametreCabinet, StockDelegue, MouvementDelegue, FichierPatient, AnalyseNFS, AnalyseBiologique, Exercice, FactureAchat, CommandeApprovisionnement, PretEmprunt };

// Initialisation des associations
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

// ── Hooks multi-tenant — isolation automatique par cabinet_id ─────────────────
// Tables soumises à l'isolation (cabinets elle-même est exclue)
const TABLES_MT = new Set([
  'users', 'refresh_tokens', 'audit_logs',
  'patients', 'produits', 'consultations', 'ordonnances',
  'stock_mouvements', 'rendez_vous', 'factures',
  'parametres_cabinet', 'stock_delegue', 'mouvements_delegue',
  'fichiers_patient', 'analyses_nfs', 'analyses_biologiques',
  'exercices', 'factures_achat', 'commandes_approvisionnement',
  'prets_emprunts',
]);

// Injecte cabinet_id dans les WHERE de toutes les lectures
sequelize.addHook('beforeFind', (options) => {
  if (options._bypass_cabinet) return;
  const cabinetId = getCabinetId();
  if (!cabinetId) return;
  if (!TABLES_MT.has(options.model?.tableName)) return;
  options.where = options.where
    ? { [Op.and]: [options.where, { cabinet_id: cabinetId }] }
    : { cabinet_id: cabinetId };
});

// Injecte cabinet_id à la création d'une instance
sequelize.addHook('beforeCreate', (instance, options) => {
  if (options._bypass_cabinet) return;
  const cabinetId = getCabinetId();
  if (!cabinetId) return;
  if (!TABLES_MT.has(instance.constructor?.tableName)) return;
  if (!instance.cabinet_id) instance.cabinet_id = cabinetId;
});

// Injecte cabinet_id lors d'un bulkCreate
sequelize.addHook('beforeBulkCreate', (instances, options) => {
  if (options._bypass_cabinet) return;
  const cabinetId = getCabinetId();
  if (!cabinetId) return;
  if (!TABLES_MT.has(options.model?.tableName)) return;
  instances.forEach((inst) => { if (!inst.cabinet_id) inst.cabinet_id = cabinetId; });
});

// ── Connexion ─────────────────────────────────────────────────────────────────
const connecterDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`Base de données connectée : ${conf.database} @ ${conf.host}`);
  } catch (err) {
    logger.error('Erreur de connexion à la base de données :', err);
    throw err;
  }
};

module.exports = { sequelize, connecterDB, ...models };
