'use strict';

const { sequelize } = require('../models');
const { getCabinetId } = require('../config/cabinetContext');

const caches = new Map(); // cabinetId → { actif, expireLe, ts }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const GRACE_JOURS = 5;

const obtenirStatut = async () => {
  const cabinetId = getCabinetId();
  const now = Date.now();
  const cached = caches.get(cabinetId);
  if (cached && now - cached.ts < CACHE_TTL) return cached;

  try {
    const rows = await sequelize.query(
      `SELECT cle, valeur FROM parametres_cabinet
       WHERE cle IN ('abonnement_actif','abonnement_expire_le','abonnement_prochaine_echeance')
       AND cabinet_id = :cabinetId`,
      { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT },
    );
    const map = Object.fromEntries(rows.map((r) => [r.cle, r.valeur]));
    let actifParam = map.abonnement_actif !== '0';
    const expireLe = map.abonnement_expire_le || null;
    const expirePasse = expireLe ? new Date(expireLe) < new Date() : false;
    const prochaineEcheance = map.abonnement_prochaine_echeance || null;

    // Auto-suspension si la période de grâce est dépassée
    if (prochaineEcheance && actifParam) {
      const limiteGrace = new Date(prochaineEcheance);
      limiteGrace.setDate(limiteGrace.getDate() + GRACE_JOURS);
      if (new Date() > limiteGrace) {
        await sequelize.query(
          `INSERT INTO parametres_cabinet (id, cabinet_id, cle, valeur, created_at, updated_at)
           VALUES (UUID(), :cabinetId, 'abonnement_actif', '0', NOW(), NOW())
           ON DUPLICATE KEY UPDATE valeur = '0', updated_at = NOW()`,
          { replacements: { cabinetId } },
        ).catch(() => {});
        actifParam = false;
      }
    }

    const result = { actif: actifParam && !expirePasse, expireLe, ts: now };
    caches.set(cabinetId, result);
    return result;
  } catch {
    return { actif: true, expireLe: null }; // fail open
  }
};

const invaliderCache = (cabinetId) => {
  if (cabinetId) caches.delete(cabinetId);
  else caches.clear();
};

// Bloque toutes les écritures si l'abonnement est inactif, expiré, ou en dépassement de grâce.
// Les lectures (GET/HEAD/OPTIONS) et les routes superadmin/auth passent toujours.
const verifierAbonnement = async (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  try {
    const { actif } = await obtenirStatut();
    if (!actif) {
      return res.status(403).json({
        code: 'ABONNEMENT_INACTIF',
        message: 'Abonnement inactif ou expiré. Contactez ZEZEPAGNON pour renouveler votre abonnement.',
      });
    }
  } catch {
    // fail open : en cas d'erreur DB, on laisse passer
  }
  next();
};

module.exports = { verifierAbonnement, invaliderCache, obtenirStatut };
