require('../setup');

const request = require('supertest');
const jwt = require('jsonwebtoken');

// --- Mocks Sequelize (évite une vraie base de données en CI) ---
jest.mock('../../src/models', () => ({
  connecterDB: jest.fn().mockResolvedValue(true),
  sequelize: {
    transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })),
    query: jest.fn().mockResolvedValue([[], []]),
  },
  Cabinet: { findOne: jest.fn(), create: jest.fn().mockResolvedValue({}) },
  User: { create: jest.fn().mockResolvedValue({}), findByPk: jest.fn(), findOne: jest.fn() },
  ParametreCabinet: { create: jest.fn().mockResolvedValue({}), findOne: jest.fn() },
  Produit: { findAll: jest.fn().mockResolvedValue([]), bulkCreate: jest.fn().mockResolvedValue([]) },
  AuditLog: { create: jest.fn().mockResolvedValue(true) },
}));

const app = require('../../src/app');
const { Cabinet, Produit } = require('../../src/models');

const tokenSuperAdmin = () =>
  jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '15m' });

const corpsCreation = {
  slug: 'nouveau',
  domaine: 'nouveau.zezepagnon.solutions',
  nom: 'Cabinet Nouveau',
  admin_email: 'admin@nouveau.local',
  admin_password: 'MotDePasse123!',
};

const produitsReference = [
  { nom: 'Baume MAPA', description: 'Baume', categorie: 'soins', prix_unitaire: 2500, seuil_alerte: 5, quantite_stock: 57 },
  { nom: 'Tisane MAPA', description: null, categorie: 'tisanes', prix_unitaire: 1500, seuil_alerte: 3, quantite_stock: 12 },
];

afterEach(() => jest.clearAllMocks());

describe('POST /api/superadmin/cabinets — catalogue initial', () => {
  it('retourne 401 sans token superadmin', async () => {
    const res = await request(app).post('/api/superadmin/cabinets').send(corpsCreation);
    expect(res.status).toBe(401);
  });

  it('copie les produits actifs du cabinet de référence avec un stock à zéro', async () => {
    Cabinet.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.slug === 'patients' ? { id: 'ref-cab-001' } : null),
    );
    Produit.findAll.mockResolvedValue(produitsReference);

    const res = await request(app)
      .post('/api/superadmin/cabinets')
      .set('Authorization', `Bearer ${tokenSuperAdmin()}`)
      .send(corpsCreation);

    expect(res.status).toBe(201);
    expect(res.body.produits_copies).toBe(2);

    // Les produits actifs de la référence sont bien ceux demandés
    expect(Produit.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cabinet_id: 'ref-cab-001', actif: true } }),
    );

    // Copie : mêmes champs catalogue, stock à 0, rattachée au nouveau cabinet
    const [lignes] = Produit.bulkCreate.mock.calls[0];
    expect(lignes).toHaveLength(2);
    for (const ligne of lignes) {
      expect(ligne.quantite_stock).toBe(0);
      expect(ligne.actif).toBe(true);
      expect(ligne.cabinet_id).toBe(res.body.cabinet_id);
    }
    expect(lignes[0]).toMatchObject({ nom: 'Baume MAPA', prix_unitaire: 2500, seuil_alerte: 5 });
  });

  it('crée quand même le cabinet si la référence est introuvable (fail-soft)', async () => {
    Cabinet.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/superadmin/cabinets')
      .set('Authorization', `Bearer ${tokenSuperAdmin()}`)
      .send(corpsCreation);

    expect(res.status).toBe(201);
    expect(res.body.produits_copies).toBe(0);
    expect(Produit.bulkCreate).not.toHaveBeenCalled();
  });
});
