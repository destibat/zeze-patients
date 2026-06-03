#!/usr/bin/env node
/**
 * Vérification post-migration multi-tenant.
 * Compare les comptages de chaque table source avec la DB unifiée.
 *
 * Usage :
 *   node scripts/verify-migration-mt.js
 *
 * Mêmes variables d'environnement que migrate-to-multitenant.js
 */
'use strict';

const mysql = require('mysql2/promise');

const CABINETS = process.env.CABINETS_JSON
  ? JSON.parse(process.env.CABINETS_JSON)
  : [
      { id: process.env.PATIENTS_CABINET_ID || '11111111-1111-4111-a111-111111111111', slug: 'patients', host: process.env.PATIENTS_HOST || '127.0.0.1', port: parseInt(process.env.PATIENTS_PORT || '3306'), database: process.env.PATIENTS_DB, user: process.env.PATIENTS_USER, password: process.env.PATIENTS_PASS },
      { id: process.env.ALICE_CABINET_ID   || '22222222-2222-4222-a222-222222222222', slug: 'alice',    host: process.env.ALICE_HOST    || '127.0.0.1', port: parseInt(process.env.ALICE_PORT    || '3306'), database: process.env.ALICE_DB,    user: process.env.ALICE_USER,    password: process.env.ALICE_PASS    },
      { id: process.env.CISSE_CABINET_ID  || '33333333-3333-4333-a333-333333333333',  slug: 'cisse',   host: process.env.CISSE_HOST   || '127.0.0.1', port: parseInt(process.env.CISSE_PORT   || '3306'), database: process.env.CISSE_DB,   user: process.env.CISSE_USER,   password: process.env.CISSE_PASS   },
    ];

const TARGET = {
  host: process.env.TARGET_HOST || '127.0.0.1',
  port: parseInt(process.env.TARGET_PORT || '3306'),
  database: process.env.TARGET_DB || 'zezepagnon_unified',
  user: process.env.TARGET_USER,
  password: process.env.TARGET_PASS,
};

const TABLES = ['users','patients','consultations','ordonnances','factures','analyses_biologiques','produits','parametres_cabinet','rendez_vous','exercices','audit_logs'];

const connect = (cfg) => mysql.createConnection({ host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.user, password: cfg.password, timezone: '+00:00' });

const count = async (conn, table, where = '') => {
  const sql = `SELECT COUNT(*) AS n FROM \`${table}\`${where ? ' WHERE ' + where : ''}`;
  try {
    const [[row]] = await conn.execute(sql);
    return Number(row.n);
  } catch { return -1; }
};

const main = async () => {
  console.log('\n══ Vérification post-migration multi-tenant ══════════════════\n');

  const tgt = await connect(TARGET);
  let ok = 0; let ko = 0;

  for (const cabinet of CABINETS) {
    if (!cabinet.database || !cabinet.user) { console.log(`⚠  ${cabinet.slug} — ignoré\n`); continue; }
    console.log(`── Cabinet : ${cabinet.slug} (${cabinet.id})`);

    let src;
    try { src = await connect(cabinet); }
    catch (e) { console.error(`   ❌  Connexion source : ${e.message}\n`); continue; }

    for (const table of TABLES) {
      const srcCount = await count(src, table);
      if (srcCount === -1) { console.log(`   ⚠  ${table}: absent dans source`); continue; }
      const tgtCount = await count(tgt, table, `cabinet_id = '${cabinet.id}'`);
      const match = srcCount === tgtCount;
      if (match) { console.log(`   ✓  ${table}: ${srcCount} lignes`); ok++; }
      else        { console.error(`   ✗  ${table}: source=${srcCount}, cible=${tgtCount} — DIVERGENCE`); ko++; }
    }

    await src.end();
    console.log();
  }

  // Vérification isolation globale : chaque ligne a un cabinet_id valide
  console.log('── Intégrité isolation');
  for (const table of TABLES) {
    const orphelines = await count(tgt, table, 'cabinet_id IS NULL');
    if (orphelines === 0) { console.log(`   ✓  ${table}: aucune ligne orpheline`); ok++; }
    else                  { console.error(`   ✗  ${table}: ${orphelines} lignes sans cabinet_id`); ko++; }
  }

  await tgt.end();
  console.log(`\n══ Résultats : ${ok} ✓ passed, ${ko} ✗ failed ══════════════════\n`);
  if (ko > 0) process.exit(1);
};

main().catch((err) => { console.error('❌  Erreur :', err.message); process.exit(1); });
