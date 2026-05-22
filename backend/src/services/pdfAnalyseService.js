'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ── Assets ────────────────────────────────────────────────────────────────────
const HEADER_PATH = path.resolve(__dirname, '../assets/header-ordonnance.png');
const FOOTER_PATH = path.resolve(__dirname, '../assets/footer-ordonnance.png');

// ── Dimensions A4 (cohérent avec pdfService.js) ───────────────────────────────
const PAGE_W      = 495;
const PAGE_H      = 842;
const ML          = 50;
const HEADER_H    = Math.round(PAGE_W * 124 / 460);   // ≈ 133
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800);  // ≈ 99
const MARGIN_TOP  = 20;
const CONTENT_TOP = MARGIN_TOP + HEADER_H + 14;       // ≈ 167
const FOOTER_Y    = PAGE_H - 20 - FOOTER_H;           // ≈ 723
const CONTENT_BOT = FOOTER_Y - 10;

// ── Palette ───────────────────────────────────────────────────────────────────
const BLEU_FONCE  = '#1565C0';
const VERT        = '#1B7F4F';
const VERT_FONCE  = '#0D5C38';
const ROUGE       = '#C62828';
const ROUGE_FOND  = '#FFEBEE';
const ORANGE      = '#E65100';
const ORANGE_FOND = '#FFF3E0';
const BLEU_DIM    = '#1565C0';
const BLEU_FOND   = '#E3F2FD';
const VERT_FOND   = '#E8F5E9';
const GRIS        = '#616161';
const GRIS_BORD   = '#BDBDBD';
const NOIR        = '#212121';
const FOND_GRIS   = '#F5F5F5';
const FOND_ENTETE = '#CFD8DC';
const ENTETE_TXT  = '#37474F';

// ── Référentiels panels ───────────────────────────────────────────────────────
const PARAMS_NFS = {
  hemoglobine:      { label: 'Hémoglobine',        unite: 'g/dL',          ref: (s) => s === 'F' ? '12–16'   : '13–17' },
  hematocrite:      { label: 'Hématocrite',         unite: '%',             ref: (s) => s === 'F' ? '35–47'   : '40–54' },
  globules_rouges:  { label: 'Globules rouges',     unite: 'T/L',           ref: (s) => s === 'F' ? '4,0–5,2' : '4,5–5,9' },
  vgm:              { label: 'VGM',                 unite: 'fL',            ref: () => '80–100' },
  tcmh:             { label: 'TCMH',                unite: 'pg',            ref: () => '27–33' },
  ccmh:             { label: 'CCMH',                unite: 'g/dL',          ref: () => '32–36' },
  rdw:              { label: 'RDW',                 unite: '%',             ref: () => '11,5–14,5' },
  globules_blancs:  { label: 'Globules blancs',     unite: 'G/L',           ref: () => '4–10' },
  neutrophiles_abs: { label: 'Neutrophiles (abs)',  unite: 'G/L',           ref: () => '1,8–7,5' },
  neutrophiles_pct: { label: 'Neutrophiles (%)',    unite: '%',             ref: () => '40–75' },
  lymphocytes_abs:  { label: 'Lymphocytes (abs)',   unite: 'G/L',           ref: () => '1,0–4,0' },
  lymphocytes_pct:  { label: 'Lymphocytes (%)',     unite: '%',             ref: () => '20–40' },
  monocytes_abs:    { label: 'Monocytes (abs)',     unite: 'G/L',           ref: () => '0,2–1,0' },
  monocytes_pct:    { label: 'Monocytes (%)',       unite: '%',             ref: () => '2–10' },
  eosinophiles_abs: { label: 'Éosinophiles (abs)',  unite: 'G/L',           ref: () => '0–0,5' },
  eosinophiles_pct: { label: 'Éosinophiles (%)',    unite: '%',             ref: () => '0–5' },
  basophiles_abs:   { label: 'Basophiles (abs)',    unite: 'G/L',           ref: () => '0–0,1' },
  basophiles_pct:   { label: 'Basophiles (%)',      unite: '%',             ref: () => '0–1' },
  plaquettes:       { label: 'Plaquettes',          unite: 'G/L',           ref: () => '150–400' },
};
const PARAMS_RENAL = {
  creatinine:   { label: 'Créatinine',   unite: 'µmol/L',        ref: (s) => s === 'F' ? '44–97'    : '53–106' },
  uree:         { label: 'Urée',         unite: 'mmol/L',        ref: () => '2,5–7,5' },
  acide_urique: { label: 'Acide urique', unite: 'µmol/L',        ref: (s) => s === 'F' ? '143–339'  : '202–416' },
  dfg:          { label: 'DFG estimé',   unite: 'mL/min/1.73m²', ref: () => '> 60' },
};
const PARAMS_GLYCEMIE = {
  glycemie_jeun:          { label: 'Glycémie à jeun',        unite: 'mmol/L', ref: () => '3,9–5,5' },
  glycemie_postprandiale: { label: 'Glycémie postprandiale', unite: 'mmol/L', ref: () => '< 7,8' },
  hba1c:                  { label: 'HbA1c',                  unite: '%',      ref: () => '< 5,7' },
};
const PARAMS_LIPIDIQUE = {
  cholesterol_total: { label: 'Cholestérol total', unite: 'mmol/L', ref: () => '< 5,2' },
  ldl:               { label: 'LDL-cholestérol',   unite: 'mmol/L', ref: () => '< 3,4' },
  hdl:               { label: 'HDL-cholestérol',   unite: 'mmol/L', ref: (s) => s === 'F' ? '> 1,3' : '> 1,0' },
  triglycerides:     { label: 'Triglycérides',      unite: 'mmol/L', ref: () => '< 1,7' },
};
const PARAMS_IONOGRAMME = {
  sodium:       { label: 'Sodium',       unite: 'mmol/L', ref: () => '136–145' },
  potassium:    { label: 'Potassium',    unite: 'mmol/L', ref: () => '3,5–5,0' },
  chlore:       { label: 'Chlore',       unite: 'mmol/L', ref: () => '98–107' },
  calcium:      { label: 'Calcium',      unite: 'mmol/L', ref: () => '2,2–2,6' },
  magnesium:    { label: 'Magnésium',    unite: 'mmol/L', ref: () => '0,75–0,95' },
  phosphore:    { label: 'Phosphore',    unite: 'mmol/L', ref: () => '0,81–1,45' },
  bicarbonates: { label: 'Bicarbonates', unite: 'mmol/L', ref: () => '22–29' },
};
const PANELS_META = {
  nfs:        { label: 'NFS — Numération Formule Sanguine', params: PARAMS_NFS },
  renal:      { label: 'Bilan rénal',                       params: PARAMS_RENAL },
  glycemie:   { label: 'Bilan glycémique',                  params: PARAMS_GLYCEMIE },
  lipidique:  { label: 'Bilan lipidique',                   params: PARAMS_LIPIDIQUE },
  ionogramme: { label: 'Ionogramme',                        params: PARAMS_IONOGRAMME },
};

// ── Utilitaires ───────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const parseJson = (v, fallback) => {
  if (!v) return fallback;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  return v;
};

const calculerStatut = (valeur, refStr) => {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const num = parseFloat(String(valeur).replace(',', '.'));
  if (isNaN(num)) return null;
  const clean = refStr.replace(/\s*\([^)]+\)/, '').trim();
  if (clean.includes('–')) {
    const [a, b] = clean.split('–').map(s => parseFloat(s.replace(',', '.')));
    if (isNaN(a) || isNaN(b)) return null;
    if (num < a) return { label: '↓ Diminué',   couleur: BLEU_DIM, fond: BLEU_FOND };
    if (num > b) return { label: '↑ Augmenté',  couleur: ROUGE,    fond: ROUGE_FOND };
    return           { label: 'Normal',          couleur: VERT,     fond: VERT_FOND };
  }
  const ltM = clean.match(/^<\s*([\d,]+)/);
  if (ltM) {
    const s = parseFloat(ltM[1].replace(',', '.'));
    if (num < s * 0.95) return { label: 'Normal',      couleur: VERT,   fond: VERT_FOND };
    if (num < s)        return { label: '↑ Limite',     couleur: ORANGE, fond: ORANGE_FOND };
    return                     { label: '↑ Augmenté',   couleur: ROUGE,  fond: ROUGE_FOND };
  }
  const gtM = clean.match(/^>\s*([\d,]+)/);
  if (gtM) {
    const s = parseFloat(gtM[1].replace(',', '.'));
    if (num > s * 1.05) return { label: 'Normal',      couleur: VERT,    fond: VERT_FOND };
    if (num > s)        return { label: '↓ Limite',     couleur: ORANGE,  fond: ORANGE_FOND };
    return                     { label: '↓ Diminué',    couleur: BLEU_DIM, fond: BLEU_FOND };
  }
  return null;
};

// ── Dessin header / footer ────────────────────────────────────────────────────
const dessinerHeader = (doc) => {
  if (fs.existsSync(HEADER_PATH)) doc.image(HEADER_PATH, ML, MARGIN_TOP, { width: PAGE_W });
  const ySep = CONTENT_TOP - 6;
  doc.moveTo(ML, ySep).lineTo(ML + PAGE_W, ySep).strokeColor(VERT).lineWidth(1.5).stroke();
};

const dessinerFooter = (doc, pageNum, total) => {
  if (fs.existsSync(FOOTER_PATH)) doc.image(FOOTER_PATH, ML, FOOTER_Y, { width: PAGE_W });
  else {
    doc.moveTo(ML, FOOTER_Y).lineTo(ML + PAGE_W, FOOTER_Y)
       .strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
  }
  doc.fontSize(7.5).font('Helvetica').fillColor(GRIS)
     .text(`Page ${pageNum} sur ${total}`, ML, FOOTER_Y + 4, { width: PAGE_W, align: 'right' });
};

// ── Dessin de cellule avec fond + bordure + texte ─────────────────────────────
const CELL_H   = 18;
const CELL_PAD = 4;

const dessinerCellule = (doc, x, y, w, h, texte, opts = {}) => {
  const { fond, couleur = NOIR, police = 'Helvetica', taille = 8.5, align = 'left' } = opts;
  if (fond) doc.rect(x, y, w, h).fill(fond);
  doc.rect(x, y, w, h).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
  if (texte) {
    doc.font(police).fontSize(taille).fillColor(couleur)
       .text(String(texte), x + CELL_PAD, y + (h - taille) / 2, {
         width: w - CELL_PAD * 2, align, lineBreak: false,
       });
  }
};

// ── Tableau de paramètres (Paramètre | Résultat | Normes | Statut) ────────────
const COL_WIDTHS_PARAMS = [190, 100, 120, 85];
const HEADERS_PARAMS    = ['Paramètre', 'Résultat', 'Normes', 'Statut'];

const dessinerEnTeteTableauParams = (doc, y) => {
  let x = ML;
  HEADERS_PARAMS.forEach((h, i) => {
    dessinerCellule(doc, x, y, COL_WIDTHS_PARAMS[i], CELL_H, h, {
      fond: FOND_ENTETE, couleur: ENTETE_TXT, police: 'Helvetica-Bold', taille: 8, align: i > 0 ? 'center' : 'left',
    });
    x += COL_WIDTHS_PARAMS[i];
  });
  return y + CELL_H;
};

const dessinerTableauPanel = (doc, panelMeta, vPanel, sexe) => {
  const lignes = Object.entries(panelMeta.params)
    .map(([cle, param]) => ({ cle, param, val: vPanel[cle] }))
    .filter(({ val }) => val !== null && val !== undefined && val !== '');

  if (!lignes.length) return;

  // Vérifier espace disponible
  const hRequis = CELL_H + CELL_H + lignes.length * CELL_H + 10;
  if (doc.y + hRequis > CONTENT_BOT) {
    doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP;
  }

  // Titre panel — barre sombre
  const y0 = doc.y;
  doc.rect(ML, y0, PAGE_W, CELL_H + 2).fill(VERT_FONCE);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('white')
     .text(panelMeta.label, ML + 6, y0 + 5, { width: PAGE_W - 12 });

  // En-tête colonnes
  let y = dessinerEnTeteTableauParams(doc, y0 + CELL_H + 2);

  // Lignes de données
  lignes.forEach((item, idx) => {
    if (y + CELL_H > CONTENT_BOT) {
      doc.addPage(); dessinerHeader(doc);
      y = CONTENT_TOP;
      y = dessinerEnTeteTableauParams(doc, y);
    }
    const fond = idx % 2 === 0 ? FOND_GRIS : 'white';
    const refStr = item.param.ref(sexe);
    const statut = calculerStatut(item.val, refStr);

    let x = ML;
    dessinerCellule(doc, x, y, COL_WIDTHS_PARAMS[0], CELL_H, item.param.label, { fond });
    x += COL_WIDTHS_PARAMS[0];
    dessinerCellule(doc, x, y, COL_WIDTHS_PARAMS[1], CELL_H, `${item.val} ${item.param.unite}`, { fond, align: 'right', police: 'Helvetica-Bold' });
    x += COL_WIDTHS_PARAMS[1];
    dessinerCellule(doc, x, y, COL_WIDTHS_PARAMS[2], CELL_H, `${refStr} ${item.param.unite}`, { fond, align: 'right' });
    x += COL_WIDTHS_PARAMS[2];
    dessinerCellule(doc, x, y, COL_WIDTHS_PARAMS[3], CELL_H, statut?.label || '—', {
      fond: statut?.fond || fond, couleur: statut?.couleur || GRIS, police: 'Helvetica-Bold', taille: 8, align: 'center',
    });
    y += CELL_H;
  });

  doc.y = y + 8;
};

// ── Tableau infos patient ─────────────────────────────────────────────────────
const dessinerTableauPatient = (doc, rows) => {
  const COL_L = 145;
  const COL_R = PAGE_W - COL_L;
  const TOTAL_H = rows.length * CELL_H;

  // Contour global
  doc.rect(ML, doc.y, PAGE_W, TOTAL_H).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

  rows.forEach((row, i) => {
    const y = doc.y + i * CELL_H;
    // Cellule label
    doc.rect(ML, y, COL_L, CELL_H).fill(FOND_ENTETE);
    doc.rect(ML, y, COL_L, CELL_H).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(VERT_FONCE)
       .text(row[0], ML + CELL_PAD, y + (CELL_H - 8) / 2, { width: COL_L - CELL_PAD * 2, lineBreak: false });
    // Cellule valeur
    doc.rect(ML + COL_L, y, COL_R, CELL_H).fill('white');
    doc.rect(ML + COL_L, y, COL_R, CELL_H).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(NOIR)
       .text(row[1] || '—', ML + COL_L + CELL_PAD, y + (CELL_H - 8.5) / 2, { width: COL_R - CELL_PAD * 2, lineBreak: false });
  });

  doc.y = doc.y + TOTAL_H + 12;
};

// ── Nettoyage emojis (Helvetica ne supporte pas l'unicode > Latin-1) ──────────
const nettoyerPourPDF = (str) => {
  if (!str) return '';
  return str
    // Remplacer flèches et symboles courants en ASCII
    .replace(/↑/g, '^ ').replace(/↓/g, 'v ')
    .replace(/✓/g, 'OK').replace(/✗/g, 'X')
    .replace(/•/g, '-')
    .replace(/🟢/g, '[Normal]').replace(/🟡/g, '[Surveiller]').replace(/🔴/g, '[Critique]')
    // Supprimer tous les emojis et symboles hors Latin-1
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[☀-➿]/g, '')
    .replace(/[︀}-️]/g, '')
    // Nettoyer les espaces multiples
    .replace(/ {2,}/g, ' ')
    .trim();
};

// ── Rendu texte IA ─────────────────────────────────────────────────────────────
const isSectionHeader = (t) => /^\s*\d+\.\s+\S/.test(t) || /^(analyse|identification|interpr[eé]tation|synth[eè]se|explication|recommandations|pr[eé]caution)/i.test(t);

const rendreTexteInline = (doc, texte, x, y, largeur, taille, couleur = NOIR) => {
  if (!texte.includes('**')) {
    doc.fontSize(taille).font('Helvetica').fillColor(couleur).text(texte, x, y, { width: largeur });
    return;
  }
  const segs = [];
  let gras = false, buf = '', i = 0;
  while (i < texte.length) {
    if (texte[i] === '*' && texte[i + 1] === '*') { if (buf) segs.push({ t: buf, b: gras }); buf = ''; gras = !gras; i += 2; }
    else buf += texte[i++];
  }
  if (buf) segs.push({ t: buf, b: gras });
  const nv = segs.filter(s => s.t);
  nv.forEach((seg, idx) => {
    doc.fontSize(taille).font(seg.b ? 'Helvetica-Bold' : 'Helvetica').fillColor(couleur);
    if (idx === 0) doc.text(seg.t, x, y, { width: largeur, continued: idx < nv.length - 1 });
    else doc.text(seg.t, { width: largeur, continued: idx < nv.length - 1 });
  });
};

const rendreTexteIA = (doc, texte) => {
  if (!texte) return;
  for (const ligneRaw of texte.split('\n')) {
    if (doc.y > CONTENT_BOT - 20) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    const t = nettoyerPourPDF(ligneRaw.trim());
    if (!t) { doc.y = Math.min(doc.y + 4, CONTENT_BOT); continue; }

    if (isSectionHeader(t)) {
      if (doc.y + 26 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const y = doc.y + 5;
      doc.rect(ML, y, PAGE_W, 20).fill(BLEU_FONCE);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
         .text(t.replace(/\*\*/g, ''), ML + 8, y + 6, { width: PAGE_W - 16 });
      doc.y = y + 26;
      continue;
    }

    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(VERT_FONCE)
         .text(t.slice(2, -2), ML, doc.y + 2, { width: PAGE_W });
      continue;
    }

    const bM = t.match(/^[-•*]\s+(.*)/);
    if (bM) {
      const yB = doc.y + 1;
      doc.fontSize(8.5).font('Helvetica').fillColor(GRIS).text('•', ML + 4, yB, { width: 10 });
      rendreTexteInline(doc, bM[1], ML + 16, yB, PAGE_W - 16, 8.5, NOIR);
      continue;
    }

    if (/precaution|avertissement|important/i.test(t) && t.length > 10) {
      if (doc.y + 36 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const yA = doc.y + 4;
      doc.rect(ML, yA, 3, 32).fill(ORANGE);
      doc.rect(ML + 3, yA, PAGE_W - 3, 32).fill(ORANGE_FOND);
      doc.rect(ML, yA, PAGE_W, 32).strokeColor(ORANGE).lineWidth(0.5).stroke();
      doc.fontSize(8).font('Helvetica').fillColor(ORANGE)
         .text(t.replace(/\*\*/g, ''), ML + 10, yA + 10, { width: PAGE_W - 18 });
      doc.y = yA + 40;
      continue;
    }

    rendreTexteInline(doc, t, ML, doc.y + 1, PAGE_W, 9, NOIR);
  }
};

// ── Génération principale ─────────────────────────────────────────────────────
const genererPdfAnalyse = (analyse, patient) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ bufferPages: true, margin: 0, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    dessinerHeader(doc);
    doc.y = CONTENT_TOP;

    // ── Titre ──────────────────────────────────────────────────────────────
    doc.rect(ML, doc.y, PAGE_W, 30).fill(BLEU_FONCE);
    doc.fontSize(15).font('Helvetica-Bold').fillColor('white')
       .text('ANALYSE MÉDICALE COMPLÈTE', ML, doc.y + 8, { width: PAGE_W, align: 'center' });
    doc.y = doc.y + 30;
    doc.fontSize(9).font('Helvetica-Oblique').fillColor(VERT)
       .text('Interprétation des résultats biologiques', ML, doc.y + 3, { width: PAGE_W, align: 'center' });
    doc.y = doc.y + 14;

    // ── Tableau infos patient ──────────────────────────────────────────────
    const panels    = parseJson(analyse.panels_demandes, []);
    const panelsLbl = panels.map(p => PANELS_META[p]?.label || p).join(', ') || '—';
    const sexeA     = analyse.sexe_patient;
    const sexeP     = patient?.sexe === 'feminin' ? 'F' : patient?.sexe === 'masculin' ? 'M' : null;
    const sexe      = sexeA || sexeP;
    const sexeLbl   = sexe === 'F' ? 'Féminin' : sexe === 'M' ? 'Masculin' : '—';
    const ageLbl    = analyse.age_patient ? `${analyse.age_patient} ans` : '—';

    dessinerTableauPatient(doc, [
      ['Patient',            patient ? `${patient.prenom} ${patient.nom}` : '—'],
      ['Date de naissance',  patient?.date_naissance ? fmtDate(patient.date_naissance) : '—'],
      ['Âge / Sexe',         `${ageLbl}   ·   ${sexeLbl}`],
      ['Dossier N°',         patient?.numero_dossier || '—'],
      ['Date de prélèvement', fmtDate(analyse.date_analyse)],
      ['Examens demandés',   panelsLbl],
    ]);

    // ── Section 1 : Valeurs biologiques ───────────────────────────────────
    // Titre section
    doc.rect(ML, doc.y, PAGE_W, 20).fill(VERT_FONCE);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
       .text('1.  RÉSULTATS DES ANALYSES — VALEURS MESURÉES', ML + 8, doc.y + 6, { width: PAGE_W - 16 });
    doc.y = doc.y + 24;

    const valeurs = parseJson(analyse.valeurs_brutes, {});
    for (const panelId of panels) {
      const meta = PANELS_META[panelId];
      if (!meta) continue;
      dessinerTableauPanel(doc, meta, valeurs[panelId] || {}, sexe);
    }

    // ── Section 2 : Interprétation IA ─────────────────────────────────────
    if (analyse.analyse_ia_texte) {
      if (doc.y + 30 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }

      doc.y = doc.y + 4;
      doc.rect(ML, doc.y, PAGE_W, 20).fill(VERT_FONCE);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
         .text('2.  INTERPRÉTATION MÉDICALE (générée par IA)', ML + 8, doc.y + 6, { width: PAGE_W - 16 });
      doc.y = doc.y + 26;

      rendreTexteIA(doc, analyse.analyse_ia_texte);

      if (analyse.cout_estime_usd) {
        doc.fontSize(6.5).font('Helvetica').fillColor(GRIS_BORD)
           .text(
             `Analyse générée par ${analyse.analyse_ia_modele || 'IA'} — Coût estimé : $${parseFloat(analyse.cout_estime_usd).toFixed(4)}`,
             ML, doc.y + 4, { width: PAGE_W, align: 'right' },
           );
      }
    } else {
      if (doc.y + 40 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      doc.y = doc.y + 8;
      doc.rect(ML, doc.y, PAGE_W, 34).fill(FOND_GRIS);
      doc.rect(ML, doc.y, PAGE_W, 34).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
      doc.fontSize(8.5).font('Helvetica').fillColor(GRIS)
         .text(
           "L'interprétation médicale n'a pas encore été générée.\nUtilisez le bouton « Analyser avec l'IA » dans le dossier patient.",
           ML + 10, doc.y + 9, { width: PAGE_W - 20 },
         );
      doc.y = doc.y + 40;
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    doc.flushPages();
    const total = doc.bufferedPageRange().count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      dessinerFooter(doc, i + 1, total);
    }
    doc.end();
  });

module.exports = { genererPdfAnalyse };
