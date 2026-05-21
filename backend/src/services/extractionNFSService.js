'use strict';

const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

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

const parseValeur   = (v) => v ? parseFloat(v.replace(',', '.')) : null;
const parseSexe     = (v) => {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s === 'm' || s === 'masculin' || s === 'homme') return 'M';
  if (s === 'f' || s === 'féminin' || s === 'feminin' || s === 'femme') return 'F';
  return null;
};
const parseDate = (v) => {
  if (!v) return null;
  const p = v.split(/[\/\-]/);
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : null;
};

const extraireValeurs = (texte) => {
  const res = {};
  for (const [champ, patterns] of Object.entries(PATTERNS)) {
    for (const pat of patterns) {
      const m = texte.match(pat);
      if (m && m[1]) {
        if (champ === 'sexe_patient')  res[champ] = parseSexe(m[1]);
        else if (champ === 'age_patient')  res[champ] = parseInt(m[1]) || null;
        else if (champ === 'date_analyse') res[champ] = parseDate(m[1]);
        else res[champ] = parseValeur(m[1]);
        break;
      }
    }
  }
  return res;
};

// Convertit une image JPEG/PNG en PNG via Jimp pour compatibilité Tesseract WASM
const normaliserImage = async (buffer) => {
  try {
    const image = await Jimp.read(buffer);
    // Amélioration contraste pour meilleur OCR
    image.greyscale().contrast(0.3);
    return await image.getBufferAsync(Jimp.MIME_PNG);
  } catch {
    return buffer; // en cas d'échec, on tente quand même
  }
};

const extraireDepuisPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return { texte: data.text, valeurs: extraireValeurs(data.text) };
};

const extraireDepuisImage = async (buffer) => {
  const png = await normaliserImage(buffer);
  const { data: { text } } = await Tesseract.recognize(png, 'fra+eng', { logger: () => {} });
  return { texte: text, valeurs: extraireValeurs(text) };
};

const extraireNFS = async (buffer, mimetype) => {
  if (mimetype === 'application/pdf') return extraireDepuisPDF(buffer);
  return extraireDepuisImage(buffer);
};

// Fusionne plusieurs résultats d'extraction (garde les valeurs non-nulles)
const fusionnerValeurs = (resultats) => {
  const merged = { valeurs: {}, texte: resultats.map((r) => r.texte).join('\n\n---\n\n') };
  for (const r of resultats) {
    for (const [k, v] of Object.entries(r.valeurs)) {
      if (v !== null && v !== undefined && merged.valeurs[k] == null) {
        merged.valeurs[k] = v;
      }
    }
  }
  return merged;
};

module.exports = { extraireNFS, fusionnerValeurs };
