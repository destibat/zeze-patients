'use strict';

const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');

// ── Prompt extraction Vision ───────────────────────────────────────────────────
const PROMPT_VISION = `Tu es un assistant d'extraction de données médicales. Analyse cette image de résultats biologiques.

Extrais TOUTES les valeurs biologiques présentes et retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans bloc markdown.

Structure (n'inclure que ce qui est présent dans l'image) :
{
  "date_analyse": "JJ/MM/AAAA ou null",
  "sexe_patient": "M ou F ou null",
  "age_patient": entier ou null,
  "nfs": {
    "hemoglobine": nombre,
    "hematocrite": nombre,
    "globules_rouges": nombre,
    "vgm": nombre,
    "tcmh": nombre,
    "ccmh": nombre,
    "rdw": nombre,
    "globules_blancs": nombre,
    "neutrophiles_pct": nombre,
    "neutrophiles_abs": nombre,
    "lymphocytes_pct": nombre,
    "lymphocytes_abs": nombre,
    "monocytes_pct": nombre,
    "monocytes_abs": nombre,
    "eosinophiles_pct": nombre,
    "eosinophiles_abs": nombre,
    "basophiles_pct": nombre,
    "basophiles_abs": nombre,
    "plaquettes": nombre
  },
  "renal": {
    "creatinine": nombre,
    "uree": nombre,
    "acide_urique": nombre,
    "dfg": nombre
  },
  "glycemie": {
    "glycemie_jeun": nombre,
    "glycemie_postprandiale": nombre,
    "hba1c": nombre
  },
  "lipidique": {
    "cholesterol_total": nombre,
    "ldl": nombre,
    "hdl": nombre,
    "triglycerides": nombre
  },
  "ionogramme": {
    "sodium": nombre,
    "potassium": nombre,
    "chlore": nombre,
    "calcium": nombre,
    "magnesium": nombre,
    "phosphore": nombre,
    "bicarbonates": nombre
  }
}

Règles importantes :
- Retourne uniquement les panels et valeurs effectivement présents dans l'image
- Si une valeur est en mg/dL, convertis en mmol/L (glycémie ÷ 18, cholestérol ÷ 38.67, triglycérides ÷ 88.6, LDL ÷ 38.67, HDL ÷ 38.67)
- Pour l'hémoglobine en g/dL, garde tel quel
- Retourne le nombre décimal uniquement (sans unité ni texte)
- Retourne UNIQUEMENT le JSON brut`;

// ── Patterns regex pour PDF ───────────────────────────────────────────────────
const PATTERNS = {
  hemoglobine:       [/h[eé]moglobine[^\d]*(\d+[.,]\d+)/i, /\bhb\b[^\d]*(\d+[.,]\d+)/i, /hgb[^\d]*(\d+[.,]\d+)/i],
  hematocrite:       [/h[eé]matocrite[^\d]*(\d+[.,]\d+)/i, /\bht\b[^\d]*(\d+[.,]\d+)/i, /hct[^\d]*(\d+[.,]\d+)/i],
  globules_rouges:   [/globules?\s*rouges?[^\d]*(\d+[.,]\d+)/i, /[eé]rythrocytes?[^\d]*(\d+[.,]\d+)/i, /\bgr\b[^\d]*(\d+[.,]\d+)/i, /rbc[^\d]*(\d+[.,]\d+)/i],
  vgm:               [/vgm[^\d]*(\d+[.,]\d+)/i, /mcv[^\d]*(\d+[.,]\d+)/i],
  tcmh:              [/tcmh[^\d]*(\d+[.,]\d+)/i, /\bmch\b[^\d]*(\d+[.,]\d+)/i],
  ccmh:              [/ccmh[^\d]*(\d+[.,]\d+)/i, /mchc[^\d]*(\d+[.,]\d+)/i],
  rdw:               [/rdw[^\d]*(\d+[.,]\d+)/i],
  globules_blancs:   [/globules?\s*blancs?[^\d]*(\d+[.,]\d+)/i, /leucocytes?[^\d]*(\d+[.,]\d+)/i, /\bgb\b[^\d]*(\d+[.,]\d+)/i, /wbc[^\d]*(\d+[.,]\d+)/i],
  neutrophiles_pct:  [/neutrophiles?[^\d]*(\d+[.,]\d+)\s*%/i, /pnn[^\d]*(\d+[.,]\d+)\s*%/i],
  neutrophiles_abs:  [/neutrophiles?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9)/i],
  lymphocytes_pct:   [/lymphocytes?[^\d]*(\d+[.,]\d+)\s*%/i],
  lymphocytes_abs:   [/lymphocytes?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9)/i],
  monocytes_pct:     [/monocytes?[^\d]*(\d+[.,]\d+)\s*%/i],
  monocytes_abs:     [/monocytes?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9)/i],
  eosinophiles_pct:  [/[eé]osinophiles?[^\d]*(\d+[.,]\d+)\s*%/i],
  eosinophiles_abs:  [/[eé]osinophiles?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9)/i],
  basophiles_pct:    [/basophiles?[^\d]*(\d+[.,]\d+)\s*%/i],
  basophiles_abs:    [/basophiles?[^\d%]*(\d+[.,]\d+)\s*(?:g\/l|10\^9)/i],
  plaquettes:        [/plaquettes?[^\d]*(\d+[.,]\d+)/i, /plt[^\d]*(\d+[.,]\d+)/i],
  sexe_patient:      [/sexe\s*:\s*(masculin|f[eé]minin|homme|femme|m|f)\b/i],
  age_patient:       [/[aâ]ge\s*:\s*(\d+)\s*ans?/i],
  date_analyse:      [/date[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i, /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/],
};

const parseValeur = (v) => v ? parseFloat(v.replace(',', '.')) : null;
const parseSexe   = (v) => {
  if (!v) return null;
  const s = v.toLowerCase();
  if (['m', 'masculin', 'homme'].includes(s)) return 'M';
  if (['f', 'féminin', 'feminin', 'femme'].includes(s)) return 'F';
  return null;
};
const parseDate = (v) => {
  if (!v) return null;
  const p = v.split(/[\/\-]/);
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : null;
};

const extraireValeursPDF = (texte) => {
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

// ── Extraction PDF ─────────────────────────────────────────────────────────────
const extraireDepuisPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  const valeurs = extraireValeursPDF(data.text);
  const { sexe_patient, age_patient, date_analyse, ...valeursNFS } = valeurs;

  return {
    texte: data.text,
    meta: { sexe_patient, age_patient, date_analyse },
    panelsStructures: { nfs: valeursNFS },
    panelsList: ['nfs'],
  };
};

// ── Extraction image via Claude Vision ────────────────────────────────────────
const PANELS_VALIDES = ['nfs', 'renal', 'glycemie', 'lipidique', 'ionogramme'];

const extraireDepuisImageVision = async (buffer, mimetype) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée — impossible d\'analyser les images');

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });

  const mediaType = mimetype === 'image/png' ? 'image/png' : 'image/jpeg';
  const base64 = buffer.toString('base64');

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: PROMPT_VISION },
      ],
    }],
  });

  const texte = response.content[0]?.text || '{}';

  // Extraire le JSON (enlever éventuels blocs markdown)
  const jsonStr = texte.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  let parsed = {};
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Tenter d'extraire le bloc JSON
    const m = texte.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { parsed = {}; } }
  }

  const { date_analyse, sexe_patient, age_patient, ...panelsRaw } = parsed;

  // Nettoyer : ne garder que les panels connus avec au moins une valeur non-null
  const panelsStructures = {};
  const panelsList = [];

  for (const panelId of PANELS_VALIDES) {
    if (!panelsRaw[panelId]) continue;
    const valeurs = {};
    for (const [k, v] of Object.entries(panelsRaw[panelId])) {
      if (v !== null && v !== undefined) valeurs[k] = v;
    }
    if (Object.keys(valeurs).length > 0) {
      panelsStructures[panelId] = valeurs;
      panelsList.push(panelId);
    }
  }

  const parsedSexe = parseSexe(String(sexe_patient || ''));
  const parsedDate = date_analyse
    ? (date_analyse.match(/^\d{4}-\d{2}-\d{2}$/) ? date_analyse : parseDate(date_analyse))
    : null;

  return {
    texte,
    meta: {
      sexe_patient: parsedSexe,
      age_patient: age_patient ? parseInt(age_patient) : null,
      date_analyse: parsedDate,
    },
    panelsStructures: panelsList.length ? panelsStructures : { nfs: {} },
    panelsList: panelsList.length ? panelsList : ['nfs'],
  };
};

const extraireNFS = async (buffer, mimetype) => {
  if (mimetype === 'application/pdf') return extraireDepuisPDF(buffer);
  return extraireDepuisImageVision(buffer, mimetype);
};

// Fusionne plusieurs résultats (multi-fichiers)
const fusionnerValeurs = (resultats) => {
  const merged = {
    texte: resultats.map((r) => r.texte).join('\n\n---\n\n'),
    meta: {},
    panelsStructures: {},
    panelsList: [],
  };

  for (const r of resultats) {
    // Meta (date, sexe, age) — premier trouvé gagne
    for (const [k, v] of Object.entries(r.meta || {})) {
      if (v !== null && v !== undefined && merged.meta[k] == null) merged.meta[k] = v;
    }
    // Panels : fusionner valeurs par panel
    for (const panelId of (r.panelsList || [])) {
      if (!merged.panelsStructures[panelId]) {
        merged.panelsStructures[panelId] = {};
        merged.panelsList.push(panelId);
      }
      for (const [k, v] of Object.entries(r.panelsStructures[panelId] || {})) {
        if (v !== null && v !== undefined && merged.panelsStructures[panelId][k] == null) {
          merged.panelsStructures[panelId][k] = v;
        }
      }
    }
  }

  return merged;
};

module.exports = { extraireNFS, fusionnerValeurs };
