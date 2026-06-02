#!/usr/bin/env node
/**
 * Test d'isolation multi-tenant — Phase 2
 * Vérifie qu'un cabinet ne peut pas voir les données d'un autre.
 * À exécuter dans le conteneur backend : node scripts/test-isolation-multitenant.js
 */
'use strict';

require('../backend/src/config/env');
const { Cabinet, User, Patient, sequelize } = require('../backend/src/models');
const { runWithCabinet } = require('../backend/src/config/cabinetContext');
const bcrypt = require('bcryptjs');

// IDs stables pour les cabinets de test (facilite le cleanup)
const ID_A = 'ffffffff-0000-4000-a000-000000000001';
const ID_B = 'ffffffff-0000-4000-a000-000000000002';

let ok = 0;
let ko = 0;

const affirmer = (label, condition) => {
  if (condition) {
    console.log(`  ✓ ${label}`);
    ok++;
  } else {
    console.error(`  ✗ ${label}`);
    ko++;
  }
};

const nettoyer = async () => {
  await sequelize.query(`DELETE FROM patients WHERE cabinet_id IN ('${ID_A}','${ID_B}')`);
  await sequelize.query(`DELETE FROM users    WHERE cabinet_id IN ('${ID_A}','${ID_B}')`);
  await sequelize.query(`DELETE FROM cabinets WHERE id        IN ('${ID_A}','${ID_B}')`);
};

const main = async () => {
  await sequelize.authenticate();
  console.log('\n── Isolation multi-tenant — tests ──────────────────────────\n');

  // Cleanup initial au cas où un test précédent aurait planté
  await nettoyer();

  // ── 1. Création des cabinets de test ─────────────────────────────────────
  console.log('1. Création des cabinets de test');
  const cabA = await Cabinet.create({ id: ID_A, slug: 'test-a', domaine: 'test-a.dev', nom: 'Cabinet Test A' });
  const cabB = await Cabinet.create({ id: ID_B, slug: 'test-b', domaine: 'test-b.dev', nom: 'Cabinet Test B' });
  affirmer('Cabinet A créé', cabA.id === ID_A);
  affirmer('Cabinet B créé', cabB.id === ID_B);

  // ── 2. Création de données par cabinet ───────────────────────────────────
  console.log('\n2. Création de données dans chaque cabinet');
  const hash = await bcrypt.hash('Test1234!', 10);

  let userA, userB;
  await runWithCabinet(ID_A, async () => {
    userA = await User.create({
      nom: 'Admin', prenom: 'Alpha', email: 'admin@test-a.dev',
      password_hash: hash, role: 'administrateur',
    });
    await Patient.create({ nom: 'PatientA1', prenom: 'Un',  numero_dossier: 'TA-00001', sexe: 'masculin', date_naissance: '1990-01-01', telephone: '0600000001', created_by: userA.id });
    await Patient.create({ nom: 'PatientA2', prenom: 'Deux', numero_dossier: 'TA-00002', sexe: 'feminin',  date_naissance: '1985-06-15', telephone: '0600000002', created_by: userA.id });
  });

  await runWithCabinet(ID_B, async () => {
    userB = await User.create({
      nom: 'Admin', prenom: 'Beta', email: 'admin@test-b.dev',
      password_hash: hash, role: 'administrateur',
    });
    await Patient.create({ nom: 'PatientB1', prenom: 'Un',  numero_dossier: 'TB-00001', sexe: 'masculin', date_naissance: '1975-03-20', telephone: '0700000001', created_by: userB.id });
  });

  affirmer('User A a cabinet_id A', userA.cabinet_id === ID_A);
  affirmer('User B a cabinet_id B', userB.cabinet_id === ID_B);

  // ── 3. Test isolation des lectures ───────────────────────────────────────
  console.log('\n3. Isolation des lectures (findAll scoped)');

  const patientsA = await runWithCabinet(ID_A, () => Patient.scope('avecArchives').findAll());
  const patientsB = await runWithCabinet(ID_B, () => Patient.scope('avecArchives').findAll());

  affirmer('Cabinet A voit 2 patients',  patientsA.length === 2);
  affirmer('Cabinet B voit 1 patient',   patientsB.length === 1);
  affirmer('Cabinet A ne voit aucun patient de B', patientsA.every(p => p.cabinet_id === ID_A));
  affirmer('Cabinet B ne voit aucun patient de A', patientsB.every(p => p.cabinet_id === ID_B));

  // ── 4. Test isolation des lookups par ID ─────────────────────────────────
  console.log('\n4. Isolation des lookups par ID (findByPk cross-cabinet)');
  const patientA1Id = patientsA[0].id;

  // Le patient A1 est-il visible depuis le contexte de B ?
  const tentativeCross = await runWithCabinet(ID_B, () => Patient.scope('avecArchives').findByPk(patientA1Id));
  affirmer('Patient A1 invisible depuis cabinet B', tentativeCross === null);

  // Le patient A1 est-il visible depuis son propre contexte ?
  const accesPropre = await runWithCabinet(ID_A, () => Patient.scope('avecArchives').findByPk(patientA1Id));
  affirmer('Patient A1 visible depuis cabinet A', accesPropre !== null);

  // ── 5. Test isolation des users ──────────────────────────────────────────
  console.log('\n5. Isolation des users');
  const usersA = await runWithCabinet(ID_A, () => User.findAll());
  const usersB = await runWithCabinet(ID_B, () => User.findAll());

  affirmer('Cabinet A ne voit que ses users', usersA.every(u => u.cabinet_id === ID_A));
  affirmer('Cabinet B ne voit que ses users', usersB.every(u => u.cabinet_id === ID_B));

  // ── 6. Test email unique par cabinet (pas globalement) ───────────────────
  console.log('\n6. Unicité email par cabinet (même email possible dans 2 cabinets)');
  let emailDuplique = false;
  try {
    await runWithCabinet(ID_B, () => User.create({
      nom: 'Doublon', prenom: 'Test', email: 'admin@test-a.dev', // même email que cabinet A
      password_hash: hash, role: 'administrateur',
    }));
    emailDuplique = true; // OK — doit être autorisé dans un autre cabinet
  } catch {
    emailDuplique = false;
  }
  affirmer('Même email autorisé dans 2 cabinets différents', emailDuplique);

  // Nettoyage du doublon créé
  await sequelize.query(`DELETE FROM users WHERE email = 'admin@test-a.dev' AND cabinet_id = '${ID_B}'`);

  // ── Nettoyage final ───────────────────────────────────────────────────────
  console.log('\n─ Nettoyage des données de test…');
  await nettoyer();

  // ── Résultats ─────────────────────────────────────────────────────────────
  console.log(`\n── Résultats : ${ok} passed, ${ko} failed ─────────────────────\n`);
  if (ko > 0) process.exit(1);
};

main()
  .catch((err) => { console.error('Erreur fatale:', err.message); process.exit(1); })
  .finally(() => sequelize.close());
