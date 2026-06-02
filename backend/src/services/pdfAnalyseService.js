'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ── Assets ────────────────────────────────────────────────────────────────────
const LOGO_PATH   = path.resolve(__dirname, '../assets/logo-mapa.jpg');
const FOOTER_PATH = path.resolve(__dirname, '../assets/footer-racines.jpg');

// ── Dimensions A4 ─────────────────────────────────────────────────────────────
const PAGE_W      = 495;
const PAGE_H      = 842;
const ML          = 50;
const LOGO_H      = 55;
const HEADER_H    = LOGO_H + 24;
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800);   // ≈ 99
const MARGIN_TOP  = 14;
const CONTENT_TOP = MARGIN_TOP + HEADER_H + 10;
const FOOTER_Y    = PAGE_H - 20 - FOOTER_H;
const CONTENT_BOT = FOOTER_Y - 10;

// ── Palette ───────────────────────────────────────────────────────────────────
const BLEU_FONCE  = '#1565C0';
const VERT        = '#1B7F4F';
const VERT_FONCE  = '#0D5C38';
const VERT_MED    = '#2E7D32';
const ORANGE      = '#E65100';
const GRIS        = '#616161';
const GRIS_CLAIR  = '#9E9E9E';
const GRIS_BORD   = '#BDBDBD';
const NOIR        = '#212121';
const BLANC       = '#FFFFFF';
const FOND_TITRE  = '#1B5E20';      // vert très foncé pour le bandeau titre
const FOND_PATIENT= '#F1F8E9';      // vert très clair pour la fiche patient
const FOND_ENTETE = '#C8E6C9';      // vert clair pour en-têtes colonnes tableau
const JAUNE_FOND  = '#FFFDE7';
const JAUNE_BORD  = '#F9A825';
const VERT_FOND   = '#E8F5E9';
const BLEU_FOND   = '#F3F8FF';
const ROUGE_FOND  = '#FFEBEE';
const ROUGE_BORD  = '#C62828';

// ── Panels labels ─────────────────────────────────────────────────────────────
const PANELS_META = {
  nfs:        { label: 'NFS — Numération Formule Sanguine' },
  renal:      { label: 'Bilan rénal' },
  glycemie:   { label: 'Bilan glycémique' },
  lipidique:  { label: 'Bilan lipidique' },
  ionogramme: { label: 'Ionogramme' },
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

// ── Nettoyage pour Helvetica (Latin-1 uniquement) ─────────────────────────────
const nettoyerPourPDF = (str) => {
  if (!str) return '';
  return str
    .replace(/↑/g, '^ ').replace(/↓/g, 'v ')
    .replace(/✓/g, 'OK').replace(/✗/g, 'X').replace(/✅/g, 'OK').replace(/❌/g, 'Non')
    .replace(/•/g, '-')
    .replace(/→/g, '->').replace(/←/g, '<-').replace(/–/g, '-').replace(/—/g, '--')
    .replace(/🟢/g, '[Normal]').replace(/🟡/g, '[A surveiller]').replace(/🔴/g, '[Critique]')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[☀-➿]/g, '')
    .replace(/[︀-️]/g, '')
    .replace(/​/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
};

// ── Header ────────────────────────────────────────────────────────────────────
const dessinerHeader = (doc) => {
  const yTop = MARGIN_TOP + 4;

  // Fond subtil derrière le header
  doc.rect(ML, yTop - 2, PAGE_W, HEADER_H - 6).fill('#FAFFFE');

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, ML, yTop, { fit: [LOGO_H, LOGO_H] });
  }

  const xTxt = ML + LOGO_H + 14;
  const wTxt = PAGE_W - LOGO_H - 14;

  doc.fontSize(15).font('Helvetica-Bold').fillColor(VERT_FONCE)
     .text('MAPA', xTxt, yTop + 6, { width: wTxt });
  doc.fontSize(8.5).font('Helvetica').fillColor(GRIS)
     .text('Maximizing American Potential in Africa', xTxt, yTop + 24, { width: wTxt });
  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(GRIS_CLAIR)
     .text('Rapport médical — Résultats d\'analyses biologiques', xTxt, yTop + 36, { width: wTxt });

  // Séparateur double trait
  const ySep = CONTENT_TOP - 8;
  doc.moveTo(ML, ySep).lineTo(ML + PAGE_W, ySep).strokeColor(VERT_FONCE).lineWidth(2).stroke();
  doc.moveTo(ML, ySep + 3).lineTo(ML + PAGE_W, ySep + 3).strokeColor(VERT).lineWidth(0.5).stroke();
};

// ── Footer ────────────────────────────────────────────────────────────────────
const dessinerFooter = (doc, pageNum, total) => {
  if (fs.existsSync(FOOTER_PATH)) {
    doc.image(FOOTER_PATH, ML, FOOTER_Y, { width: PAGE_W });
  } else {
    doc.moveTo(ML, FOOTER_Y).lineTo(ML + PAGE_W, FOOTER_Y)
       .strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
  }
  doc.fontSize(7.5).font('Helvetica').fillColor(GRIS)
     .text(`Page ${pageNum} sur ${total}`, ML, FOOTER_Y + 4, { width: PAGE_W, align: 'right' });
};

// ── Bandeau titre document ────────────────────────────────────────────────────
const dessinerBandeauTitre = (doc, panels, dateAnalyse) => {
  const BAND_H = 46;
  const yB = doc.y + 8;

  // Fond vert foncé
  doc.rect(ML, yB, PAGE_W, BAND_H).fill(FOND_TITRE);
  // Accent gauche
  doc.rect(ML, yB, 5, BAND_H).fill('#A5D6A7');

  doc.fontSize(14).font('Helvetica-Bold').fillColor(BLANC)
     .text('ANALYSE MEDICALE COMPLETE', ML + 14, yB + 8, { width: PAGE_W - 20, align: 'left' });

  const panelsStr = panels.map(p => PANELS_META[p]?.label || p).join(' — ') || '—';
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#A5D6A7')
     .text(panelsStr, ML + 14, yB + 27, { width: PAGE_W - 100, lineBreak: false });

  if (dateAnalyse) {
    doc.fontSize(8).font('Helvetica').fillColor('#C8E6C9')
       .text(`Examens du ${fmtDate(dateAnalyse)}`, ML + 14, yB + 27, { width: PAGE_W - 20, align: 'right' });
  }

  doc.y = yB + BAND_H + 14;
};

// ── Fiche patient ─────────────────────────────────────────────────────────────
const dessinerFichePatient = (doc, champs, valide, dateValidation) => {
  const CELL_H    = 22;
  const COL_L     = 145;
  const COL_R     = PAGE_W - COL_L;
  const NB_ROWS   = champs.length;
  const TOTAL_H   = NB_ROWS * CELL_H;
  const CORNER    = 3;

  const yStart = doc.y;

  // Fond général de la fiche
  doc.roundedRect(ML, yStart, PAGE_W, TOTAL_H, CORNER).fill(FOND_PATIENT);
  doc.roundedRect(ML, yStart, PAGE_W, TOTAL_H, CORNER)
     .strokeColor(VERT).lineWidth(0.8).stroke();

  champs.forEach((row, i) => {
    const y = yStart + i * CELL_H;

    // Séparateur horizontal (sauf première ligne)
    if (i > 0) {
      doc.moveTo(ML + 1, y).lineTo(ML + PAGE_W - 1, y)
         .strokeColor('#B2DFDB').lineWidth(0.4).stroke();
    }

    // Colonne label (fond vert + texte)
    doc.rect(ML, y, COL_L, CELL_H).fill(FOND_ENTETE);
    if (i > 0) {
      doc.moveTo(ML + 1, y).lineTo(ML + COL_L, y)
         .strokeColor('#81C784').lineWidth(0.4).stroke();
    }
    doc.fontSize(8).font('Helvetica-Bold').fillColor(VERT_FONCE)
       .text(row[0], ML + 8, y + (CELL_H - 8) / 2, { width: COL_L - 12, lineBreak: false });

    // Séparateur vertical
    doc.moveTo(ML + COL_L, y).lineTo(ML + COL_L, y + CELL_H)
       .strokeColor(VERT).lineWidth(0.5).stroke();

    // Colonne valeur
    doc.fontSize(9).font('Helvetica').fillColor(NOIR)
       .text(row[1] || '—', ML + COL_L + 10, y + (CELL_H - 9) / 2, {
         width: COL_R - 14, lineBreak: false,
       });
  });

  doc.y = yStart + TOTAL_H + 6;

  // Badge validation médecin
  if (valide) {
    const badgeW = 220;
    const badgeH = 18;
    const xB = ML + PAGE_W - badgeW;
    const yBadge = doc.y + 2;
    doc.roundedRect(xB, yBadge, badgeW, badgeH, 3).fill(VERT_FOND);
    doc.roundedRect(xB, yBadge, badgeW, badgeH, 3)
       .strokeColor(VERT_MED).lineWidth(0.6).stroke();
    const label = dateValidation
      ? `Valide par le medecin le ${fmtDate(dateValidation)}`
      : 'Valide par le medecin';
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(VERT_MED)
       .text(label, xB + 6, yBadge + (badgeH - 7.5) / 2, { width: badgeW - 10, lineBreak: false });
    doc.y = yBadge + badgeH + 6;
  } else {
    doc.y += 4;
  }

  doc.y += 10;
};

// ── En-tête de section principale ─────────────────────────────────────────────
const SECTION_KEYS = /^(analyse|anomalie|interpr[eé]t|synth[eè]s|explication|recommandation|pr[eé]caution)/i;
const estEnteteSection = (t) => {
  const m = t.match(/^\d+\.\s+(.+)$/);
  if (m) return SECTION_KEYS.test(m[1].trim());
  return /^pr[eé]caution\s+m[eé]dicale/i.test(t);
};

const dessinerEnteteSection = (doc, texte) => {
  if (doc.y + 36 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  const yH = doc.y + 12;
  const BAR_W = 4;

  // Accent coloré gauche
  doc.rect(ML, yH - 1, BAR_W, 18).fill(VERT_MED);

  doc.fontSize(11.5).font('Helvetica-Bold').fillColor(BLEU_FONCE)
     .text(texte.replace(/\*\*/g, ''), ML + BAR_W + 7, yH, { width: PAGE_W - BAR_W - 7 });

  const yLine = doc.y + 2;
  doc.moveTo(ML, yLine).lineTo(ML + PAGE_W, yLine).strokeColor(VERT).lineWidth(0.8).stroke();
  doc.y = yLine + 9;
};

// ── Boîte "État général" ──────────────────────────────────────────────────────
const dessinerBoiteEtat = (doc, texte) => {
  const isPreocc = texte.includes('PREOCCUPANT') || texte.includes('CRITIQUE') || texte.includes('SERIEUX');
  const isSurv   = texte.includes('SURVEILLER') || texte.includes('ATTENTION') || texte.includes('MODERE');
  const fond     = isPreocc ? ROUGE_FOND : isSurv ? '#FFF3E0' : VERT_FOND;
  const bord     = isPreocc ? ROUGE_BORD : isSurv ? ORANGE : VERT_FONCE;
  const coulTxt  = isPreocc ? ROUGE_BORD : isSurv ? ORANGE : VERT_FONCE;

  if (doc.y + 40 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  const yB = doc.y + 6;
  const BAND_H = 30;

  doc.roundedRect(ML, yB, PAGE_W, BAND_H, 3).fill(fond);
  doc.roundedRect(ML, yB, PAGE_W, BAND_H, 3).strokeColor(bord).lineWidth(0.8).stroke();
  doc.rect(ML, yB, 5, BAND_H).fill(bord);

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(coulTxt)
     .text(texte.replace(/\*\*/g, ''), ML + 12, yB + (BAND_H - 9.5) / 2, {
       width: PAGE_W - 18, lineBreak: false,
     });
  doc.y = yB + BAND_H + 8;
};

// ── Boîte "Précaution médicale" ───────────────────────────────────────────────
const dessinerBoitePrecaution = (doc, lignes) => {
  if (!lignes.length) return;
  const textesPropres = lignes.map(l => nettoyerPourPDF(l).replace(/\*\*/g, '')).filter(Boolean);
  const hauteurEst = Math.max(14 + textesPropres.length * 15 + 18, 52);

  if (doc.y + hauteurEst + 16 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  const yB = doc.y + 8;

  doc.roundedRect(ML, yB, PAGE_W, hauteurEst, 4).fill(JAUNE_FOND);
  doc.roundedRect(ML, yB, PAGE_W, hauteurEst, 4).strokeColor(JAUNE_BORD).lineWidth(0.8).stroke();
  doc.rect(ML, yB, 5, hauteurEst).fill(ORANGE);

  let y = yB + 9;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(ORANGE)
     .text('PRECAUTION MEDICALE', ML + 12, y, { width: PAGE_W - 24 });
  y += 15;

  for (const l of lignes) {
    const t = nettoyerPourPDF(l).replace(/\*\*/g, '').trim();
    if (!t) { y += 4; continue; }
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(GRIS)
       .text(t, ML + 12, y, { width: PAGE_W - 26 });
    y += 14;
  }
  doc.y = yB + hauteurEst + 10;
};

// ── Helpers tableau Markdown ──────────────────────────────────────────────────
const estLigneTableau = (t) => t.startsWith('|') && t.endsWith('|') && t.length > 2;
const estSeparateur   = (t) => /^\|[\s\-:|]+\|$/.test(t);

const parseCellules = (ligne) =>
  ligne.split('|').slice(1, -1).map(c => c.replace(/\*\*/g, '').trim());

const couleurStatut = (s) => {
  const u = s.toUpperCase();
  if (u.includes('NORMAL'))  return VERT_FONCE;
  if (u.includes('AUGMENT')) return ROUGE_BORD;
  if (u.includes('DIMINU'))  return BLEU_FONCE;
  if (u.includes('LIMITE'))  return ORANGE;
  return NOIR;
};

const dessinerTableauMarkdown = (doc, lignes) => {
  const rows = lignes
    .map(l => nettoyerPourPDF(l.trim()))
    .filter(t => estLigneTableau(t) && !estSeparateur(t))
    .map(parseCellules)
    .filter(r => r.length > 0);

  if (rows.length < 2) return;
  const headers  = rows[0];
  const dataRows = rows.slice(1);
  const nbCols   = headers.length;
  if (!nbCols) return;

  const colW = nbCols === 4 ? [190, 90, 135, 80]
             : nbCols === 3 ? [200, 165, 130]
             : Array(nbCols).fill(Math.floor(PAGE_W / nbCols));
  colW[colW.length - 1] = PAGE_W - colW.slice(0, -1).reduce((a, b) => a + b, 0);

  const isStatutLast = /statut/i.test(headers[headers.length - 1] || '');
  const ROW_H = 19;
  const FS    = 8;

  const drawRow = (cells, y, isHeader, isEven) => {
    let x = ML;
    for (let ci = 0; ci < nbCols; ci++) {
      const w    = colW[ci];
      const cell = (cells[ci] || '').trim();
      const fond = isHeader ? FOND_ENTETE : (isEven ? BLEU_FOND : BLANC);
      doc.rect(x, y, w, ROW_H).fill(fond);
      doc.rect(x, y, w, ROW_H).strokeColor(GRIS_BORD).lineWidth(0.3).stroke();
      const isStatut = !isHeader && isStatutLast && ci === nbCols - 1;
      const coul = isHeader ? VERT_FONCE : (isStatut ? couleurStatut(cell) : NOIR);
      const font = (isHeader || isStatut) ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(FS).font(font).fillColor(coul)
         .text(cell, x + 4, y + (ROW_H - FS) / 2, { width: w - 8, lineBreak: false });
      x += w;
    }
  };

  if (doc.y + ROW_H * 2 + 12 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  let y = doc.y + 6;
  // Ombre légère sur l'en-tête tableau
  doc.rect(ML, y, PAGE_W, ROW_H).fill(FOND_ENTETE);
  drawRow(headers, y, true, false);
  y += ROW_H;

  let isEven = false;
  for (const row of dataRows) {
    if (y + ROW_H > CONTENT_BOT - 10) {
      doc.addPage(); dessinerHeader(doc); y = CONTENT_TOP;
      drawRow(headers, y, true, false);
      y += ROW_H;
    }
    drawRow(row, y, false, isEven);
    y += ROW_H;
    isEven = !isEven;
  }
  // Trait de fermeture du tableau
  doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
  doc.y = y + 10;
};

// ── Rendu inline avec gras (**texte**) ────────────────────────────────────────
const rendreInline = (doc, texte, x, y, largeur, taille, couleur = NOIR, italique = false) => {
  const policeBase = italique ? 'Helvetica-Oblique' : 'Helvetica';
  const policeGras = italique ? 'Helvetica-BoldOblique' : 'Helvetica-Bold';
  if (!texte.includes('**')) {
    doc.fontSize(taille).font(policeBase).fillColor(couleur).text(texte, x, y, { width: largeur });
    return;
  }
  const segs = [];
  let gras = false, buf = '', i = 0;
  while (i < texte.length) {
    if (texte[i] === '*' && texte[i + 1] === '*') {
      if (buf) segs.push({ t: buf, b: gras });
      buf = ''; gras = !gras; i += 2;
    } else buf += texte[i++];
  }
  if (buf) segs.push({ t: buf, b: gras });
  const nv = segs.filter(s => s.t);
  nv.forEach((seg, idx) => {
    doc.fontSize(taille).font(seg.b ? policeGras : policeBase).fillColor(couleur);
    if (idx === 0) doc.text(seg.t, x, y, { width: largeur, continued: idx < nv.length - 1 });
    else           doc.text(seg.t, { width: largeur, continued: idx < nv.length - 1 });
  });
};

// ── Rendu principal du texte IA ───────────────────────────────────────────────
const rendreTexteIA = (doc, texte) => {
  if (!texte) return;

  const allLignes = texte.split('\n');
  let idxPrec = -1;
  for (let i = 0; i < allLignes.length; i++) {
    const t = nettoyerPourPDF(allLignes[i].trim());
    if (/^pr[eé]caution\s+m[eé]dicale/i.test(t) || /^\d+\.\s*pr[eé]caution/i.test(t)) {
      idxPrec = i; break;
    }
  }
  const lignesPrincipales = idxPrec >= 0 ? allLignes.slice(0, idxPrec) : allLignes;
  const lignesPrecaution  = idxPrec >= 0 ? allLignes.slice(idxPrec + 1) : [];

  const BODY_FS = 9.5;   // taille de base du corps de texte

  let idx = 0;
  while (idx < lignesPrincipales.length) {
    if (doc.y > CONTENT_BOT - 20) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    const ligneRaw = lignesPrincipales[idx];
    const t = nettoyerPourPDF(ligneRaw.trim());

    if (!t || t === '---' || t === '--') { doc.y = Math.min(doc.y + 4, CONTENT_BOT); idx++; continue; }

    // Tableau Markdown
    if (estLigneTableau(t)) {
      const tableLines = [];
      while (idx < lignesPrincipales.length) {
        const tl = nettoyerPourPDF(lignesPrincipales[idx].trim());
        if (estLigneTableau(tl) || estSeparateur(tl)) { tableLines.push(lignesPrincipales[idx]); idx++; }
        else break;
      }
      dessinerTableauMarkdown(doc, tableLines);
      continue;
    }

    // En-tête de section
    if (estEnteteSection(t)) {
      dessinerEnteteSection(doc, t);
      idx++; continue;
    }

    // Boîte "État général"
    if (/ETAT\s+GENERAL/i.test(t.replace(/É/g, 'E').replace(/è/g, 'e'))) {
      dessinerBoiteEtat(doc, t);
      idx++; continue;
    }

    // Sous-titre gras **Texte**
    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      if (doc.y + 18 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      doc.fontSize(10).font('Helvetica-Bold').fillColor(VERT_MED)
         .text(t.slice(2, -2), ML, doc.y + 6, { width: PAGE_W });
      doc.y += 2;
      idx++; continue;
    }

    // Point de liste (tiret)
    const bM = t.match(/^[-]\s+(.*)/);
    if (bM) {
      if (doc.y + 14 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const yB = doc.y + 2;
      // Bullet vert
      doc.fontSize(11).font('Helvetica-Bold').fillColor(VERT_MED).text('-', ML + 4, yB - 1, { width: 10 });
      rendreInline(doc, bM[1], ML + 16, yB, PAGE_W - 20, BODY_FS, NOIR);
      idx++; continue;
    }

    // Liste numérotée
    const nmM = t.match(/^(\d+)\.\s+(.*)/);
    if (nmM && !estEnteteSection(t)) {
      if (doc.y + 14 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const yB = doc.y + 2;
      doc.fontSize(BODY_FS).font('Helvetica-Bold').fillColor(VERT_MED)
         .text(`${nmM[1]}.`, ML + 2, yB, { width: 16, align: 'right' });
      rendreInline(doc, nmM[2], ML + 20, yB, PAGE_W - 24, BODY_FS, NOIR);
      idx++; continue;
    }

    // Texte courant
    if (doc.y + 14 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    rendreInline(doc, t, ML, doc.y + 2, PAGE_W, BODY_FS, NOIR);
    idx++;
  }

  // Section Précaution médicale
  if (lignesPrecaution.length) {
    if (doc.y + 20 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    dessinerEnteteSection(doc, 'Precaution medicale');
    const contenu = lignesPrecaution.filter(l => nettoyerPourPDF(l.trim()));
    dessinerBoitePrecaution(doc, contenu);
  }
};

// ── Génération principale ─────────────────────────────────────────────────────
const genererPdfAnalyse = (analyse, patient) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ bufferPages: true, margin: 0, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    dessinerHeader(doc);
    doc.y = CONTENT_TOP;

    // ── Bandeau titre ──────────────────────────────────────────────────────────
    const panels = parseJson(analyse.panels_demandes, []);
    dessinerBandeauTitre(doc, panels, analyse.date_analyse);

    // ── Fiche patient ──────────────────────────────────────────────────────────
    const sexeA   = analyse.sexe_patient;
    const sexeP   = patient?.sexe === 'feminin' ? 'F' : patient?.sexe === 'masculin' ? 'M' : null;
    const sexe    = sexeA || sexeP;
    const sexeLbl = sexe === 'F' ? 'Feminin' : sexe === 'M' ? 'Masculin' : '—';
    const ageLbl  = analyse.age_patient ? `${analyse.age_patient} ans` : '—';
    const patLabel = sexe === 'F' ? 'Patiente' : sexe === 'M' ? 'Patient' : 'Patient(e)';
    const nomPatient = patient ? `${patient.prenom || ''} ${patient.nom || ''}`.trim() : '—';
    const panelsLbl  = panels.map(p => PANELS_META[p]?.label || p).join(', ') || '—';

    dessinerFichePatient(doc, [
      [patLabel,           nomPatient],
      ['Date des examens', fmtDate(analyse.date_analyse)],
      ['Age / Sexe',       `${ageLbl}  |  ${sexeLbl}`],
      ['Panels analyses',  panelsLbl],
    ], analyse.valide_par_medecin, analyse.date_validation);

    // ── Contenu texte IA ───────────────────────────────────────────────────────
    if (analyse.analyse_ia_texte) {
      rendreTexteIA(doc, analyse.analyse_ia_texte);
    } else {
      if (doc.y + 50 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      doc.y += 8;
      doc.roundedRect(ML, doc.y, PAGE_W, 44, 4).fill('#F5F5F5');
      doc.roundedRect(ML, doc.y, PAGE_W, 44, 4).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
      doc.fontSize(9.5).font('Helvetica').fillColor(GRIS)
         .text(
           "L'interpretation medicale n'a pas encore ete generee.\nUtilisez le bouton « Analyser avec l'IA » dans le dossier patient.",
           ML + 14, doc.y + 12, { width: PAGE_W - 28 },
         );
      doc.y += 52;
    }

    // ── Pagination ─────────────────────────────────────────────────────────────
    doc.flushPages();
    const total = doc.bufferedPageRange().count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      dessinerFooter(doc, i + 1, total);
    }
    doc.end();
  });

module.exports = { genererPdfAnalyse };
