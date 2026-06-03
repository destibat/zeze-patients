#!/usr/bin/env node
/**
 * Test end-to-end du script de migration multi-tenant en dev.
 *
 * Ce script :
 *   1. Crée 2 DBs "legacy" (sans cabinet_id) dans le dev MariaDB
 *   2. Les peuple avec des données de test
 *   3. Crée une DB "unified" vide avec le bon schéma (après migrations)
 *   4. Lance la migration
 *   5. Vérifie les comptages et l'isolation
 *   6. Nettoie
 *
 * Exécuter depuis le conteneur backend :
 *   node scripts/test-migration-scenario.js
 */
'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('../src/config/env');

const mysql = require('mysql2/promise');

const ROOT_PASS = process.env.DB_ROOT_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || 'DevZeze2026!';
const DB_HOST   = 'db'; // nom du conteneur MariaDB dans le réseau Docker

const LEGACY_A = { database: 'zeze_legacy_a', cabinet: { id: 'aaaaaaaa-aaaa-4000-a000-aaaaaaaaaaaa', slug: 'legacy-a', domaine: 'legacy-a.dev', nom: 'Cabinet Legacy A' } };
const LEGACY_B = { database: 'zeze_legacy_b', cabinet: { id: 'bbbbbbbb-bbbb-4000-b000-bbbbbbbbbbbb', slug: 'legacy-b', domaine: 'legacy-b.dev', nom: 'Cabinet Legacy B' } };
const UNIFIED  = { database: 'zeze_unified_test' };

const root = () => mysql.createConnection({ host: DB_HOST, user: 'root', password: ROOT_PASS, timezone: '+00:00' });
const connect = (db) => mysql.createConnection({ host: DB_HOST, user: 'root', password: ROOT_PASS, database: db, timezone: '+00:00', typeCast: false });

const q = async (conn, sql, params = []) => { await conn.execute(sql, params); };

// ── Créer le schéma legacy (sous-ensemble des colonnes actuelles, sans cabinet_id) ──
const creerSchemaLegacy = async (conn, db) => {
  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4`);
  const c = await connect(db);

  await q(c, `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY, nom VARCHAR(100), prenom VARCHAR(100),
    email VARCHAR(255) UNIQUE, password_hash VARCHAR(255), role VARCHAR(50),
    actif TINYINT(1) DEFAULT 1, created_at DATETIME DEFAULT NOW(), updated_at DATETIME DEFAULT NOW()
  )`);

  await q(c, `CREATE TABLE IF NOT EXISTS patients (
    id CHAR(36) PRIMARY KEY, numero_dossier VARCHAR(20) UNIQUE,
    nom VARCHAR(100), prenom VARCHAR(100), sexe ENUM('masculin','feminin','autre'),
    date_naissance DATE, telephone VARCHAR(20), archive TINYINT(1) DEFAULT 0,
    created_by CHAR(36), created_at DATETIME DEFAULT NOW(), updated_at DATETIME DEFAULT NOW()
  )`);

  await q(c, `CREATE TABLE IF NOT EXISTS parametres_cabinet (
    id CHAR(36) PRIMARY KEY, cle VARCHAR(100) UNIQUE, valeur VARCHAR(500),
    created_at DATETIME DEFAULT NOW(), updated_at DATETIME DEFAULT NOW()
  )`);

  await c.end();
};

// ── Peupler avec des données de test ─────────────────────────────────────────
const peupler = async (db, prefix, nb) => {
  const c = await connect(db);
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('Test1234!', 8);
  const { v4: uuid } = require('uuid');

  // User admin
  const userId = uuid();
  await q(c, `INSERT IGNORE INTO users (id, nom, prenom, email, password_hash, role) VALUES (?, 'Admin', ?, ?, ?, 'administrateur')`,
    [userId, prefix, `admin@${prefix}.dev`, hash]);

  // Patients
  for (let i = 1; i <= nb; i++) {
    await q(c, `INSERT IGNORE INTO patients (id, numero_dossier, nom, prenom, sexe, date_naissance, telephone, created_by) VALUES (?, ?, ?, ?, 'masculin', '1990-01-01', '0600000000', ?)`,
      [uuid(), `${prefix.toUpperCase()}-${String(i).padStart(5, '0')}`, `Patient${prefix}`, `Num${i}`, userId]);
  }

  // Paramètres
  await q(c, `INSERT IGNORE INTO parametres_cabinet (id, cle, valeur) VALUES (?, 'nom_cabinet', ?)`,
    [uuid(), `Cabinet ${prefix}`]);

  await c.end();
};

// ── Créer la DB unifiée avec le bon schéma ────────────────────────────────────
const creerDbUnifiee = async (rootConn) => {
  await rootConn.execute(`CREATE DATABASE IF NOT EXISTS \`${UNIFIED.database}\` CHARACTER SET utf8mb4`);
  // Copier le schéma depuis zeze_dev (qui a déjà le bon schéma multi-tenant)
  await rootConn.execute(`
    CREATE TABLE IF NOT EXISTS \`${UNIFIED.database}\`.cabinets
    LIKE \`${process.env.DB_NAME || 'zeze_dev'}\`.cabinets
  `);
  const tables = ['users','patients','parametres_cabinet'];
  for (const t of tables) {
    await rootConn.execute(`CREATE TABLE IF NOT EXISTS \`${UNIFIED.database}\`.\`${t}\` LIKE \`${process.env.DB_NAME || 'zeze_dev'}\`.\`${t}\``);
  }
};

// ── Migration manuelle (inline — mêmes principes que migrate-to-multitenant.js) ──
const migrerVersUnifie = async (srcDb, cabinetCfg) => {
  const src = await connect(srcDb);
  const tgt = await connect(UNIFIED.database);
  await tgt.execute('SET FOREIGN_KEY_CHECKS = 0');

  // Cabinet
  await tgt.execute(`INSERT IGNORE INTO cabinets (id, slug, domaine, nom, actif, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
    [cabinetCfg.id, cabinetCfg.slug, cabinetCfg.domaine, cabinetCfg.nom]);

  for (const table of ['users', 'patients', 'parametres_cabinet']) {
    const [[{ cols: rawCols }]] = await src.execute(
      `SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS cols
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    const cols = Buffer.isBuffer(rawCols) ? rawCols.toString() : String(rawCols || '');
    const colList = cols.split(',').filter(c => c !== 'cabinet_id').map(c => `\`${c}\``).join(', ');
    const [rows] = await src.execute(`SELECT ${colList} FROM \`${table}\``);
    const colNames = cols.split(',').filter((c) => c !== 'cabinet_id');
    const ph = `?, ${colNames.map(() => '?').join(', ')}`;

    for (const row of rows) {
      const vals = [cabinetCfg.id, ...colNames.map(c => row[c] ?? null)];
      await tgt.execute(`INSERT IGNORE INTO \`${table}\` (\`cabinet_id\`, ${colList}) VALUES (${ph})`, vals);
    }
    console.log(`    ✓  ${table}: ${rows.length} lignes depuis ${srcDb}`);
  }

  await tgt.execute('SET FOREIGN_KEY_CHECKS = 1');
  await src.end();
  await tgt.end();
};

// ── Vérification ─────────────────────────────────────────────────────────────
const verifier = async (cabinetA, cabinetB) => {
  const tgt = await connect(UNIFIED.database);
  let ok = 0; let ko = 0;
  const affirmer = (label, cond) => { if (cond) { console.log(`  ✓  ${label}`); ok++; } else { console.error(`  ✗  ${label}`); ko++; } };

  const cnt = async (table, where) => { const [[r]] = await tgt.execute(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE ${where}`); return Number(r.n); };

  affirmer('Cabinet A a 1 user',    await cnt('users',   `cabinet_id='${cabinetA.id}'`) === 1);
  affirmer('Cabinet B a 1 user',    await cnt('users',   `cabinet_id='${cabinetB.id}'`) === 1);
  affirmer('Cabinet A a 3 patients',await cnt('patients',`cabinet_id='${cabinetA.id}'`) === 3);
  affirmer('Cabinet B a 5 patients',await cnt('patients',`cabinet_id='${cabinetB.id}'`) === 5);
  affirmer('Aucun patient sans cabinet_id', await cnt('patients', 'cabinet_id IS NULL') === 0);
  affirmer('Isolation: A ne voit pas B', await cnt('patients', `cabinet_id='${cabinetA.id}' AND nom='PatientlegacyB'`) === 0);

  await tgt.end();
  return { ok, ko };
};

// ── Nettoyage ─────────────────────────────────────────────────────────────────
const nettoyer = async (rootConn) => {
  for (const db of [LEGACY_A.database, LEGACY_B.database, UNIFIED.database]) {
    await rootConn.execute(`DROP DATABASE IF EXISTS \`${db}\``);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('\n══ Test migration multi-tenant — scénario dev ══════════════\n');
  const rootConn = await root();

  try {
    // 1. Créer les bases legacy
    console.log('1. Création des bases legacy');
    await creerSchemaLegacy(rootConn, LEGACY_A.database);
    await creerSchemaLegacy(rootConn, LEGACY_B.database);
    console.log('   ✓ Bases legacy créées\n');

    // 2. Peupler
    console.log('2. Peuplement des données de test');
    await peupler(LEGACY_A.database, 'legacyA', 3);  // 3 patients dans A
    await peupler(LEGACY_B.database, 'legacyB', 5);  // 5 patients dans B
    console.log('   ✓ Données insérées\n');

    // 3. DB unifiée
    console.log('3. Création de la DB unifiée');
    await creerDbUnifiee(rootConn);
    console.log('   ✓ DB unifiée créée\n');

    // 4. Migration
    console.log('4. Migration des données');
    await migrerVersUnifie(LEGACY_A.database, LEGACY_A.cabinet);
    await migrerVersUnifie(LEGACY_B.database, LEGACY_B.cabinet);
    console.log('   ✓ Migration terminée\n');

    // 5. Vérification
    console.log('5. Vérification');
    const { ok, ko } = await verifier(LEGACY_A.cabinet, LEGACY_B.cabinet);
    console.log(`\n══ Résultats : ${ok} ✓ passed, ${ko} ✗ failed ════════════════\n`);
    if (ko > 0) process.exit(1);
  } finally {
    console.log('Nettoyage…');
    await nettoyer(rootConn);
    await rootConn.end();
  }
};

main().catch((err) => { console.error('❌  Erreur :', err.message, err.stack); process.exit(1); });
