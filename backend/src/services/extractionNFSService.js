'use strict';

const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

// Patterns de reconnaissance des valeurs NFS dans le texte extrait
const PATTERNS = {
  hemoglobine:       [/h[eé]moglobine[^\d]*(\d+[.,]\d+)/i, /hb[^\d]*(\d+[.,]\d+)/i, /hgb[^\d]*(\d+[.,]\d+)/i],
  hematocrite:       [/h[eé]matocrite[^\d]*(\d+[.,]\d+)/i, /ht[^\d]*(\d+[.,]\d+)/i, /hct[^\d]*(\d+[.,]\d+)/i],
  globules_rouges:   [/globules?\s*rouges?[^\d]*(\d+[.,]\d+)/i, /[eé]rythrocytes?[^\d]*(\d+[.,]\d+)/i, /gr[^\d]*(\d+[.,]\d+)/i, /rbc[^\d]*(\d+[.,]\d+)/i],
  vgm:               [/vgm[^\d]*(\d+[.,]\d+)/i, /mcv[^\d]*(\d+[.,]\d+)/i, /volume\s+globulaire\s+moyen[^\d]*(\d+[.,]\d+)/i],
  tcmh:              [/tcmh[^\d]*(\d+[.,]\d+)/i, /mch[^\d]*(\d+[.,]\d+)/i],
  ccmh:              [/ccmh[^\d]*(\d+[.,]\d+)/i, /mchc[^\d]*(\d+[.,]\d+)/i],
  rdw:               [/rdw[^\d]*(\d+[.,]\d+)/i],
  globules_blancs:   [/globules?\s*blancs?[^\d]*(\d+[.,]\d+)/i, /leucocytes?[^\d]*(\d+[.,]\d+)/i, /gb[^\d]*(\d+[.,]\d+)/i, /wbc[^\d]*(\d+[.,]\d+)/i],
  neutrophiles_pct:  [/neutrophiles?[^\d]*(\d+[.,]\d+)\s*%/i, /pnn[^\d]*(\d+[.,]\d+)\s*%/i],
  neutrophiles_abs:  [/neutrophiles?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9\/l|giga)/i],
  lymphocytes_pct:   [/lymphocytes?[^\d]*(\d+[.,]\d+)\s*%/i],
  lymphocytes_abs:   [/lymphocytes?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9\/l|giga)/i],
  monocytes_pct:     [/monocytes?[^\d]*(\d+[.,]\d+)\s*%/i],
  monocytes_abs:     [/monocytes?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9\/l|giga)/i],
  eosinophiles_pct:  [/[eé]osinophiles?[^\d]*(\d+[.,]\d+)\s*%/i, /[eé]os[^\d]*(\d+[.,]\d+)\s*%/i],
  eosinophiles_abs:  [/[eé]osinophiles?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9\/l|giga)/i],
  basophiles_pct:    [/basophiles?[^\d]*(\d+[.,]\d+)\s*%/i, /baso[^\d]*(\d+[.,]\d+)\s*%/i],
  basophiles_abs:    [/basophiles?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9\/l|giga)/i],
  plaquettes:        [/plaquettes?[^\d]*(\d+[.,]\d+)/i, /plt[^\d]*(\d+[.,]\d+)/i, /thrombocytes?[^\d]*(\d+[.,]\d+)/i],
  sexe_patient:      [/sexe\s*:\s*(masculin|f[eé]minin|homme|femme|m|f)\b/i],
  age_patient:       [/[aâ]ge\s*:\s*(\d+)\s*ans?/i, /(\d+)\s*ans?\s*(?:,|;|\|)/i],
  date_analyse:      [/date[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i, /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/],
};

const parseValeur = (valeur) => {
  if (!valeur) return null;
  return parseFloat(valeur.replace(',', '.'));
};

const parseSexe = (valeur) => {
  if (!valeur) return null;
  const v = valeur.toLowerCase();
  if (v === 'm' || v === 'masculin' || v === 'homme') return 'M';
  if (v === 'f' || v === 'féminin' || v === 'feminin' || v === 'femme') return 'F';
  return null;
};

const parseDate = (valeur) => {
  if (!valeur) return null;
  const parts = valeur.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const extraireValeurs = (texte) => {
  const resultat = {};

  for (const [champ, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      const match = texte.match(pattern);
      if (match && match[1]) {
        if (champ === 'sexe_patient') {
          resultat[champ] = parseSexe(match[1]);
        } else if (champ === 'age_patient') {
          resultat[champ] = parseInt(match[1]) || null;
        } else if (champ === 'date_analyse') {
          resultat[champ] = parseDate(match[1]);
        } else {
          resultat[champ] = parseValeur(match[1]);
        }
        break;
      }
    }
  }

  return resultat;
};

const extraireDepuisPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return { texte: data.text, valeurs: extraireValeurs(data.text) };
};

const extraireDepuisImage = async (buffer, mimetype) => {
  const { data: { text } } = await Tesseract.recognize(buffer, 'fra+eng', {
    logger: () => {},
  });
  return { texte: text, valeurs: extraireValeurs(text) };
};

const extraireNFS = async (buffer, mimetype) => {
  if (mimetype === 'application/pdf') {
    return extraireDepuisPDF(buffer);
  }
  return extraireDepuisImage(buffer, mimetype);
};

module.exports = { extraireNFS };
