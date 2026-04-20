require('../setup');

const request = require('supertest');
const bcrypt = require('bcrypt');

// --- Mocks Sequelize (évite une vraie base de données en CI) ---
jest.mock('../../src/models', () => {
  const utilisateurMock = {
    id: 'uuid-test-001',
    nom: 'Test',
    prenom: 'Admin',
    email: 'admin@test.local',
    role: 'administrateur',
    actif: true,
    doit_changer_mdp: false,
    derniere_connexion: null,
    password_hash: null, // sera initialisé dans beforeAll
    verifierMotDePasse: jest.fn(),
    update: jest.fn().mockResolvedValue(true),
  };

  return {
    connecterDB: jest.fn().mockResolvedValue(true),
    User: {
      scope: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(utilisateurMock),
    },
    RefreshToken: {
      create: jest.fn().mockResolvedValue(true),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1),
    },
    AuditLog: {
      create: jest.fn().mockResolvedValue(true),
    },
    utilisateurMock,
  };
});

const app = require('../../src/app');
const { User, RefreshToken, utilisateurMock } = require('../../src/models');

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    utilisateurMock.password_hash = await bcrypt.hash('MotDePasse123!', 12);
    utilisateurMock.verifierMotDePasse.mockImplementation((mdp) =>
      bcrypt.compare(mdp, utilisateurMock.password_hash)
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('retourne 400 si email ou mot de passe manquant', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.local' });
    expect(res.status).toBe(400);
    expect(res.body.succes).toBe(false);
  });

  it('retourne 401 si utilisateur non trouvé', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@test.local', password: 'mauvais' });
    expect(res.status).toBe(401);
    expect(res.body.succes).toBe(false);
  });

  it('retourne 401 si mot de passe incorrect', async () => {
    User.scope.mockReturnValue(User);
    User.findOne.mockResolvedValue({ ...utilisateurMock, verifierMotDePasse: jest.fn().mockResolvedValue(false) });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'mauvais' });
    expect(res.status).toBe(401);
  });

  it('retourne 200 avec tokens si connexion réussie', async () => {
    User.scope.mockReturnValue(User);
    User.findOne.mockResolvedValue(utilisateurMock);
    utilisateurMock.verifierMotDePasse.mockResolvedValue(true);
    RefreshToken.create.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'MotDePasse123!' });

    expect(res.status).toBe(200);
    expect(res.body.succes).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.utilisateur.role).toBe('administrateur');
  });
});

describe('GET /api/auth/me', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('retourne 401 avec un token invalide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token_invalide');
    expect(res.status).toBe(401);
  });
});
