'use strict';

const {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ShadingType, VerticalAlign, convertInchesToTwip,
  Header, Footer, PageNumber, ImageRun,
} = require('docx');
const fs = require('fs');
const path = require('path');

const LOGO_PATH   = path.resolve(__dirname, '../assets/logo-mapa.jpg');
const FOOTER_PATH = path.resolve(__dirname, '../assets/footer-mapa.jpg');

// ── Référentiels panels ───────────────────────────────────────────────────────
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
  eosinophiles_abs: { label: 'Éosinophiles (abs)',  unite: 'G/L',           ref: () => '0-0,5' },
  eosinophiles_pct: { label: 'Éosinophiles (%)',    unite: '%',             ref: () => '0-5' },
  basophiles_abs:   { label: 'Basophiles (abs)',    unite: 'G/L',           ref: () => '0-0,1' },
  basophiles_pct:   { label: 'Basophiles (%)',      unite: '%',             ref: () => '0-1' },
  plaquettes:       { label: 'Plaquettes',          unite: 'G/L',           ref: () => '150-400' },
};
const PARAMS_RENAL = {
  creatinine:   { label: 'Créatinine',   unite: 'µmol/L',        ref: (s) => s === 'F' ? '44-80'   : '62-106' },
  uree:         { label: 'Urée',         unite: 'mmol/L',        ref: () => '2,5-7,5' },
  acide_urique: { label: 'Acide urique', unite: 'µmol/L',        ref: (s) => s === 'F' ? '155-350' : '210-420' },
  dfg:          { label: 'DFG estimé',   unite: 'mL/min/1.73m²', ref: () => '> 60' },
};
const PARAMS_GLYCEMIE = {
  glycemie_jeun:          { label: 'Glycémie à jeun',        unite: 'mmol/L', ref: () => '3,9-6,1' },
  glycemie_postprandiale: { label: 'Glycémie postprandiale', unite: 'mmol/L', ref: () => '< 7,8' },
  hba1c:                  { label: 'HbA1c',                  unite: '%',      ref: () => '< 5,7' },
};
const PARAMS_LIPIDIQUE = {
  cholesterol_total: { label: 'Cholestérol total',  unite: 'mmol/L', ref: () => '< 5,2' },
  ldl:               { label: 'LDL-cholestérol',    unite: 'mmol/L', ref: () => '< 4,1' },
  hdl:               { label: 'HDL-cholestérol',    unite: 'mmol/L', ref: (s) => s === 'F' ? '> 1,3' : '> 1,0' },
  triglycerides:     { label: 'Triglycérides',       unite: 'mmol/L', ref: () => '< 1,7' },
};
const PARAMS_IONOGRAMME = {
  sodium:       { label: 'Sodium',       unite: 'mmol/L', ref: () => '136-145' },
  potassium:    { label: 'Potassium',    unite: 'mmol/L', ref: () => '3,5-5,0' },
  chlore:       { label: 'Chlore',       unite: 'mmol/L', ref: () => '96-106' },
  calcium:      { label: 'Calcium',      unite: 'mmol/L', ref: () => '2,20-2,60' },
  magnesium:    { label: 'Magnésium',    unite: 'mmol/L', ref: () => '0,75-1,00' },
  phosphore:    { label: 'Phosphore',    unite: 'mmol/L', ref: () => '0,80-1,45' },
  bicarbonates: { label: 'Bicarbonates', unite: 'mmol/L', ref: () => '22-29' },
};
const PARAMS_HEPATIQUE = {
  crp:  { label: 'CRP (Protéine C-réactive)', unite: 'mg/L', ref: () => '< 6' },
  asat: { label: 'ASAT (GOT)',                unite: 'UI/L', ref: () => '10-40' },
  alat: { label: 'ALAT (TGP)',                unite: 'UI/L', ref: () => '10-35' },
};

const PANELS_META = {
  nfs:        { label: 'NFS — Numération Formule Sanguine', params: PARAMS_NFS },
  renal:      { label: 'Bilan rénal',                        params: PARAMS_RENAL },
  glycemie:   { label: 'Bilan glycémique',                   params: PARAMS_GLYCEMIE },
  lipidique:  { label: 'Bilan lipidique',                    params: PARAMS_LIPIDIQUE },
  ionogramme: { label: 'Ionogramme',                         params: PARAMS_IONOGRAMME },
  hepatique:  { label: 'Bilan hépatique',                    params: PARAMS_HEPATIQUE },
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
    if (num < a) return { label: 'Diminué',  couleur: '1565C0', fond: 'E3F2FD' };
    if (num > b) return { label: 'Augmenté', couleur: 'C62828', fond: 'FFEBEE' };
    return           { label: 'Normal',     couleur: '1B7F4F', fond: 'E8F5E9' };
  }
  const lt = clean.match(/^<\s*([\d,]+)/);
  if (lt) {
    const s = parseFloat(lt[1].replace(',', '.'));
    if (num < s * 0.95) return { label: 'Normal',   couleur: '1B7F4F', fond: 'E8F5E9' };
    if (num < s)        return { label: 'Limite',   couleur: 'E65100', fond: 'FFF3E0' };
    return                     { label: 'Augmenté', couleur: 'C62828', fond: 'FFEBEE' };
  }
  const gt = clean.match(/^>\s*([\d,]+)/);
  if (gt) {
    const s = parseFloat(gt[1].replace(',', '.'));
    if (num > s * 1.05) return { label: 'Normal',  couleur: '1B7F4F', fond: 'E8F5E9' };
    if (num > s)        return { label: 'Limite',  couleur: 'E65100', fond: 'FFF3E0' };
    return                     { label: 'Diminué', couleur: '1565C0', fond: 'E3F2FD' };
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
    gras = false, italique = false, taille = 18, couleur = '212121',
    fondHex = 'FFFFFF', alignH = AlignmentType.LEFT, largeur = null,
  } = opts;
  return new TableCell({
    width: largeur ? { size: largeur, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: fondHex, type: ShadingType.CLEAR, color: 'auto' },
    borders: BORDER_THIN,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: alignH,
      children: [new TextRun({ text: String(texte || ''), bold: gras, italics: italique, size: taille, color: couleur })],
    })],
  });
};

const paragrapheColore = (texte, opts = {}) => {
  const {
    fondHex = 'FFFFFF', couleur = '212121', gras = false,
    taille = 19, espaceBefore = 160, espaceAfter = 80,
    alignH = AlignmentType.LEFT, italique = false,
  } = opts;
  return new Paragraph({
    alignment: alignH,
    spacing: { before: espaceBefore, after: espaceAfter },
    shading: { fill: fondHex, type: ShadingType.CLEAR, color: 'auto' },
    children: [new TextRun({ text: nettoyerTexte(texte).replace(/\*\*/g, ''), bold: gras, italics: italique, size: taille, color: couleur })],
  });
};

// ── Tableau paramètres biologiques ────────────────────────────────────────────
const tableauPanel = (meta, vPanel, sexe) => {
  const lignes = Object.entries(meta.params)
    .map(([cle, param]) => ({ cle, param, val: vPanel[cle] }))
    .filter(({ val }) => val != null && val !== '');
  if (!lignes.length) return null;

  const COL = [3300, 1700, 2000, 1700];

  const rows = [];

  // En-tête panel (fond vert foncé, texte blanc)
  rows.push(new TableRow({
    children: [new TableCell({
      columnSpan: 4,
      shading: { fill: '0D5C38', type: ShadingType.CLEAR, color: 'auto' },
      borders: BORDER_THIN,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({
        children: [new TextRun({ text: meta.label, bold: true, size: 20, color: 'FFFFFF' })],
      })],
    })],
  }));

  // En-tête colonnes (fond gris clair)
  rows.push(new TableRow({
    tableHeader: true,
    children: [
      cellule('Paramètre', { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[0] }),
      cellule('Résultat',  { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[1], alignH: AlignmentType.RIGHT }),
      cellule('Normes',    { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[2], alignH: AlignmentType.RIGHT }),
      cellule('Statut',    { gras: true, taille: 17, fondHex: 'CFD8DC', couleur: '37474F', largeur: COL[3], alignH: AlignmentType.CENTER }),
    ],
  }));

  // Lignes de données
  lignes.forEach(({ param, val }, i) => {
    const fond    = i % 2 === 0 ? 'F5F5F5' : 'FFFFFF';
    const refStr  = typeof param.ref === 'function' ? param.ref(sexe) : param.ref;
    const uniteStr = typeof param.unite === 'function' ? param.unite(val) : param.unite;
    const statut  = calculerStatut(val, refStr);

    rows.push(new TableRow({
      children: [
        cellule(param.label, { fondHex: fond, largeur: COL[0] }),
        cellule(`${val} ${uniteStr}`, { gras: true, fondHex: fond, largeur: COL[1], alignH: AlignmentType.RIGHT }),
        cellule(`${refStr} ${uniteStr}`, { taille: 16, fondHex: fond, largeur: COL[2], alignH: AlignmentType.RIGHT }),
        cellule(statut?.label || '-', {
          gras: !!statut, taille: 16,
          fondHex: statut?.fond || fond,
          couleur: statut?.couleur || '616161',
          largeur: COL[3], alignH: AlignmentType.CENTER,
        }),
      ],
    }));
  });

  return new Table({
    width: { size: COL.reduce((s, c) => s + c, 0), type: WidthType.DXA },
    rows,
  });
};

// ── Markdown table → Table Word ───────────────────────────────────────────────
const estLigneMarkdown  = (t) => t.startsWith('|') && t.endsWith('|') && t.length > 2;
const estSeparateurMD   = (t) => /^\|[\s\-:|]+\|$/.test(t);
const parseColonnesMD   = (ligne) => ligne.split('|').slice(1, -1).map(c => c.replace(/\*\*/g, '').trim());

const couleurStatutMD = (s) => {
  const u = (s || '').toUpperCase();
  if (u.includes('NORMAL'))   return { couleur: '1B7F4F', fond: 'E8F5E9' };
  if (u.includes('AUGMENT'))  return { couleur: 'C62828', fond: 'FFEBEE' };
  if (u.includes('DIMINU'))   return { couleur: '1565C0', fond: 'E3F2FD' };
  if (u.includes('LIMITE'))   return { couleur: 'E65100', fond: 'FFF3E0' };
  return { couleur: '212121', fond: 'FFFFFF' };
};

const markdownTableVersDocx = (lignes) => {
  const rows = lignes
    .map(l => nettoyerTexte(l.trim()))
    .filter(t => estLigneMarkdown(t) && !estSeparateurMD(t))
    .map(parseColonnesMD)
    .filter(r => r.length > 0);
  if (rows.length < 2) return null;

  const headers  = rows[0];
  const dataRows = rows.slice(1);
  const nbCols   = headers.length;
  const totalW   = 8700;
  const colW     = nbCols === 4 ? [2800, 1500, 2500, 1900]
                 : nbCols === 3 ? [3400, 2700, 2600]
                 : Array(nbCols).fill(Math.floor(totalW / nbCols));
  colW[colW.length - 1] = totalW - colW.slice(0, -1).reduce((a, b) => a + b, 0);

  const isStatutLast = /statut/i.test(headers[headers.length - 1] || '');

  const docxRows = [];

  docxRows.push(new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cellule(h, {
      gras: true, taille: 16, fondHex: 'CFD8DC', couleur: '37474F', largeur: colW[i],
      alignH: i > 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
    })),
  }));

  dataRows.forEach((row, ri) => {
    const fond = ri % 2 === 0 ? 'F5F5F5' : 'FFFFFF';
    docxRows.push(new TableRow({
      children: row.map((cell, ci) => {
        const isStatut = isStatutLast && ci === nbCols - 1;
        const { couleur, fond: fondStat } = isStatut ? couleurStatutMD(cell) : { couleur: '212121', fond };
        return cellule(cell, {
          gras: isStatut && !!cell, taille: 16,
          fondHex: isStatut ? fondStat : fond,
          couleur, largeur: colW[ci],
          alignH: ci > 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
        });
      }),
    }));
  });

  return new Table({ width: { size: totalW, type: WidthType.DXA }, rows: docxRows });
};

// ── Texte IA → éléments Word ──────────────────────────────────────────────────
const SECTION_KEYS = /^(analyse|anomalie|interpr[eé]t|synth[eè]s|explication|recommandation|pr[eé]caution)/i;
const estEnteteSection = (t) => {
  const m = t.match(/^\d+\.\s+(.+)$/);
  if (m) return SECTION_KEYS.test(m[1].trim());
  return /^pr[eé]caution\s+m[eé]dicale/i.test(t);
};

const texteIAVersElements = (texte) => {
  if (!texte) return [];
  const elements = [];
  const lignes   = texte.split('\n');
  let i = 0;

  while (i < lignes.length) {
    const ligneRaw = lignes[i];
    const t        = nettoyerTexte(ligneRaw.trim());

    if (!t || t === '---' || t === '--') {
      elements.push(new Paragraph({ spacing: { after: 60 } }));
      i++; continue;
    }

    // Tableaux Markdown — collecter les lignes consécutives
    if (estLigneMarkdown(t)) {
      const tableLines = [];
      while (i < lignes.length) {
        const tl = nettoyerTexte(lignes[i].trim());
        if (estLigneMarkdown(tl) || estSeparateurMD(tl)) { tableLines.push(lignes[i]); i++; }
        else break;
      }
      const tableau = markdownTableVersDocx(tableLines);
      if (tableau) {
        elements.push(new Paragraph({ spacing: { before: 100, after: 60 } }));
        elements.push(tableau);
      }
      continue;
    }

    // En-tête de section principale (numérotée)
    if (estEnteteSection(t)) {
      elements.push(paragrapheColore(t, {
        fondHex: '1565C0', couleur: 'FFFFFF', gras: true, taille: 20,
        espaceBefore: 240, espaceAfter: 80,
      }));
      i++; continue;
    }

    // Boîte "État général"
    if (/ETAT\s+GENERAL/i.test(t.replace(/É/g, 'E').replace(/è/g, 'e'))) {
      const isPreocc = /PREOCCUPANT|CRITIQUE|SERIEUX/i.test(t);
      const isSurv   = /SURVEILLER|ATTENTION|MODERE/i.test(t);
      const fond     = isPreocc ? 'FFEBEE' : isSurv ? 'FFF3E0' : 'E8F5E9';
      const couleur  = isPreocc ? 'C62828' : isSurv ? 'E65100' : '1B7F4F';
      elements.push(paragrapheColore(t, { fondHex: fond, couleur, gras: true, taille: 19, espaceBefore: 160, espaceAfter: 80 }));
      i++; continue;
    }

    // Sous-titre **gras** standalone
    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      elements.push(new Paragraph({
        spacing: { before: 140, after: 40 },
        children: [new TextRun({ text: t.slice(2, -2), bold: true, size: 19, color: '0D5C38' })],
      }));
      i++; continue;
    }

    // Bullet point
    const bM = t.match(/^[-]\s+(.*)/);
    if (bM) {
      elements.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [new TextRun({ text: bM[1].replace(/\*\*/g, ''), size: 18 })],
      }));
      i++; continue;
    }

    // Précaution médicale (boîte orange)
    if (/precaution\s+medicale/i.test(t.replace(/[éè]/g, 'e'))) {
      elements.push(new Paragraph({
        spacing: { before: 200, after: 80 },
        shading: { fill: 'FFF3E0', type: ShadingType.CLEAR, color: 'auto' },
        children: [new TextRun({ text: 'PRÉCAUTION MÉDICALE', bold: true, size: 19, color: 'E65100' })],
      }));
      // Collecter les lignes suivantes jusqu'à une section ou fin
      i++;
      while (i < lignes.length) {
        const tNext = nettoyerTexte(lignes[i].trim());
        if (!tNext) { i++; continue; }
        if (estEnteteSection(tNext)) break;
        elements.push(new Paragraph({
          spacing: { after: 40 },
          shading: { fill: 'FFF3E0', type: ShadingType.CLEAR, color: 'auto' },
          children: [new TextRun({ text: tNext.replace(/\*\*/g, ''), italics: true, size: 18, color: '5D4037' })],
        }));
        i++;
      }
      continue;
    }

    // Texte avec gras inline **...**
    if (t.includes('**')) {
      const parts = t.split(/(\*\*[^*]+\*\*)/);
      const runs  = parts.map((p) =>
        p.startsWith('**') && p.endsWith('**')
          ? new TextRun({ text: p.slice(2, -2), bold: true, size: 18 })
          : new TextRun({ text: p, size: 18 }),
      );
      elements.push(new Paragraph({ spacing: { after: 40 }, children: runs }));
      i++; continue;
    }

    // Texte ordinaire
    elements.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: t, size: 18 })],
    }));
    i++;
  }

  return elements;
};

// ── Génération principale ─────────────────────────────────────────────────────
const genererDocxAnalyse = async (analyse, patient) => {
  const panels   = parseJson(analyse.panels_demandes, []);
  const valeurs  = parseJson(analyse.valeurs_brutes, {});
  const sexeA    = analyse.sexe_patient;
  const sexeP    = patient?.sexe === 'feminin' ? 'F' : patient?.sexe === 'masculin' ? 'M' : null;
  const sexe     = sexeA || sexeP;
  const sexeLbl  = sexe === 'F' ? 'Féminin' : sexe === 'M' ? 'Masculin' : '-';
  const ageLbl   = analyse.age_patient ? `${analyse.age_patient} ans` : '-';
  const panelsLbl = panels.map(p => PANELS_META[p]?.label || p).join(', ') || '-';

  const children = [];

  // ── Titre ──────────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    shading: { fill: '1565C0', type: ShadingType.CLEAR, color: 'auto' },
    children: [new TextRun({ text: 'ANALYSE MÉDICALE COMPLÈTE', bold: true, size: 36, color: 'FFFFFF' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: 'Interprétation des résultats biologiques', italics: true, size: 22, color: '1B7F4F' })],
  }));

  // ── Tableau infos patient ──────────────────────────────────────────────────
  children.push(paragrapheColore('INFORMATIONS PATIENT', {
    fondHex: '0D5C38', couleur: 'FFFFFF', gras: true, taille: 20,
    espaceBefore: 100, espaceAfter: 0,
  }));

  const COL_INFO = [2500, 6200];
  const infoRows = [
    ['Patient',              patient ? `${patient.prenom || ''} ${patient.nom || ''}`.trim() : '-'],
    ['Date des examens',     fmtDate(analyse.date_analyse)],
    ['Âge / Sexe',           `${ageLbl}  —  ${sexeLbl}`],
    ['N° Dossier',           patient?.numero_dossier || '-'],
    ['Examens demandés',     panelsLbl],
  ];
  children.push(new Table({
    width: { size: COL_INFO[0] + COL_INFO[1], type: WidthType.DXA },
    rows: infoRows.map((row, i) => new TableRow({
      children: [
        cellule(row[0], { gras: true, fondHex: i % 2 === 0 ? 'CFD8DC' : 'ECEFF1', couleur: '0D5C38', taille: 17, largeur: COL_INFO[0] }),
        cellule(row[1], { fondHex: i % 2 === 0 ? 'FFFFFF' : 'FAFAFA', taille: 18, largeur: COL_INFO[1] }),
      ],
    })),
  }));

  // ── Section 1 : valeurs biologiques ───────────────────────────────────────
  children.push(new Paragraph({ spacing: { before: 280, after: 0 } }));
  children.push(paragrapheColore('1. RÉSULTATS DES ANALYSES — VALEURS MESURÉES', {
    fondHex: '1565C0', couleur: 'FFFFFF', gras: true, taille: 20,
    espaceBefore: 0, espaceAfter: 0,
  }));

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
    children.push(new Paragraph({ spacing: { before: 280, after: 0 } }));
    children.push(paragrapheColore('2. INTERPRÉTATION MÉDICALE (générée par IA)', {
      fondHex: '1565C0', couleur: 'FFFFFF', gras: true, taille: 20,
      espaceBefore: 0, espaceAfter: 80,
    }));
    children.push(...texteIAVersElements(analyse.analyse_ia_texte));
  }

  const doc = new Document({
    creator: 'ZEZEPAGNON Dossiers Patients',
    title: `Analyse médicale — ${patient ? `${patient.prenom || ''} ${patient.nom || ''}`.trim() : 'Patient'}`,
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
            top:    convertInchesToTwip(0.9),
            right:  convertInchesToTwip(0.9),
            bottom: convertInchesToTwip(0.9),
            left:   convertInchesToTwip(0.9),
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              ...(fs.existsSync(LOGO_PATH) ? [new ImageRun({
                data: fs.readFileSync(LOGO_PATH),
                transformation: { width: 45, height: 45 },
                floating: {
                  horizontalPosition: { offset: 457200 },
                  verticalPosition:   { offset: 0 },
                },
              })] : []),
              new TextRun({ text: 'MAPA', bold: true, size: 28, color: '1565C0' }),
              new TextRun({ text: '\t', size: 20 }),
              new TextRun({ text: 'Maximizing American Potential in Africa', size: 18, color: '616161' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            ...(fs.existsSync(FOOTER_PATH) ? [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [new ImageRun({
                data: fs.readFileSync(FOOTER_PATH),
                transformation: { width: 595, height: 119 },
              })],
            })] : []),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 16, color: '9E9E9E' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9E9E9E' }),
                new TextRun({ text: ' sur ', size: 16, color: '9E9E9E' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9E9E9E' }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
};

module.exports = { genererDocxAnalyse };
