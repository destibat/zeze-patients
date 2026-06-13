#!/usr/bin/env node
'use strict';

/**
 * Script de configuration TOTP pour le Super-Admin GECAM
 *
 * Usage :
 *   docker exec -it <backend_container> node scripts/setup-totp.js
 *
 * Si SUPERADMIN_TOTP_SECRET est déjà dans l'env, il affiche le QR code de l'existant.
 * Sinon il génère un nouveau secret et demande de l'ajouter dans .env.
 */

const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const ACCOUNT = 'SuperAdmin';
const ISSUER  = 'GECAM ZEZEPAGNON';

const existingSecret = process.env.SUPERADMIN_TOTP_SECRET;

let secret;
let isNew = false;

if (existingSecret && existingSecret.trim().length >= 16) {
  secret = existingSecret.trim();
  console.log('\n✓  SUPERADMIN_TOTP_SECRET trouvé dans l\'environnement.\n');
} else {
  secret = authenticator.generateSecret(32);
  isNew = true;
  console.log('\n⚠️   Aucun SUPERADMIN_TOTP_SECRET configuré.\n');
  console.log('    Ajoutez la ligne suivante dans votre .env (et .env.unified.prod) :\n');
  console.log(`    SUPERADMIN_TOTP_SECRET=${secret}\n`);
  console.log('    Puis redémarrez le backend avant d\'utiliser le code OTP.\n');
}

const otpauthUri = authenticator.keyuri(ACCOUNT, ISSUER, secret);

qrcode.toString(otpauthUri, { type: 'terminal', small: true }, (err, code) => {
  if (err) {
    console.error('Erreur génération QR :', err.message);
    console.log('\nURL à utiliser dans votre appli :\n', otpauthUri, '\n');
  } else {
    console.log('Scannez ce QR code avec Google Authenticator ou Authy :\n');
    console.log(code);
  }

  console.log('─'.repeat(50));
  console.log('Secret (à saisir manuellement si QR illisible) :');
  console.log(`  ${secret}`);
  console.log('Compte  :', ACCOUNT);
  console.log('Émetteur:', ISSUER);
  console.log('Type    : TOTP — code valable 30 secondes');
  console.log('─'.repeat(50));

  if (!isNew) {
    // Vérification rapide
    const codeTest = authenticator.generate(secret);
    console.log(`\nCode actuel (test) : ${codeTest}  — valable ~${30 - (Math.floor(Date.now() / 1000) % 30)}s\n`);
  }
});
