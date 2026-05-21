'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ── Assets ────────────────────────────────────────────────────────────────────
const HEADER_PATH = path.resolve(__dirname, '../assets/header-ordonnance.png');
const FOOTER_PATH = path.resolve(__dirname, '../assets/footer-ordonnance.png');

// ── Dimensions (cohérent avec pdfService.js) ──────────────────────────────────
const PAGE_W      = 495;                              // largeur utile A4
const PAGE_H      = 842;
const ML          = 50;
const HEADER_H    = Math.round(PAGE_W * 124 / 460);  // ≈ 133
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800); // ≈ 99
const MARGIN_TOP  = 20;
const CONTENT_TOP = MARGIN_TOP + HEADER_H + 14;      // ≈ 167
const FOOTER_Y    = PAGE_H - 20 - FOOTER_H;          // ≈ 723
const CONTENT_BOT = FOOTER_Y - 8;

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
const GRIS_CLAIR  = '#E0E0E0';
const NOIR        = '#212121';
const FOND_GRIS   = '#F5F5F5';

// ── Référentiels panels (miroir de analyseIAService) ─────────────────────────
const PARAMS_NFS = {
  hemoglobine:      { label: 'Hémoglobine',        unite: 'g/dL',         ref: (s) => s === 'F' ? '12–16'   : '13–17' },
  hematocrite:      { label: 'Hématocrite',         unite: '%',            ref: (s) => s === 'F' ? '35–47'   : '40–54' },
  globules_rouges:  { label: 'Globules rouges',     unite: 'T/L',          ref: (s) => s === 'F' ? '4,0–5,2' : '4,5–5,9' },
  vgm:              { label: 'VGM',                 unite: 'fL',           ref: () => '80–100' },
  tcmh:             { label: 'TCMH',                unite: 'pg',           ref: () => '27–33' },
  ccmh:             { label: 'CCMH',                unite: 'g/dL',         ref: () => '32–36' },
  rdw:              { label: 'RDW',                 unite: '%',            ref: () => '11,5–14,5' },
  globules_blancs:  { label: 'Globules blancs',     unite: 'G/L',          ref: () => '4–10' },
  neutrophiles_abs: { label: 'Neutrophiles (abs)',  unite: 'G/L',          ref: () => '1,8–7,5' },
  neutrophiles_pct: { label: 'Neutrophiles (%)',    unite: '%',            ref: () => '40–75' },
  lymphocytes_abs:  { label: 'Lymphocytes (abs)',   unite: 'G/L',          ref: () => '1,0–4,0' },
  lymphocytes_pct:  { label: 'Lymphocytes (%)',     unite: '%',            ref: () => '20–40' },
  monocytes_abs:    { label: 'Monocytes (abs)',     unite: 'G/L',          ref: () => '0,2–1,0' },
  monocytes_pct:    { label: 'Monocytes (%)',       unite: '%',            ref: () => '2–10' },
  eosinophiles_abs: { label: 'Éosinophiles (abs)',  unite: 'G/L',          ref: () => '0–0,5' },
  eosinophiles_pct: { label: 'Éosinophiles (%)',    unite: '%',            ref: () => '0–5' },
  basophiles_abs:   { label: 'Basophiles (abs)',    unite: 'G/L',          ref: () => '0–0,1' },
  basophiles_pct:   { label: 'Basophiles (%)',      unite: '%',            ref: () => '0–1' },
  plaquettes:       { label: 'Plaquettes',          unite: 'G/L',          ref: () => '150–400' },
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

// Calcul statut par rapport à la référence
const calculerStatut = (valeur, refStr) => {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const num = parseFloat(String(valeur).replace(',', '.'));
  if (isNaN(num)) return null;

  const clean = refStr.replace(/\s*\([^)]+\)/, '').trim();

  if (clean.includes('–')) {
    const parts = clean.split('–');
    const lo = parseFloat(parts[0].replace(',', '.'));
    const hi = parseFloat(parts[1].replace(',', '.'));
    if (isNaN(lo) || isNaN(hi)) return null;
    if (num < lo) return { label: '↓ Diminué',    couleur: BLEU_DIM, fond: BLEU_FOND };
    if (num > hi) return { label: '↑ Augmenté',   couleur: ROUGE,    fond: ROUGE_FOND };
    return           { label: 'Normal',            couleur: VERT,     fond: VERT_FOND };
  }
  const ltM = clean.match(/^<\s*([\d,]+)/);
  if (ltM) {
    const seuil = parseFloat(ltM[1].replace(',', '.'));
    if (num < seuil * 0.95) return { label: 'Normal',         couleur: VERT,   fond: VERT_FOND };
    if (num < seuil)        return { label: '↑ Limite',        couleur: ORANGE, fond: ORANGE_FOND };
    return                         { label: '↑ Augmenté',      couleur: ROUGE,  fond: ROUGE_FOND };
  }
  const gtM = clean.match(/^>\s*([\d,]+)/);
  if (gtM) {
    const seuil = parseFloat(gtM[1].replace(',', '.'));
    if (num > seuil * 1.05) return { label: 'Normal',         couleur: VERT,    fond: VERT_FOND };
    if (num > seuil)        return { label: '↓ Limite',        couleur: ORANGE,  fond: ORANGE_FOND };
    return                         { label: '↓ Diminué',       couleur: BLEU_DIM, fond: BLEU_FOND };
  }
  return null;
};

// ── Dessin header/footer (même assets que ordonnance) ────────────────────────
const dessinerHeader = (doc) => {
  if (fs.existsSync(HEADER_PATH)) {
    doc.image(HEADER_PATH, ML, MARGIN_TOP, { width: PAGE_W });
  }
  const ySep = CONTENT_TOP - 6;
  doc.moveTo(ML, ySep).lineTo(ML + PAGE_W, ySep).strokeColor(VERT).lineWidth(1.5).stroke();
};

const dessinerFooter = (doc, pageNum, totalPages) => {
  if (fs.existsSync(FOOTER_PATH)) {
    doc.image(FOOTER_PATH, ML, FOOTER_Y, { width: PAGE_W });
  } else {
    doc.moveTo(ML, FOOTER_Y).lineTo(ML + PAGE_W, FOOTER_Y)
       .strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();
    doc.fontSize(7).font('Helvetica').fillColor(GRIS)
       .text('Alexis BREVET — Médecin / Biologiste', ML, FOOTER_Y + 10, { width: PAGE_W, align: 'center' });
  }
  doc.fontSize(7.5).font('Helvetica').fillColor(GRIS)
     .text(`Page ${pageNum} sur ${totalPages}`, ML, FOOTER_Y + 4, { width: PAGE_W, align: 'right' });
};

// ── Helpers de dessin ─────────────────────────────────────────────────────────
const titreSection = (doc, texte, couleur = VERT_FONCE) => {
  const y = doc.y + 6;
  doc.rect(ML, y, PAGE_W, 18).fill(couleur);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
     .text(texte, ML + 8, y + 5, { width: PAGE_W - 16 });
  doc.y = y + 22;
};

const ligneParametre = (doc, y, vals, fond = null, statutInfo = null) => {
  const H = 15;
  const cols = [
    { x: ML + 2,      w: 185 },
    { x: ML + 191,    w: 90 },
    { x: ML + 285,    w: 120 },
    { x: ML + 409,    w: 84 },
  ];

  if (fond) doc.rect(ML, y, PAGE_W, H).fill(fond);

  doc.moveTo(ML, y + H).lineTo(ML + PAGE_W, y + H)
     .strokeColor(GRIS_CLAIR).lineWidth(0.3).stroke();

  doc.fontSize(8).font('Helvetica').fillColor(NOIR);
  doc.text(vals[0] || '', cols[0].x, y + 4, { width: cols[0].w });
  doc.text(vals[1] || '', cols[1].x, y + 4, { width: cols[1].w });
  doc.text(vals[2] || '', cols[2].x, y + 4, { width: cols[2].w });

  if (statutInfo) {
    doc.rect(cols[3].x - 2, y + 1, cols[3].w, H - 2).fill(statutInfo.fond);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(statutInfo.couleur)
       .text(statutInfo.label, cols[3].x, y + 4, { width: cols[3].w, align: 'center' });
  } else {
    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
       .text(vals[3] || '—', cols[3].x, y + 4, { width: cols[3].w, align: 'center' });
  }

  return y + H;
};

// Texte inline avec gras (**...**)
const rendreTexteInline = (doc, texte, x, y, largeur, taille, couleur = NOIR) => {
  if (!texte.includes('**')) {
    doc.fontSize(taille).font('Helvetica').fillColor(couleur)
       .text(texte, x, y, { width: largeur });
    return;
  }

  const segments = [];
  let gras = false;
  let buf = '';
  let i = 0;
  while (i < texte.length) {
    if (texte[i] === '*' && texte[i + 1] === '*') {
      if (buf) segments.push({ t: buf, b: gras });
      buf = '';
      gras = !gras;
      i += 2;
    } else {
      buf += texte[i++];
    }
  }
  if (buf) segments.push({ t: buf, b: gras });
  const nonVides = segments.filter(s => s.t);

  nonVides.forEach((seg, idx) => {
    const isLast = idx === nonVides.length - 1;
    doc.fontSize(taille).font(seg.b ? 'Helvetica-Bold' : 'Helvetica').fillColor(couleur);
    if (idx === 0) {
      doc.text(seg.t, x, y, { width: largeur, continued: !isLast });
    } else {
      doc.text(seg.t, { width: largeur, continued: !isLast });
    }
  });
};

const SECTION_EMOJIS = ['📊', '⚠', '🧠', '📋', '💬', '🩺', '⚖'];

const isSectionHeader = (ligne) => {
  const t = ligne.trim();
  return SECTION_EMOJIS.some(e => t.includes(e) && /\d+\./.test(t));
};

// ── Rendu du texte IA ─────────────────────────────────────────────────────────
const rendreTexteIA = (doc, texte) => {
  if (!texte) return;
  const lignes = texte.split('\n');

  for (const ligne of lignes) {
    if (doc.y > CONTENT_BOT - 20) {
      doc.addPage();
      dessinerHeader(doc);
      doc.y = CONTENT_TOP;
    }

    const t = ligne.trim();

    if (!t) {
      doc.y = Math.min(doc.y + 4, CONTENT_BOT);
      continue;
    }

    // En-tête de section (contient un emoji de section + numéro)
    if (isSectionHeader(t)) {
      const yS = doc.y + 5;
      if (yS + 20 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const clean = t.replace(/\*\*/g, '');
      doc.rect(ML, doc.y + 4, PAGE_W, 18).fill(BLEU_FONCE);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
         .text(clean, ML + 8, doc.y + 9, { width: PAGE_W - 16 });
      doc.y = doc.y + 27;
      continue;
    }

    // Ligne entièrement en gras → sous-titre de section
    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      const clean = t.slice(2, -2);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(VERT_FONCE)
         .text(clean, ML, doc.y + 3, { width: PAGE_W });
      continue;
    }

    // Bullet point
    const bulletM = t.match(/^[-•*]\s+(.*)/);
    if (bulletM) {
      const yBullet = doc.y + 1;
      doc.fontSize(8.5).font('Helvetica').fillColor(GRIS)
         .text('•', ML + 4, yBullet, { width: 10 });
      rendreTexteInline(doc, bulletM[1], ML + 16, yBullet, PAGE_W - 16, 8.5, NOIR);
      continue;
    }

    // Bloc précaution ⚠️
    if (t.includes('⚠') && t.length > 5) {
      const yA = doc.y + 4;
      if (yA + 30 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      doc.rect(ML, yA, PAGE_W, 1).fill(ORANGE);
      doc.rect(ML, yA + 1, PAGE_W, 28).fill(ORANGE_FOND);
      doc.rect(ML, yA + 29, PAGE_W, 1).fill(ORANGE);
      doc.fontSize(8).font('Helvetica').fillColor(ORANGE)
         .text(t.replace(/\*\*/g, ''), ML + 8, yA + 8, { width: PAGE_W - 16 });
      doc.y = yA + 36;
      continue;
    }

    // Texte normal
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
    doc.fontSize(18).font('Helvetica-Bold').fillColor(BLEU_FONCE)
       .text('ANALYSE MÉDICALE COMPLÈTE', ML, doc.y, { width: PAGE_W, align: 'center' });
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(VERT)
       .text('Interprétation des résultats biologiques', ML, doc.y + 2, { width: PAGE_W, align: 'center' });
    doc.y = doc.y + 10;
    doc.moveTo(ML, doc.y).lineTo(ML + PAGE_W, doc.y)
       .strokeColor(GRIS_CLAIR).lineWidth(0.8).stroke();
    doc.y = doc.y + 10;

    // ── Infos patient ──────────────────────────────────────────────────────
    const panels = parseJson(analyse.panels_demandes, []);
    const panelsLabels = panels.map(p => PANELS_META[p]?.label || p).join(', ') || '—';

    const sexeAnalyse = analyse.sexe_patient;
    const sexePatient = patient?.sexe === 'feminin' ? 'F' : patient?.sexe === 'masculin' ? 'M' : null;
    const sexeActif   = sexeAnalyse || sexePatient;
    const sexeLabel   = sexeActif === 'F' ? 'Féminin' : sexeActif === 'M' ? 'Masculin' : '—';
    const ageLabel    = analyse.age_patient ? `${analyse.age_patient} ans` : '—';

    const infoRows = [
      ['Patient',            patient ? `${patient.prenom} ${patient.nom}` : '—'],
      ['Date de naissance',  patient?.date_naissance ? fmtDate(patient.date_naissance) : '—'],
      ['Âge / Sexe',         `${ageLabel}  ·  ${sexeLabel}`],
      ['Dossier N°',         patient?.numero_dossier || '—'],
      ['Date du prélèvement', fmtDate(analyse.date_analyse)],
      ['Examens fournis',    panelsLabels],
    ];

    const yInfo = doc.y;
    const COL_L = 150;
    const COL_R = PAGE_W - COL_L;

    infoRows.forEach((row, i) => {
      const yRow = yInfo + i * 16;
      const fond = i % 2 === 0 ? FOND_GRIS : 'white';
      doc.rect(ML, yRow, PAGE_W, 16).fill(fond);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(VERT_FONCE)
         .text(row[0], ML + 6, yRow + 4, { width: COL_L - 8 });
      doc.fontSize(8).font('Helvetica').fillColor(NOIR)
         .text(row[1], ML + COL_L, yRow + 4, { width: COL_R - 4 });
    });
    doc.moveTo(ML + COL_L, yInfo).lineTo(ML + COL_L, yInfo + infoRows.length * 16)
       .strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();
    doc.rect(ML, yInfo, PAGE_W, infoRows.length * 16).strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();

    doc.y = yInfo + infoRows.length * 16 + 14;

    // ── Section 1 : Valeurs par panel ──────────────────────────────────────
    titreSection(doc, '1. RÉSULTATS DES ANALYSES — VALEURS MESURÉES');

    const valeurs = parseJson(analyse.valeurs_brutes, {});

    for (const panelId of panels) {
      const meta = PANELS_META[panelId];
      if (!meta) continue;

      const vPanel = valeurs[panelId] || {};
      const lignesPanel = Object.entries(meta.params)
        .filter(([cle]) => vPanel[cle] !== null && vPanel[cle] !== undefined && vPanel[cle] !== '')
        .map(([cle, param]) => ({ cle, param, val: vPanel[cle] }));

      if (!lignesPanel.length) continue;

      if (doc.y + 60 > CONTENT_BOT) {
        doc.addPage();
        dessinerHeader(doc);
        doc.y = CONTENT_TOP;
      }

      // En-tête du panel
      const yPanelH = doc.y;
      doc.rect(ML, yPanelH, PAGE_W, 16).fill(VERT_FONCE);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('white')
         .text(meta.label, ML + 6, yPanelH + 4, { width: PAGE_W - 12 });
      doc.y = yPanelH + 16;

      // Colonnes header
      const yColH = doc.y;
      doc.rect(ML, yColH, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#37474F');
      doc.text('Paramètre',  ML + 2,   yColH + 3, { width: 185 });
      doc.text('Résultat',   ML + 191, yColH + 3, { width: 90 });
      doc.text('Normes',     ML + 285, yColH + 3, { width: 120 });
      doc.text('Statut',     ML + 409, yColH + 3, { width: 84, align: 'center' });
      doc.y = yColH + 14;

      // Lignes
      lignesPanel.forEach((item, idx) => {
        if (doc.y + 16 > CONTENT_BOT) {
          doc.addPage();
          dessinerHeader(doc);
          doc.y = CONTENT_TOP;
          // Réafficher entête colonnes sur nouvelle page
          const yH = doc.y;
          doc.rect(ML, yH, PAGE_W, 14).fill('#CFD8DC');
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#37474F');
          doc.text('Paramètre',  ML + 2,   yH + 3, { width: 185 });
          doc.text('Résultat',   ML + 191, yH + 3, { width: 90 });
          doc.text('Normes',     ML + 285, yH + 3, { width: 120 });
          doc.text('Statut',     ML + 409, yH + 3, { width: 84, align: 'center' });
          doc.y = yH + 14;
        }

        const refStr = item.param.ref(sexeActif);
        const statut = calculerStatut(item.val, refStr);
        const fond = idx % 2 === 0 ? FOND_GRIS : null;

        const y = doc.y;
        ligneParametre(
          doc, y,
          [item.param.label, `${item.val} ${item.param.unite}`, `${refStr} ${item.param.unite}`, ''],
          fond,
          statut,
        );
        doc.y = y + 15;
      });

      doc.y = doc.y + 6;
    }

    // ── Sections 2-7 : Interprétation IA ──────────────────────────────────
    if (analyse.analyse_ia_texte) {
      if (doc.y + 40 > CONTENT_BOT) {
        doc.addPage();
        dessinerHeader(doc);
        doc.y = CONTENT_TOP;
      }

      const yTitre = doc.y + 6;
      doc.rect(ML, yTitre, PAGE_W, 18).fill(VERT_FONCE);
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('white')
         .text('INTERPRÉTATION MÉDICALE (générée par IA)', ML + 8, yTitre + 5, { width: PAGE_W - 16 });
      doc.y = yTitre + 24;

      rendreTexteIA(doc, analyse.analyse_ia_texte);

      // Coût IA
      if (analyse.cout_estime_usd) {
        doc.y = doc.y + 4;
        doc.fontSize(6.5).font('Helvetica').fillColor(GRIS_CLAIR.slice(0, 7))
           .text(
             `Analyse générée par ${analyse.analyse_ia_modele || 'IA'} — Coût estimé : $${parseFloat(analyse.cout_estime_usd).toFixed(4)}`,
             ML, doc.y, { width: PAGE_W, align: 'right' },
           );
      }
    } else {
      // Pas encore analysé par l'IA
      doc.y = doc.y + 10;
      const yNote = doc.y;
      doc.rect(ML, yNote, PAGE_W, 32).fill(FOND_GRIS);
      doc.fontSize(9).font('Helvetica').fillColor(GRIS)
         .text(
           "L'interprétation médicale n'a pas encore été générée. Utilisez le bouton « Analyser avec l'IA » dans le dossier patient.",
           ML + 10, yNote + 10, { width: PAGE_W - 20 },
         );
      doc.y = yNote + 38;
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    doc.flushPages();
    const range = doc.bufferedPageRange();
    const total = range.count;

    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      dessinerFooter(doc, i + 1, total);
    }

    doc.end();
  });

module.exports = { genererPdfAnalyse };
