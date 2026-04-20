const { Sequelize } = require('sequelize');
const config = require('../config/env');
const logger = require('../config/logger');
const dbConfig = require('../config/database');

const env = config.env;
const conf = dbConfig[env];

const sequelize = new Sequelize(conf.database, conf.username, conf.password, conf);

// Chargement de tous les modèles
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

const models = { User, RefreshToken, AuditLog, Patient, Produit, Consultation, Ordonnance, StockMouvement, RendezVous, Facture, ParametreCabinet };

// Initialisation des associations
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

// Connexion et synchronisation (sans alter/force en production)
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
