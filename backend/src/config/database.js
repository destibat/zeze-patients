// Configuration Sequelize CLI + runtime
// Ce fichier est utilisé à la fois par sequelize-cli et par l'application

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
require('dotenv').config({ path: '.env' });

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'zezepagnon_dev',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  dialect: 'mysql',
  timezone: '+00:00',
  logging: false,
  define: {
    underscored: true,       // snake_case pour les colonnes
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

module.exports = {
  development: {
    ...base,
    logging: (sql) => require('./logger').debug(sql),
  },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'zezepagnon_test',
    logging: false,
  },
  production: {
    ...base,
    logging: false,
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  },
};
