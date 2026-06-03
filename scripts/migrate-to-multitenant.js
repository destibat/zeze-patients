#!/usr/bin/env node
/**
 * Migration multi-tenant — copie les données de N bases mono-cabinet
 * vers une base unifiée avec cabinet_id.
 *
 * Usage (dans le conteneur ou sur le serveur avec accès aux DBs) :
 *   node scripts/migrate-to-multitenant.js
 *
 * Variables d'environnement requises — target :
 *   TARGET_HOST, TARGET_PORT, TARGET_DB, TARGET_USER, TARGET_PASS
 *
 * Variables d'environnement requises — sources (une par cabinet) :
 *   Définir CABINETS_JSON ou utiliser les variables individuelles ci-dessous.
 *   Voir CABINETS ci-dessous pour la structure.
 *
 * En cas d'erreur, le script s'arrête et affiche le problème.
 * Les données déjà insérées (INSERT IGNORE) ne posent pas de problème
 * en cas de relance partielle.
 */
'use strict';

const mysql = require('mysql2/promise');

// ── Configuration des cabinets sources ───────────────────────────────────────
// IDs STABLES (ne pas changer après la migration prod)
const CABINETS = process.env.CABINETS_JSON
  ? JSON.parse(process.env.CABINETS_JSON)
  : [
      {
        id:       process.env.PATIENTS_CABINET_ID || '11111111-1111-4111-a111-111111111111',
        slug:     'patients',
        domaine:  'patients.zezepagnon.solutions',
        nom:      process.env.PATIENTS_NOM       || 'ZEZEPAGNON RACINES D\'AFRIQUE',
        host:     process.env.PATIENTS_HOST      || '127.0.0.1',
        port:     parseInt(process.env.PATIENTS_PORT     || '3306', 10),
        database: process.env.PATIENTS_DB,
        user:     process.env.PATIENTS_USER,
        password: process.env.PATIENTS_PASS,
      },
      {
        id:       process.env.ALICE_CABINET_ID  || '22222222-2222-4222-a222-222222222222',
        slug:     'alice',
        domaine:  'alice.zezepagnon.solutions',
        nom:      process.env.ALICE_NOM         || 'ZEZEPAGNON — Pharmacopée africaine',
        host:     process.env.ALICE_HOST        || '127.0.0.1',
        port:     parseInt(process.env.ALICE_PORT       || '3306', 10),
        database: process.env.ALICE_DB,
        user:     process.env.ALICE_USER,
        password: process.env.ALICE_PASS,
      },
      {
        id:       process.env.CISSE_CABINET_ID  || '33333333-3333-4333-a333-333333333333',
        slug:     'cisse',
        domaine:  'cisse.zezepagnon.solutions',
        nom:      process.env.CISSE_NOM         || 'CIDIA ZEZEPAGNON',
        host:     process.env.CISSE_HOST        || '127.0.0.1',
        port:     parseInt(process.env.CISSE_PORT       || '3306', 10),
        database: process.env.CISSE_DB,
        user:     process.env.CISSE_USER,
        password: process.env.CISSE_PASS,
      },
    ];

const TARGET = {
  host:     process.env.TARGET_HOST || '127.0.0.1',
  port:     parseInt(process.env.TARGET_PORT || '3306', 10),
  database: process.env.TARGET_DB   || 'zezepagnon_unified',
  user:     process.env.TARGET_USER,
  password: process.env.TARGET_PASS,
};

// Tables dans l'ordre FK (les dépendances en premier)
const TABLES = [
  'users',
  'produits',
  'patients',
  'exercices',
  'consultations',
  'rendez_vous',
  'ordonnances',
  'factures',
  'factures_achat',
  'commandes_approvisionnement',
  'stock_mouvements',
  'stock_delegue',
  'mouvements_delegue',
  'analyses_nfs',
  'analyses_biologiques',
  'fichiers_patient',
  'prets_emprunts',
  'parametres_cabinet',
  'audit_logs',
  // 'refresh_tokens' — ignorés (expirent rapidement)
];

const BATCH = 500; // lignes par batch INSERT

// ── Utilitaires ───────────────────────────────────────────────────────────────
const connect = async (cfg) => mysql.createConnection({
  host: cfg.host, port: cfg.port, database: cfg.database,
  user: cfg.user, password: cfg.password,
  timezone: '+00:00',
  typeCast: false, // récupère toutes les valeurs brutes (évite les conversions)
});

const colonnes = async (conn, table) => {
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [table],
  );
  return rows.map((r) => {
    const v = r.COLUMN_NAME;
    return Buffer.isBuffer(v) ? v.toString() : String(v);
  }).filter((c) => c !== 'cabinet_id');
};

const migrerTable = async (src, tgt, cabinetId, table) => {
  // Vérifier si la table existe dans la source
  const [exists] = await src.execute(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  if (!exists[0].n) {
    console.log(`    ⚠  ${table} absente dans la source — ignorée`);
    return 0;
  }

  const cols = await colonnes(src, table);
  if (!cols.length) { console.log(`    ⚠  ${table} vide — ignorée`); return 0; }

  const colList      = cols.map((c) => `\`${c}\``).join(', ');
  const targetCols   = `\`cabinet_id\`, ${colList}`;
  const placeholders = `?, ${cols.map(() => '?').join(', ')}`;

  const [rows] = await src.execute(`SELECT ${colList} FROM \`${table}\``);
  if (!rows.length) { console.log(`    ✓  ${table}: 0 lignes`); return 0; }

  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const lot = rows.slice(i, i + BATCH);
    for (const row of lot) {
      const vals = [cabinetId, ...cols.map((c) => (row[c] !== undefined ? row[c] : null))];
      await tgt.execute(
        `INSERT IGNORE INTO \`${table}\` (${targetCols}) VALUES (${placeholders})`,
        vals,
      );
    }
    total += lot.length;
  }
  console.log(`    ✓  ${table}: ${total} lignes`);
  return total;
};

// ── Main ──────────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('\n══ Migration multi-tenant ══════════════════════════════════════\n');

  if (!TARGET.user || !TARGET.database) {
    console.error('❌  Variables TARGET_USER, TARGET_DB, TARGET_PASS requises.');
    process.exit(1);
  }

  const tgt = await connect(TARGET);
  console.log(`✓  Connecté à la cible : ${TARGET.database}@${TARGET.host}\n`);

  // Désactiver les FK checks pour l'import
  await tgt.execute('SET FOREIGN_KEY_CHECKS = 0');
  await tgt.execute('SET UNIQUE_CHECKS = 0');

  let grandTotal = 0;

  for (const cabinet of CABINETS) {
    if (!cabinet.database || !cabinet.user) {
      console.log(`⚠  Cabinet ${cabinet.slug} — variables DB manquantes, ignoré\n`);
      continue;
    }

    console.log(`── Cabinet : ${cabinet.nom} (${cabinet.slug})`);
    console.log(`   Source  : ${cabinet.database}@${cabinet.host}:${cabinet.port}`);

    // Insérer le cabinet dans la table cabinets
    await tgt.execute(
      `INSERT IGNORE INTO cabinets (id, slug, domaine, nom, actif, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [cabinet.id, cabinet.slug, cabinet.domaine, cabinet.nom],
    );
    console.log(`   Cabinet enregistré (id: ${cabinet.id})\n`);

    let src;
    try {
      src = await connect(cabinet);
    } catch (err) {
      console.error(`   ❌  Connexion échouée : ${err.message}\n`);
      continue;
    }

    let cabinetTotal = 0;
    for (const table of TABLES) {
      const n = await migrerTable(src, tgt, cabinet.id, table);
      cabinetTotal += n;
    }
    await src.end();

    console.log(`\n   Sous-total ${cabinet.slug} : ${cabinetTotal} lignes migrées\n`);
    grandTotal += cabinetTotal;
  }

  // Réactiver les contraintes
  await tgt.execute('SET FOREIGN_KEY_CHECKS = 1');
  await tgt.execute('SET UNIQUE_CHECKS = 1');
  await tgt.end();

  console.log(`══ Terminé — ${grandTotal} lignes migrées au total ══════════════\n`);
};

main().catch((err) => {
  console.error('\n❌  Erreur fatale :', err.message);
  process.exit(1);
});
