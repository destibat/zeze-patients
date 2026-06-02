'use strict';

const crypto = require('crypto');

const ALGO   = 'aes-256-gcm';
const PREFIX = 'enc:';

// Dérive une clé de 32 octets depuis la variable d'environnement
const masterKey = () => {
  const k = process.env.IA_ENCRYPTION_KEY;
  if (!k) return null;
  return crypto.createHash('sha256').update(k).digest();
};

const chiffrer = (texte) => {
  const key = masterKey();
  if (!key) return texte; // pas de master key → stockage en clair (dev)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const chiffre = Buffer.concat([cipher.update(texte, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + iv.toString('hex') + ':' + tag.toString('hex') + ':' + chiffre.toString('hex');
};

const dechiffrer = (valeur) => {
  if (!valeur || !valeur.startsWith(PREFIX)) return valeur; // clair ou absent
  const key = masterKey();
  if (!key) throw new Error('IA_ENCRYPTION_KEY requise pour déchiffrer la clé API');
  const parts = valeur.slice(PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Format de clé chiffrée invalide');
  const [ivHex, tagHex, chiffreHex] = parts;
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(chiffreHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

const estChiffree = (valeur) => !!(valeur && valeur.startsWith(PREFIX));

module.exports = { chiffrer, dechiffrer, estChiffree };
