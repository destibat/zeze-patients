'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sequelize, Cabinet, User, ParametreCabinet } = require('../models');
const { invaliderCache } = require('../middlewares/verifierAbonnement');
const { getCabinetId } = require('../config/cabinetContext');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const authentifierSuperAdmin = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token superadmin requis' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (payload.role !== 'superadmin') throw new Error('Rôle insuffisant');
    next();
  } catch {
    return res.status(401).json({ message: 'Token superadmin invalide ou expiré' });
  }
};

// POST /api/superadmin/auth
router.post('/auth', (req, res) => {
  const secret = process.env.SUPERADMIN_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Super-admin non configuré sur ce serveur' });
  }
  if (!req.body.secret || req.body.secret !== secret) {
    return res.status(401).json({ message: 'Secret incorrect' });
  }
  const token = jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '4h' });
  res.json({ token });
});

const lireAbonnement = async (cabinetId) => {
  const rows = await sequelize.query(
    `SELECT cle, valeur FROM parametres_cabinet WHERE cle IN ('abonnement_actif','abonnement_expire_le','quota_ia_mensuel','nom_cabinet') AND cabinet_id = :cabinetId`,
    { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT },
  );
  const map = Object.fromEntries(rows.map((r) => [r.cle, r.valeur]));
  return {
    nom_cabinet: map.nom_cabinet || null,
    actif: map.abonnement_actif !== '0',
    expire_le: map.abonnement_expire_le || null,
    quota_ia_mensuel: parseInt(map.quota_ia_mensuel || '100', 10),
  };
};

const ecrireParam = async (cabinetId, cle, valeur) => {
  await sequelize.query(
    `INSERT INTO parametres_cabinet (id, cabinet_id, cle, valeur, created_at, updated_at)
     VALUES (UUID(), :cabinetId, :cle, :valeur, NOW(), NOW())
     ON DUPLICATE KEY UPDATE valeur = :valeur, updated_at = NOW()`,
    { replacements: { cabinetId, cle, valeur } },
  );
};

// GET /api/superadmin/abonnement
router.get('/abonnement', authentifierSuperAdmin, asyncHandler(async (req, res) => {
  const cabinetId = getCabinetId();
  const abonnement = await lireAbonnement(cabinetId);
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const [stats] = await sequelize.query(
    `SELECT COUNT(*) AS nb FROM analyses_biologiques WHERE analyse_ia_texte IS NOT NULL AND created_at >= :debutMois AND cabinet_id = :cabinetId`,
    { replacements: { debutMois, cabinetId }, type: sequelize.QueryTypes.SELECT },
  );
  res.json({ ...abonnement, nb_analyses_ce_mois: Number(stats.nb) });
}));

// PUT /api/superadmin/abonnement
router.put('/abonnement', authentifierSuperAdmin, asyncHandler(async (req, res) => {
  const cabinetId = getCabinetId();
  const { actif, expire_le, quota_ia_mensuel } = req.body;
  if (actif !== undefined) await ecrireParam(cabinetId, 'abonnement_actif', actif ? '1' : '0');
  if (expire_le !== undefined) await ecrireParam(cabinetId, 'abonnement_expire_le', expire_le || '');
  if (quota_ia_mensuel !== undefined) {
    await ecrireParam(cabinetId, 'quota_ia_mensuel', String(Math.max(0, parseInt(quota_ia_mensuel, 10) || 100)));
  }
  invaliderCache(cabinetId);
  res.json({ ok: true, abonnement: await lireAbonnement(cabinetId) });
}));

// GET /api/superadmin/cabinets — liste tous les cabinets
router.get('/cabinets', authentifierSuperAdmin, asyncHandler(async (req, res) => {
  const cabinets = await Cabinet.findAll({
    attributes: ['id', 'slug', 'domaine', 'nom', 'actif', 'created_at'],
    order: [['created_at', 'ASC']],
    _bypass_cabinet: true,
  });
  res.json(cabinets);
}));

// POST /api/superadmin/cabinets — crée un cabinet + son premier admin
router.post('/cabinets', authentifierSuperAdmin, asyncHandler(async (req, res) => {
  const { slug, domaine, nom, adresse = '', admin_email, admin_password, admin_nom, admin_prenom } = req.body;

  if (!slug || !domaine || !nom || !admin_email || !admin_password) {
    return res.status(400).json({ message: 'Champs requis : slug, domaine, nom, admin_email, admin_password' });
  }

  const slugNormalise = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const existant = await Cabinet.findOne({ where: { slug: slugNormalise }, _bypass_cabinet: true });
  if (existant) return res.status(409).json({ message: `Un cabinet avec le slug "${slugNormalise}" existe déjà` });

  const cabinetId = uuidv4();
  const opts = { _bypass_cabinet: true };

  const transaction = await sequelize.transaction();
  try {
    await Cabinet.create({ id: cabinetId, slug: slugNormalise, domaine, nom, actif: true }, { ...opts, transaction });

    await User.create({
      nom: admin_nom || 'Admin',
      prenom: admin_prenom || '',
      email: admin_email,
      password_hash: admin_password,
      role: 'administrateur',
      cabinet_id: cabinetId,
      actif: true,
    }, { ...opts, transaction });

    const params = [
      ['nom_cabinet', nom],
      ['adresse', adresse],
      ['commission_stockiste', '30'],
      ['commission_delegue', '15'],
      ['abonnement_actif', '1'],
    ];
    for (const [cle, valeur] of params) {
      await ParametreCabinet.create({ cabinet_id: cabinetId, cle, valeur }, { ...opts, transaction });
    }

    await transaction.commit();
    res.status(201).json({ ok: true, cabinet_id: cabinetId, slug: slugNormalise, domaine });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}));

module.exports = router;
