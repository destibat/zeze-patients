'use strict';

const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');

// ── Prompt extraction Vision ───────────────────────────────────────────────────
const PROMPT_VISION = `Tu es un assistant d'extraction de données médicales. Analyse ce document médical (résultats biologiques, ECG, compte-rendu, ordonnance, etc.).

Extrais toutes les informations présentes et retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans bloc markdown.

Structure (n'inclure que ce qui est présent dans le document) :
{
  "date_analyse": "JJ/MM/AAAA ou null",
  "sexe_patient": "M ou F ou null",
  "age_patient": entier ou null,
  "contexte_clinique": "Tout le contenu médical du document qui ne rentre pas dans les panels biologiques ci-dessous : motif de consultation, diagnostics, symptômes, antécédents, résultats ECG (rythme, fréquence cardiaque, axe, anomalies), compte-rendu d'imagerie, observations cliniques, ordonnances, conclusions médicales, etc. Copie fidèlement toutes ces informations. null si rien.",
  "hepatique": {
    "crp": nombre,
    "asat": nombre,
    "alat": nombre
  },
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
- Retourne uniquement les panels et valeurs effectivement présents dans le document
- Pour les valeurs numériques des panels : nombre décimal uniquement (sans unité ni texte)
- Pour "contexte_clinique" : texte libre, copie fidèle de tout contenu médical hors panels biologiques
- Retourne UNIQUEMENT le JSON brut

CONVERSIONS D'UNITÉS OBLIGATOIRES — applique-les AVANT de retourner la valeur :

NFS (hématologie) :
- Leucocytes / Globules blancs en /mm³ ou /µL → DIVISER par 1000 → G/L  (ex: 5500/mm³ = 5.5 G/L)
- Plaquettes en /mm³ ou /µL → DIVISER par 1000 → G/L  (ex: 189000/mm³ = 189 G/L)
- Neutrophiles, lymphocytes, monocytes, éosinophiles, basophiles absolus en /mm³ → DIVISER par 1000 → G/L
- Hématies / Globules rouges en 10^6/mm³ ou 10^6/µL → valeur numérique identique en T/L  (ex: 4.43×10^6/mm³ = 4.43 T/L)
- Hémoglobine en g/dL → garder tel quel
- VGM en µ³ ou fL → valeur numérique identique (µ³ = fL)

Bilan rénal :
- Créatinine en µmol/L → garder tel quel  (ex: 98.1 µmol/L → 98.1)
- Créatinine en mg/L → MULTIPLIER par 8.84 → µmol/L  (ex: 11.10 mg/L × 8.84 = 98.1)
- Créatinine en mg/dL → MULTIPLIER par 88.4 → µmol/L
- Urée en mmol/L → garder tel quel
- Urée en g/L → MULTIPLIER par 16.65 → mmol/L  (ex: 0.45 g/L × 16.65 = 7.5)
- Acide urique en µmol/L → garder tel quel ; en mg/L → × 5.95 ; en mg/dL → × 59.5

Bilan hépatique :
- CRP en mg/L → garder tel quel (ex: 93.70 mg/L → 93.7)
- ASAT (GOT) et ALAT (TGP) en UI/L ou U/L → garder tel quel
- Ne pas confondre avec la NFS : ces valeurs sont dans le panel "hepatique"

Bilan lipidique :
- Valeurs en mmol/L → garder tel quel
- Valeurs en mg/dL → cholestérol ÷ 38.67, triglycérides ÷ 88.6, LDL ÷ 38.67, HDL ÷ 38.67

Glycémie :
- Valeurs en mmol/L → garder tel quel
- Valeurs en g/L → MULTIPLIER par 5.55 → mmol/L
- Valeurs en mg/dL → DIVISER par 18 → mmol/L`;

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
// Essaie pdf-parse (texte sélectionnable) ; si trop peu de texte → PDF scanné → Claude
const SEUIL_TEXTE_MIN = 100; // caractères minimum pour considérer le PDF comme lisible

const extraireDepuisPDF = async (buffer) => {
  // 1. Tentative rapide via pdf-parse
  let texteNatif = '';
  try {
    const data = await pdfParse(buffer);
    texteNatif = data.text || '';
  } catch {
    // pdf-parse peut échouer sur certains PDFs protégés ou mal formés
    texteNatif = '';
  }

  // PDF avec texte sélectionnable → extraction par regex + texte complet conservé
  if (texteNatif.replace(/\s+/g, '').length >= SEUIL_TEXTE_MIN) {
    const valeurs = extraireValeursPDF(texteNatif);
    const { sexe_patient, age_patient, date_analyse, ...valeursNFS } = valeurs;
    return {
      texte: texteNatif,           // texte complet du PDF (contexte clinique inclus)
      contexte_clinique: texteNatif,
      meta: { sexe_patient, age_patient, date_analyse },
      panelsStructures: { nfs: valeursNFS },
      panelsList: ['nfs'],
    };
  }

  // 2. PDF scanné (image) → Claude Vision via l'API document (même capacité que Claude.ai)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('PDF scanné détecté mais ANTHROPIC_API_KEY non configurée');

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });
  const base64 = buffer.toString('base64');

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        { type: 'text', text: PROMPT_VISION },
      ],
    }],
  });

  const texte = response.content[0]?.text || '{}';
  const jsonStr = texte.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  let parsed = {};
  try { parsed = JSON.parse(jsonStr); }
  catch { const m = texte.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch { parsed = {}; } } }

  const { date_analyse, sexe_patient, age_patient, contexte_clinique, ...panelsRaw } = parsed;
  const panelsStructures = {};
  const panelsList = [];
  for (const panelId of PANELS_VALIDES) {
    if (!panelsRaw[panelId]) continue;
    const valeurs = {};
    for (const [k, v] of Object.entries(panelsRaw[panelId])) {
      if (v !== null && v !== undefined) valeurs[k] = v;
    }
    if (Object.keys(valeurs).length > 0) { panelsStructures[panelId] = valeurs; panelsList.push(panelId); }
  }
  const parsedSexe = parseSexe(String(sexe_patient || ''));
  const parsedDate = date_analyse
    ? (date_analyse.match(/^\d{4}-\d{2}-\d{2}$/) ? date_analyse : parseDate(date_analyse))
    : null;
  return {
    texte,
    contexte_clinique: typeof contexte_clinique === 'string' ? contexte_clinique : null,
    meta: { sexe_patient: parsedSexe, age_patient: age_patient ? parseInt(age_patient) : null, date_analyse: parsedDate },
    panelsStructures: panelsList.length ? panelsStructures : { nfs: {} },
    panelsList: panelsList.length ? panelsList : ['nfs'],
  };
};

// ── Extraction image via Claude Vision ────────────────────────────────────────
const PANELS_VALIDES = ['nfs', 'renal', 'glycemie', 'lipidique', 'ionogramme', 'hepatique'];

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

  const { date_analyse, sexe_patient, age_patient, contexte_clinique, ...panelsRaw } = parsed;

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
    contexte_clinique: typeof contexte_clinique === 'string' ? contexte_clinique : null,
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
    contexte_clinique: resultats
      .map((r) => r.contexte_clinique)
      .filter(Boolean)
      .join('\n\n---\n\n') || null,
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
