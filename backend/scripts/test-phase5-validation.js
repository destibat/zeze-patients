#!/usr/bin/env node
/**
 * Phase 5 — Validation complète multi-tenant via API HTTP
 * Teste tous les contrôleurs majeurs avec isolation cabinet.
 *
 * Exécuter depuis le conteneur unified_backend :
 *   node scripts/test-phase5-validation.js
 */
'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('../src/config/env');

const http = require('http');
const { sequelize, Cabinet, User, Produit, ParametreCabinet } = require('../src/models');
const { runWithCabinet } = require('../src/config/cabinetContext');

// ── Cabinets de test ──────────────────────────────────────────────────────────
const CAB_A = { id: '11111111-1111-4111-a111-111111111111', slug: 'patients', domaine: 'patients.zezepagnon.solutions' };
const CAB_B = { id: '22222222-2222-4222-a222-222222222222', slug: 'alice',    domaine: 'alice.zezepagnon.solutions' };

let ok = 0; let ko = 0;
const affirmer = (label, cond) => {
  if (cond) { console.log(`  ✓  ${label}`); ok++; }
  else       { console.error(`  ✗  ${label}`); ko++; }
};

// ── Client HTTP ───────────────────────────────────────────────────────────────
const api = (method, path, body, token, domaine) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const req = http.request({
    host: 'localhost', port: 3000, path: `/api${path}`, method,
    headers: {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Host': domaine || CAB_A.domaine,
    },
  }, (r) => {
    let b = '';
    r.on('data', (d) => b += d);
    r.on('end', () => {
      try { resolve({ status: r.statusCode, body: JSON.parse(b) }); }
      catch { resolve({ status: r.statusCode, body: b }); }
    });
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

const login = async (email, domaine) => {
  const r = await api('POST', '/auth/login', { email, password: 'Admin2026!' }, null, domaine);
  if (r.status !== 200) throw new Error(`Login échoué pour ${email}: ${JSON.stringify(r.body).slice(0, 100)}`);
  return r.body.data.accessToken;
};

// ── Nettoyage données de test ─────────────────────────────────────────────────
const nettoyer = async () => {
  for (const id of [CAB_A.id, CAB_B.id]) {
    await sequelize.query(`DELETE FROM consultations WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM rendez_vous WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM ordonnances WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM factures WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM analyses_biologiques WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM analyses_nfs WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM fichiers_patient WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM patients WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM produits WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM exercices WHERE cabinet_id = '${id}'`);
    await sequelize.query(`DELETE FROM parametres_cabinet WHERE cabinet_id = '${id}' AND cle NOT IN ('nom_cabinet','adresse')`);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────────
const main = async () => {
  await sequelize.authenticate();
  console.log('\n══ Phase 5 — Validation complète multi-tenant ══════════════\n');

  await nettoyer();

  // ── 1. Authentification ───────────────────────────────────────────────────
  console.log('1. Authentification multi-domaine');
  let tokenA, tokenB;
  try {
    tokenA = await login('admin@patients.zeze', CAB_A.domaine);
    tokenB = await login('admin@alice.zeze',    CAB_B.domaine);
    affirmer('Login cabinet A → token OK', !!tokenA);
    affirmer('Login cabinet B → token OK', !!tokenB);
    const payA = JSON.parse(Buffer.from(tokenA.split('.')[1], 'base64').toString());
    const payB = JSON.parse(Buffer.from(tokenB.split('.')[1], 'base64').toString());
    affirmer('JWT A contient cabinet_id A', payA.cabinet_id === CAB_A.id);
    affirmer('JWT B contient cabinet_id B', payB.cabinet_id === CAB_B.id);
  } catch (e) { console.error('  ✗  Login échoué:', e.message); ko += 4; return; }

  // ── 2. Patients — CRUD + isolation ────────────────────────────────────────
  console.log('\n2. Patients — CRUD + isolation');

  const creerPatient = async (token, domaine, nom, n) => {
    const r = await api('POST', '/patients', {
      nom, prenom: 'Test', sexe: 'masculin',
      date_naissance: '1990-01-01', telephone: `060000000${n}`,
    }, token, domaine);
    return r.status === 201 ? r.body.data || r.body : null;
  };

  const pA1 = await creerPatient(tokenA, CAB_A.domaine, 'DupontA', 1);
  const pA2 = await creerPatient(tokenA, CAB_A.domaine, 'MartinA', 2);
  const pB1 = await creerPatient(tokenB, CAB_B.domaine, 'DupontB', 3);

  affirmer('Création patient A1', !!pA1?.id);
  affirmer('Création patient A2', !!pA2?.id);
  affirmer('Création patient B1', !!pB1?.id);
  affirmer('Patient A a cabinet_id A', pA1?.cabinet_id === CAB_A.id);
  affirmer('Patient B a cabinet_id B', pB1?.cabinet_id === CAB_B.id);

  // Isolation lecture
  const listA = await api('GET', '/patients', null, tokenA, CAB_A.domaine);
  const listB = await api('GET', '/patients', null, tokenB, CAB_B.domaine);
  const patientsA = listA.body?.data || [];
  const patientsB = listB.body?.data || [];
  affirmer('Cabinet A voit 2 patients', patientsA.length === 2);
  affirmer('Cabinet B voit 1 patient',  patientsB.length === 1);
  affirmer('Tous les patients de A ont cabinet_id A', patientsA.every(p => p.cabinet_id === CAB_A.id));
  affirmer('Tous les patients de B ont cabinet_id B', patientsB.every(p => p.cabinet_id === CAB_B.id));

  // Cross-cabinet findByPk bloqué
  if (pA1?.id) {
    const crossAccess = await api('GET', `/patients/${pA1.id}`, null, tokenB, CAB_B.domaine);
    affirmer('Patient A1 inaccessible depuis cabinet B', crossAccess.status === 404);
  }

  // Numéro dossier indépendant par cabinet
  affirmer('Numéros dossier générés indépendamment',
    pA1 && pB1 && pA1.numero_dossier !== undefined && pA1.numero_dossier === pB1.numero_dossier);

  // ── 3. Produits ───────────────────────────────────────────────────────────
  console.log('\n3. Produits — isolation');

  const creerProduit = async (token, domaine, nom) => {
    const r = await api('POST', '/produits', { nom, description: 'Test', prix_unitaire: 1000, quantite_stock: 10, seuil_alerte: 2 }, token, domaine);
    return r.status === 201 ? r.body.data || r.body : null;
  };

  const prodA = await creerProduit(tokenA, CAB_A.domaine, 'Produit Cabinet A');
  const prodB = await creerProduit(tokenB, CAB_B.domaine, 'Produit Cabinet B');
  affirmer('Produit créé en A', !!prodA?.id);
  affirmer('Produit créé en B', !!prodB?.id);

  const prodsA = await api('GET', '/produits', null, tokenA, CAB_A.domaine);
  const prodsB = await api('GET', '/produits', null, tokenB, CAB_B.domaine);
  affirmer('Cabinet A voit ses produits uniquement', (prodsA.body?.data || []).every(p => p.cabinet_id === CAB_A.id));
  affirmer('Cabinet B voit ses produits uniquement', (prodsB.body?.data || []).every(p => p.cabinet_id === CAB_B.id));

  // ── 4. Paramètres cabinet ─────────────────────────────────────────────────
  console.log('\n4. Paramètres cabinet — isolation');

  const majParam = async (token, domaine, cle, valeur) => {
    const r = await api('PUT', '/parametres', { [cle]: valeur }, token, domaine);
    return r.status;
  };
  const lireParam = async (token, domaine) => {
    const r = await api('GET', '/parametres', null, token, domaine);
    return r.body;
  };

  await majParam(tokenA, CAB_A.domaine, 'nom_cabinet', 'Cabinet Test Alpha');
  await majParam(tokenB, CAB_B.domaine, 'nom_cabinet', 'Cabinet Test Beta');

  const paramA = await lireParam(tokenA, CAB_A.domaine);
  const paramB = await lireParam(tokenB, CAB_B.domaine);
  affirmer('Cabinet A a son propre nom', paramA?.nom_cabinet === 'Cabinet Test Alpha');
  affirmer('Cabinet B a son propre nom', paramB?.nom_cabinet === 'Cabinet Test Beta');
  affirmer('Les noms sont différents',   paramA?.nom_cabinet !== paramB?.nom_cabinet);

  // ── 5. Statut abonnement ──────────────────────────────────────────────────
  console.log('\n5. Abonnement — statut par cabinet');

  const statutA = await api('GET', '/abonnement/statut', null, tokenA, CAB_A.domaine);
  const statutB = await api('GET', '/abonnement/statut', null, tokenB, CAB_B.domaine);
  affirmer('Statut abonnement A accessible', statutA.status === 200);
  affirmer('Statut abonnement B accessible', statutB.status === 200);
  affirmer('Cabinet A actif', statutA.body?.actif === true);
  affirmer('Cabinet B actif', statutB.body?.actif === true);

  // ── 6. Clé API cabinet (route admin) ─────────────────────────────────────
  console.log('\n6. Clé API Anthropic — par cabinet');

  const cleA = await api('GET', '/parametres/cle-ia', null, tokenA, CAB_A.domaine);
  const cleB = await api('GET', '/parametres/cle-ia', null, tokenB, CAB_B.domaine);
  affirmer('Route cle-ia accessible cabinet A', cleA.status === 200);
  affirmer('Route cle-ia accessible cabinet B', cleB.status === 200);

  // ── 7. Consultation + Ordonnance ─────────────────────────────────────────
  console.log('\n7. Consultations + Ordonnances — isolation');

  if (pA1?.id) {
    const rConsult = await api('POST', `/patients/${pA1.id}/consultations`, {
      date_consultation: new Date().toISOString().slice(0, 10),
      motif: 'Test multi-tenant', type_consultation: 'consultation_generale',
    }, tokenA, CAB_A.domaine);
    affirmer('Consultation créée pour patient A', rConsult.status === 201);

    // Ordonnance depuis la consultation
    const consultId = rConsult.body?.data?.id || rConsult.body?.id;
    if (consultId) {
      const rOrd = await api('POST', '/ordonnances', {
        consultation_id: consultId, patient_id: pA1.id,
        medicaments: [], notes: 'Test MT',
      }, tokenA, CAB_A.domaine);
      affirmer('Ordonnance créée pour consultation A', rOrd.status === 201);
      if (rOrd.status !== 201) console.log('    Ordonnance err:', JSON.stringify(rOrd.body).slice(0, 120));
    }
  }

  // ── 8. Analyse biologique ─────────────────────────────────────────────────
  console.log('\n8. Analyses biologiques — isolation');

  if (pA1?.id) {
    const rAnalyse = await api('POST', `/patients/${pA1.id}/analyses-biologiques`, {
      date_analyse: new Date().toISOString().slice(0, 10),
      panels_demandes: ['nfs'], valeurs_brutes: { nfs: { hemoglobine: 14.5 } },
      sexe_patient: 'M', age_patient: 35, source: 'manuelle',
    }, tokenA, CAB_A.domaine);
    if (rAnalyse.status !== 201) console.log('    Analyse err:', JSON.stringify(rAnalyse.body).slice(0, 120));
    affirmer('Analyse biologique créée', rAnalyse.status === 201);
    const analyseBody = rAnalyse.body?.data || rAnalyse.body;
    affirmer('Analyse a cabinet_id A', analyseBody?.cabinet_id === CAB_A.id);
  }

  // ── 9. Stats admin ────────────────────────────────────────────────────────
  console.log('\n9. Stats admin — scopées au cabinet');

  const statsA = await api('GET', '/stats', null, tokenA, CAB_A.domaine);
  const statsB = await api('GET', '/stats', null, tokenB, CAB_B.domaine);
  affirmer('Stats cabinet A accessibles', statsA.status === 200);
  affirmer('Stats cabinet B accessibles', statsB.status === 200);

  // ── Nettoyage ─────────────────────────────────────────────────────────────
  console.log('\n─ Nettoyage des données de test…');
  await nettoyer();

  // ── Résultats ─────────────────────────────────────────────────────────────
  console.log(`\n══ Résultats : ${ok} ✓ passed, ${ko} ✗ failed ════════════════\n`);
  if (ko > 0) process.exit(1);
};

main()
  .catch((err) => { console.error('\n❌  Erreur fatale :', err.message, '\n', err.stack); process.exit(1); })
  .finally(() => sequelize.close());
