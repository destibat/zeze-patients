'use strict';

const {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, TableBorders, VerticalAlign, convertInchesToTwip,
  Header, Footer, PageNumber, NumberFormat,
} = require('docx');

// ── Référentiels panels (miroir des autres services) ──────────────────────────
const PARAMS_NFS = {
  hemoglobine:      { label: 'Hémoglobine',        unite: 'g/dL',          ref: (s) => s === 'F' ? '12-16'   : '13-17' },
  hematocrite:      { label: 'Hématocrite',         unite: '%',             ref: (s) => s === 'F' ? '35-47'   : '40-54' },
  globules_rouges:  { label: 'Globules rouges',     unite: 'T/L',           ref: (s) => s === 'F' ? '4,0-5,2' : '4,5-5,9' },
  vgm:              { label: 'VGM',                 unite: 'fL',            ref: () => '80-100' },
  tcmh:             { label: 'TCMH',                unite: 'pg',            ref: () => '27-33' },
  ccmh:             { label: 'CCMH',                unite: 'g/dL',          ref: () => '32-36' },
  rdw:              { label: 'RDW',                 unite: '%',             ref: () => '11,5-14,5' },
  globules_blancs:  { label: 'Globules blancs',     unite: 'G/L',           ref: () => '4-10' },
  neutrophiles_abs: { label: 'Neutrophiles (abs)',  unite: 'G/L',           ref: () => '1,8-7,5' },
  neutrophiles_pct: { label: 'Neutrophiles (%)',    unite: '%',             ref: () => '40-75' },
  lymphocytes_abs:  { label: 'Lymphocytes (abs)',   unite: 'G/L',           ref: () => '1,0-4,0' },
  lymphocytes_pct:  { label: 'Lymphocytes (%)',     unite: '%',             ref: () => '20-40' },
  monocytes_abs:    { label: 'Monocytes (abs)',     unite: 'G/L',           ref: () => '0,2-1,0' },
  monocytes_pct:    { label: 'Monocytes (%)',       unite: '%',             ref: () => '2-10' },
  eosinophiles_abs: { label: 'Eosinophiles (abs)',  unite: 'G/L',           ref: () => '0-0,5' },
  eosinophiles_pct: { label: 'Eosinophiles (%)',    unite: '%',             ref: () => '0-5' },
  basophiles_abs:   { label: 'Basophiles (abs)',    unite: 'G/L',           ref: () => '0-0,1' },
  basophiles_pct:   { label: 'Basophiles (%)',      unite: '%',             ref: () => '0-1' },
  plaquettes:       { label: 'Plaquettes',          unite: 'G/L',           ref: () => '150-400' },
};
const PARAMS_RENAL = {
  creatinine:   { label: 'Creatinine',    unite: 'umol/L',        ref: (s) => s === 'F' ? '44-97'    : '53-106' },
  uree:         { label: 'Uree',          unite: 'mmol/L',        ref: () => '2,5-7,5' },
  acide_urique: { label: 'Acide urique',  unite: 'umol/L',        ref: (s) => s === 'F' ? '143-339'  : '202-416' },
  dfg:          { label: 'DFG estime',    unite: 'mL/min/1.73m2', ref: () => '> 60' },
};
const PARAMS_GLYCEMIE = {
  glycemie_jeun:          { label: 'Glycemie a jeun',        unite: 'mmol/L', ref: () => '3,9-5,5' },
  glycemie_postprandiale: { label: 'Glycemie postprandiale', unite: 'mmol/L', ref: () => '< 7,8' },
  hba1c:                  { label: 'HbA1c',                  unite: '%',      ref: () => '< 5,7' },
};
const PARAMS_LIPIDIQUE = {
  cholesterol_total: { label: 'Cholesterol total',  unite: 'mmol/L', ref: () => '< 5,2' },
  ldl:               { label: 'LDL-cholesterol',    unite: 'mmol/L', ref: () => '< 3,4' },
  hdl:               { label: 'HDL-cholesterol',    unite: 'mmol/L', ref: (s) => s === 'F' ? '> 1,3' : '> 1,0' },
  triglycerides:     { label: 'Triglycerides',       unite: 'mmol/L', ref: () => '< 1,7' },
};
const PARAMS_IONOGRAMME = {
  sodium:       { label: 'Sodium',       unite: 'mmol/L', ref: () => '136-145' },
  potassium:    { label: 'Potassium',    unite: 'mmol/L', ref: () => '3,5-5,0' },
  chlore:       { label: 'Chlore',       unite: 'mmol/L', ref: () => '98-107' },
  calcium:      { label: 'Calcium',      unite: 'mmol/L', ref: () => '2,2-2,6' },
  magnesium:    { label: 'Magnesium',    unite: 'mmol/L', ref: () => '0,75-0,95' },
  phosphore:    { label: 'Phosphore',    unite: 'mmol/L', ref: () => '0,81-1,45' },
  bicarbonates: { label: 'Bicarbonates', unite: 'mmol/L', ref: () => '22-29' },
};
const PANELS_META = {
  nfs:        { label: 'NFS - Numeration Formule Sanguine', params: PARAMS_NFS },
  renal:      { label: 'Bilan renal',                        params: PARAMS_RENAL },
  glycemie:   { label: 'Bilan glycemique',                   params: PARAMS_GLYCEMIE },
  lipidique:  { label: 'Bilan lipidique',                    params: PARAMS_LIPIDIQUE },
  ionogramme: { label: 'Ionogramme',                         params: PARAMS_IONOGRAMME },
};

// ── Utilitaires ───────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const parseJson = (v, fb) => {
  if (!v) return fb;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fb; } }
  return v;
};

// Nettoie les emojis et caractères non-ASCII pour Word
const nettoyerTexte = (str) => {
  if (!str) return '';
  return str
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[☀-➿]/g, '')
    .replace(/️/g, '')
    .replace(/[\u{E000}-\u{F8FF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const calculerStatut = (valeur, refStr) => {
  if (valeur == null || valeur === '') return null;
  const num = parseFloat(String(valeur).replace(',', '.'));
  if (isNaN(num)) return null;
  const clean = refStr.replace(/\s*\([^)]+\)/, '').trim();
  if (clean.includes('-')) {
    const [a, b] = clean.split('-').map(s => parseFloat(s.replace(',', '.')));
    if (isNaN(a) || isNaN(b)) return null;
    if (num < a) return { label: 'Diminue', couleur: '1565C0' };
    if (num > b) return { label: 'Augmente', couleur: 'C62828' };
    return           { label: 'Normal',     couleur: '1B7F4F' };
  }
  const lt = clean.match(/^<\s*([\d,]+)/);
  if (lt) {
    const s = parseFloat(lt[1].replace(',', '.'));
    return num < s ? { label: 'Normal', couleur: '1B7F4F' } : { label: 'Augmente', couleur: 'C62828' };
  }
  const gt = clean.match(/^>\s*([\d,]+)/);
  if (gt) {
    const s = parseFloat(gt[1].replace(',', '.'));
    return num > s ? { label: 'Normal', couleur: '1B7F4F' } : { label: 'Diminue', couleur: '1565C0' };
  }
  return null;
};

// ── Helpers de construction docx ──────────────────────────────────────────────
const BORDER_THIN = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: 'BDBDBD' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BDBDBD' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: 'BDBDBD' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: 'BDBDBD' },
};

const cellule = (texte, opts = {}) => {
  const {
    gras = false, italique = false, taille = 18, couleur = '000000',
    fondHex = null, alignH = AlignmentType.LEFT, largeur = null,
  } = opts;
  return new TableCell({
    width: largeur ? { size: largeur, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: fondHex ? { fill: fondHex, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    borders: BORDER_THIN,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: alignH,
        children: [new TextRun({ text: String(texte || ''), bold: gras, italics: italique, size: taille, color: couleur })],
      }),
    ],
  });
};

const titreSection = (texte) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 200, after: 100 },
  shading: { fill: '0D5C38', type: ShadingType.CLEAR },
  children: [new TextRun({ text: texte, bold: true, size: 22, color: 'FFFFFF' })],
});

// ── Tableau paramètres ────────────────────────────────────────────────────────
const tableauPanel = (meta, vPanel, sexe) => {
  const lignes = Object.entries(meta.params)
    .map(([cle, param]) => ({ cle, param, val: vPanel[cle] }))
    .filter(({ val }) => val != null && val !== '');

  if (!lignes.length) return null;

  const COL = [3200, 1800, 2000, 1700]; // largeurs en DXA (1440 = 1 pouce)
  const TOTAL = COL.reduce((s, c) => s + c, 0);

  const rows = [];

  // Entête panel (fond vert foncé)
  rows.push(new TableRow({
    children: [new TableCell({
      columnSpan: 4,
      shading: { fill: '0D5C38', type: ShadingType.CLEAR },
      borders: BORDER_THIN,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({
        children: [new TextRun({ text: meta.label, bold: true, size: 20, color: 'FFFFFF' })],
      })],
    })],
  }));

  // Entête colonnes
  rows.push(new TableRow({
    tableHeader: true,
    children: [
      cellule('Parametre', { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[0] }),
      cellule('Resultat',  { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[1], alignH: AlignmentType.RIGHT }),
      cellule('Normes',    { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[2], alignH: AlignmentType.RIGHT }),
      cellule('Statut',    { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[3], alignH: AlignmentType.CENTER }),
    ],
  }));

  // Données
  lignes.forEach(({ param, val }, i) => {
    const fond = i % 2 === 0 ? 'F5F5F5' : 'FFFFFF';
    const refStr = param.ref(sexe);
    const statut = calculerStatut(val, refStr);
    const statutFond = statut?.couleur === 'C62828' ? 'FFEBEE'
      : statut?.couleur === '1565C0' ? 'E3F2FD'
      : statut ? 'E8F5E9' : fond;

    rows.push(new TableRow({
      children: [
        cellule(param.label, { fondHex: fond, largeur: COL[0] }),
        cellule(`${val} ${param.unite}`, { gras: true, fondHex: fond, largeur: COL[1], alignH: AlignmentType.RIGHT }),
        cellule(`${refStr} ${param.unite}`, { taille: 16, fondHex: fond, largeur: COL[2], alignH: AlignmentType.RIGHT }),
        cellule(statut?.label || '-', {
          gras: !!statut, taille: 16,
          fondHex: statutFond,
          couleur: statut?.couleur || '616161',
          largeur: COL[3],
          alignH: AlignmentType.CENTER,
        }),
      ],
    }));
  });

  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    rows,
  });
};

// ── Rendu texte IA → paragraphes Word ─────────────────────────────────────────
const isSectionNumero = (t) => /^\s*\d+\.\s+\S/.test(t) || /^\s*(analyse|identification|interpretation|synthese|explication|recommandations|precaution)/i.test(t);

const texteIAVersParagraphes = (texte) => {
  if (!texte) return [];
  const paras = [];

  for (const ligne of texte.split('\n')) {
    const t = nettoyerTexte(ligne.trim());
    if (!t) { paras.push(new Paragraph({ text: '' })); continue; }

    // Section numérotée → heading
    if (isSectionNumero(t)) {
      paras.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80 },
        shading: { fill: '1565C0', type: ShadingType.CLEAR },
        children: [new TextRun({ text: t.replace(/\*\*/g, ''), bold: true, size: 20, color: 'FFFFFF' })],
      }));
      continue;
    }

    // Sous-titre entièrement en **gras**
    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      paras.push(new Paragraph({
        spacing: { before: 120, after: 40 },
        children: [new TextRun({ text: t.slice(2, -2), bold: true, size: 19, color: '0D5C38' })],
      }));
      continue;
    }

    // Bullet point
    const bM = t.match(/^[-*]\s+(.*)/);
    if (bM) {
      const content = bM[1].replace(/\*\*/g, '');
      paras.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [new TextRun({ text: content, size: 18 })],
      }));
      continue;
    }

    // Ligne précaution
    if (/precaution|avertissement|important/i.test(t)) {
      paras.push(new Paragraph({
        spacing: { before: 120, after: 80 },
        shading: { fill: 'FFF3E0', type: ShadingType.CLEAR },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: 'E65100' },
        },
        children: [new TextRun({ text: t.replace(/\*\*/g, ''), size: 18, color: 'E65100', italics: true })],
      }));
      continue;
    }

    // Texte normal avec gras inline
    if (t.includes('**')) {
      const parts = t.split(/\*\*/);
      const runs = parts.map((p, i) => new TextRun({ text: p, bold: i % 2 === 1, size: 18 }));
      paras.push(new Paragraph({ spacing: { after: 40 }, children: runs }));
    } else {
      paras.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: t, size: 18 })] }));
    }
  }
  return paras;
};

// ── Génération principale ─────────────────────────────────────────────────────
const genererDocxAnalyse = async (analyse, patient) => {
  const panels  = parseJson(analyse.panels_demandes, []);
  const valeurs = parseJson(analyse.valeurs_brutes, {});
  const sexeA   = analyse.sexe_patient;
  const sexeP   = patient?.sexe === 'feminin' ? 'F' : patient?.sexe === 'masculin' ? 'M' : null;
  const sexe    = sexeA || sexeP;
  const sexeLbl = sexe === 'F' ? 'Feminin' : sexe === 'M' ? 'Masculin' : '-';
  const ageLbl  = analyse.age_patient ? `${analyse.age_patient} ans` : '-';
  const panelsLbl = panels.map(p => PANELS_META[p]?.label || p).join(', ') || '-';

  const children = [];

  // ── Titre ──────────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    shading: { fill: '1565C0', type: ShadingType.CLEAR },
    children: [new TextRun({ text: 'ANALYSE MEDICALE COMPLETE', bold: true, size: 36, color: 'FFFFFF' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'Interpretation des resultats biologiques', italics: true, size: 22, color: '1B7F4F' })],
  }));

  // ── Tableau infos patient ──────────────────────────────────────────────────
  children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'INFORMATIONS PATIENT', bold: true, size: 20, color: '0D5C38' })] }));

  const COL_INFO = [2400, 6300];
  const infoRows = [
    ['Patient',            patient ? `${patient.prenom} ${patient.nom}` : '-'],
    ['Date de naissance',  patient?.date_naissance ? fmtDate(patient.date_naissance) : '-'],
    ['Age / Sexe',         `${ageLbl}  -  ${sexeLbl}`],
    ['Dossier N.',         patient?.numero_dossier || '-'],
    ['Date du prelevement', fmtDate(analyse.date_analyse)],
    ['Examens demandes',   panelsLbl],
  ];
  children.push(new Table({
    width: { size: COL_INFO[0] + COL_INFO[1], type: WidthType.DXA },
    rows: infoRows.map((row, i) => new TableRow({
      children: [
        cellule(row[0], { gras: true, fondHex: i % 2 === 0 ? 'E8F5E9' : 'F5F5F5', couleur: '0D5C38', taille: 17, largeur: COL_INFO[0] }),
        cellule(row[1], { fondHex: i % 2 === 0 ? 'FFFFFF' : 'FAFAFA', taille: 18, largeur: COL_INFO[1] }),
      ],
    })),
  }));

  // ── Section 1 : valeurs biologiques ───────────────────────────────────────
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(titreSection('1. RESULTATS DES ANALYSES - VALEURS MESUREES'));

  for (const panelId of panels) {
    const meta = PANELS_META[panelId];
    if (!meta) continue;
    const tableau = tableauPanel(meta, valeurs[panelId] || {}, sexe);
    if (tableau) {
      children.push(new Paragraph({ spacing: { before: 160, after: 40 } }));
      children.push(tableau);
    }
  }

  // ── Section 2 : interprétation IA ─────────────────────────────────────────
  if (analyse.analyse_ia_texte) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(titreSection('2. INTERPRETATION MEDICALE (generee par IA)'));
    children.push(new Paragraph({ spacing: { after: 100 } }));
    children.push(...texteIAVersParagraphes(analyse.analyse_ia_texte));

    if (analyse.cout_estime_usd) {
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200 },
        children: [new TextRun({
          text: `Analyse par ${analyse.analyse_ia_modele || 'IA'} - Cout estime : $${parseFloat(analyse.cout_estime_usd).toFixed(4)}`,
          size: 14, color: 'BDBDBD', italics: true,
        })],
      }));
    }
  }

  const doc = new Document({
    creator: 'ZEZEPAGNON Dossiers Patients',
    title: `Analyse médicale — ${patient ? `${patient.prenom} ${patient.nom}` : 'Patient'}`,
    description: 'Rapport d\'analyse médicale généré automatiquement',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18, color: '212121' },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ZEZEPAGNON — Dossiers Patients  |  Page ', size: 16, color: '9E9E9E' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9E9E9E' }),
              new TextRun({ text: ' sur ', size: 16, color: '9E9E9E' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9E9E9E' }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
};

module.exports = { genererDocxAnalyse };
