// Configuration globale Jest
// Charge les variables d'environnement de test
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'zezepagnon_test';
process.env.JWT_SECRET = 'secret_de_test_minimum_32_caracteres_pour_jest';
process.env.JWT_REFRESH_SECRET = 'refresh_secret_de_test_minimum_32_caracteres_jest';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.LOG_LEVEL = 'silent';
