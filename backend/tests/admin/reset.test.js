require('../setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Mocks Sequelize (évite une vraie base de données en CI) ---
jest.mock('../../src/models', () => {
  const adminMock = {
    id: 'uuid-admin-001',
    role: 'administrateur',
    actif: true,
    password_hash: null, // sera initialisé dans beforeAll
    verifierMotDePasse: jest.fn(),
  };

  return {
    connecterDB: jest.fn().mockResolvedValue(true),
    sequelize: {
      transaction: jest.fn(async (cb) => cb({})),
      query: jest.fn().mockResolvedValue([[], []]),
    },
    User: {
      findByPk: jest.fn().mockResolvedValue(adminMock),
      findAll: jest.fn().mockResolvedValue([]),
    },
    Produit: { findAll: jest.fn().mockResolvedValue([]) },
    StockDelegue: { bulkCreate: jest.fn().mockResolvedValue([]) },
    AuditLog: { create: jest.fn().mockResolvedValue(true) },
    Cabinet: { findOne: jest.fn().mockResolvedValue(null) },
    adminMock,
  };
});

const app = require('../../src/app');
const { sequelize, AuditLog, adminMock } = require('../../src/models');

const genererToken = () =>
  jwt.sign(
    { id: adminMock.id, role: 'administrateur', cabinet_id: 'cab-test-001' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );

beforeAll(async () => {
  adminMock.password_hash = await bcrypt.hash('MotDePasse123!', 10);
  adminMock.verifierMotDePasse.mockImplementation((mdp) =>
    bcrypt.compare(mdp, adminMock.password_hash),
  );
});

afterEach(() => jest.clearAllMocks());

describe('POST /api/admin/reset — protection par mot de passe', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).post('/api/admin/reset').send({});
    expect(res.status).toBe(401);
  });

  it('retourne 403 sans mot de passe et ne touche pas la base', async () => {
    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${genererToken()}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Mot de passe invalide');
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESET_ECHEC' }),
    );
  });

  it('retourne 403 avec un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${genererToken()}`)
      .send({ password: 'mauvais' });
    expect(res.status).toBe(403);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('effectue le reset avec le bon mot de passe, sans purger audit_logs, et journalise', async () => {
    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${genererToken()}`)
      .send({ password: 'MotDePasse123!' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(sequelize.transaction).toHaveBeenCalled();

    const sqls = sequelize.query.mock.calls.map(([sql]) => sql);
    expect(sqls.length).toBeGreaterThan(0);
    expect(sqls.some((sql) => sql.includes('audit_logs'))).toBe(false);

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESET_DONNEES', user_id: adminMock.id }),
    );
  });
});

describe('POST /api/admin/reset-stock-delegues — protection par mot de passe', () => {
  it('retourne 403 sans mot de passe', async () => {
    const res = await request(app)
      .post('/api/admin/reset-stock-delegues')
      .set('Authorization', `Bearer ${genererToken()}`)
      .send({ unites_par_produit: 5 });
    expect(res.status).toBe(403);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('réinitialise avec le bon mot de passe et journalise', async () => {
    const res = await request(app)
      .post('/api/admin/reset-stock-delegues')
      .set('Authorization', `Bearer ${genererToken()}`)
      .send({ unites_par_produit: 5, password: 'MotDePasse123!' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESET_STOCK_DELEGUES' }),
    );
  });
});
