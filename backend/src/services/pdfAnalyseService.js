'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ── Assets ────────────────────────────────────────────────────────────────────
const LOGO_PATH   = path.resolve(__dirname, '../assets/logo-mapa.jpg');
const FOOTER_PATH = path.resolve(__dirname, '../assets/footer-mapa.jpg');

// ── Dimensions A4 ─────────────────────────────────────────────────────────────
const PAGE_W      = 495;
const PAGE_H      = 842;
const ML          = 50;
const LOGO_H      = 60;                                // hauteur logo MAPA (carré 225×225)
const HEADER_H    = LOGO_H + 20;                       // logo + séparateur
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800);   // ≈ 99 (ratio 1800×360)
const MARGIN_TOP  = 16;
const CONTENT_TOP = MARGIN_TOP + HEADER_H + 10;
const FOOTER_Y    = PAGE_H - 20 - FOOTER_H;
const CONTENT_BOT = FOOTER_Y - 10;

// ── Palette ───────────────────────────────────────────────────────────────────
const BLEU_FONCE  = '#1565C0';
const VERT        = '#1B7F4F';
const VERT_FONCE  = '#0D5C38';
const ORANGE      = '#E65100';
const GRIS        = '#616161';
const GRIS_BORD   = '#BDBDBD';
const NOIR        = '#212121';
const FOND_ENTETE = '#CFD8DC';
const JAUNE_FOND  = '#FFFDE7';
const JAUNE_BORD  = '#F9A825';
const VERT_FOND   = '#E8F5E9';
const BLEU_FOND   = '#E3F2FD';

// ── Panels labels (pour en-tête patient) ──────────────────────────────────────
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

// ── Header / Footer ───────────────────────────────────────────────────────────
const dessinerHeader = (doc) => {
  const yTop = MARGIN_TOP + 4;
  // Logo MAPA (carré — affiché à gauche)
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, ML, yTop, { fit: [LOGO_H, LOGO_H] });
  }
  // Texte organisation à droite du logo
  const xTxt = ML + LOGO_H + 12;
  const wTxt = PAGE_W - LOGO_H - 12;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(BLEU_FONCE)
     .text('MAPA', xTxt, yTop + 8, { width: wTxt });
  doc.fontSize(8.5).font('Helvetica').fillColor(GRIS)
     .text('Maximizing American Potential in Africa', xTxt, yTop + 26, { width: wTxt });
  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(GRIS)
     .text('Rapport médical — Résultats d\'analyses biologiques', xTxt, yTop + 38, { width: wTxt });
  // Séparateur
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

// ── Tableau infos patient ─────────────────────────────────────────────────────
const CELL_H   = 18;
const CELL_PAD = 4;

const dessinerTableauPatient = (doc, rows) => {
  const COL_L = 150;
  const COL_R = PAGE_W - COL_L;
  const TOTAL_H = rows.length * CELL_H;

  doc.rect(ML, doc.y, PAGE_W, TOTAL_H).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

  rows.forEach((row, i) => {
    const y = doc.y + i * CELL_H;
    doc.rect(ML, y, COL_L, CELL_H).fill(FOND_ENTETE);
    doc.rect(ML, y, COL_L, CELL_H).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(VERT_FONCE)
       .text(row[0], ML + CELL_PAD, y + (CELL_H - 8) / 2, { width: COL_L - CELL_PAD * 2, lineBreak: false });
    doc.rect(ML + COL_L, y, COL_R, CELL_H).fill('white');
    doc.rect(ML + COL_L, y, COL_R, CELL_H).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(NOIR)
       .text(row[1] || '—', ML + COL_L + CELL_PAD, y + (CELL_H - 8.5) / 2, {
         width: COL_R - CELL_PAD * 2, lineBreak: false,
       });
  });

  doc.y = doc.y + TOTAL_H + 14;
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
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // tous les emojis SMP
    .replace(/[☀-➿]/g, '')           // symboles divers (⚠ ⚖ ✓ etc.)
    .replace(/[︀-️]/g, '')           // variation selectors
    .replace(/​/g, '')                    // zero-width space
    .replace(/ {2,}/g, ' ')
    .trim();
};

// ── Détection en-tête de section principale ───────────────────────────────────
const SECTION_KEYS = /^(analyse|anomalie|interpr[eé]t|synth[eè]s|explication|recommandation|pr[eé]caution)/i;
const estEnteteSection = (t) => {
  const m = t.match(/^\d+\.\s+(.+)$/);
  if (m) return SECTION_KEYS.test(m[1].trim());
  return /^pr[eé]caution\s+m[eé]dicale/i.test(t);
};

// ── Helpers tableau Markdown ──────────────────────────────────────────────────
const estLigneTableau = (t) => t.startsWith('|') && t.endsWith('|') && t.length > 2;
const estSeparateur   = (t) => /^\|[\s\-:|]+\|$/.test(t);

const parseCellules = (ligne) =>
  ligne.split('|').slice(1, -1).map(c => c.replace(/\*\*/g, '').trim());

const couleurStatut = (s) => {
  const u = s.toUpperCase();
  if (u.includes('NORMAL'))  return VERT_FONCE;
  if (u.includes('AUGMENT')) return '#B71C1C';
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

  const colW = nbCols === 4 ? [195, 90, 130, 80]
             : nbCols === 3 ? [200, 165, 130]
             : Array(nbCols).fill(Math.floor(PAGE_W / nbCols));
  colW[colW.length - 1] = PAGE_W - colW.slice(0, -1).reduce((a, b) => a + b, 0);

  const isStatutLast = /statut/i.test(headers[headers.length - 1] || '');
  const ROW_H = 18;
  const FS    = 7.5;

  const drawRow = (cells, y, isHeader, isEven) => {
    let x = ML;
    for (let ci = 0; ci < nbCols; ci++) {
      const w    = colW[ci];
      const cell = (cells[ci] || '').trim();
      const fond = isHeader ? FOND_ENTETE : (isEven ? BLEU_FOND : 'white');
      doc.rect(x, y, w, ROW_H).fill(fond);
      doc.rect(x, y, w, ROW_H).strokeColor(GRIS_BORD).lineWidth(0.3).stroke();
      const isStatut = !isHeader && isStatutLast && ci === nbCols - 1;
      const coul = isHeader ? VERT_FONCE : (isStatut ? couleurStatut(cell) : NOIR);
      const font = (isHeader || isStatut) ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(FS).font(font).fillColor(coul)
         .text(cell, x + 3, y + (ROW_H - FS) / 2, { width: w - 6, lineBreak: false });
      x += w;
    }
  };

  if (doc.y + ROW_H * 2 + 12 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  let y = doc.y + 4;
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
  doc.y = y + 8;
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
    if (texte[i] === '*' && texte[i + 1] === '*') { if (buf) segs.push({ t: buf, b: gras }); buf = ''; gras = !gras; i += 2; }
    else buf += texte[i++];
  }
  if (buf) segs.push({ t: buf, b: gras });
  const nv = segs.filter(s => s.t);
  nv.forEach((seg, idx) => {
    doc.fontSize(taille).font(seg.b ? policeGras : policeBase).fillColor(couleur);
    if (idx === 0) doc.text(seg.t, x, y, { width: largeur, continued: idx < nv.length - 1 });
    else doc.text(seg.t, { width: largeur, continued: idx < nv.length - 1 });
  });
};

// ── Dessin boîte "État général" (🟢/🟡/🔴) ───────────────────────────────────
const dessinerBoiteEtat = (doc, texte) => {
  const isPreocc = texte.includes('PREOCCUPANT') || texte.includes('CRITIQUE') || texte.includes('SERIEUX');
  const isSurv   = texte.includes('SURVEILLER') || texte.includes('ATTENTION') || texte.includes('MODERE');
  const fond     = isPreocc ? '#FFEBEE' : isSurv ? '#FFF3E0' : VERT_FOND;
  const bord     = isPreocc ? '#C62828' : isSurv ? ORANGE : VERT_FONCE;
  const coulTxt  = isPreocc ? '#C62828' : isSurv ? ORANGE : VERT_FONCE;
  const taille   = 9;

  if (doc.y + 36 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  const yB = doc.y + 4;
  const hauteur = 28;
  doc.rect(ML, yB, PAGE_W, hauteur).fill(fond);
  doc.rect(ML, yB, PAGE_W, hauteur).strokeColor(bord).lineWidth(0.8).stroke();
  doc.rect(ML, yB, 4, hauteur).fill(bord);
  doc.fontSize(taille).font('Helvetica-Bold').fillColor(coulTxt)
     .text(texte.replace(/\*\*/g, ''), ML + 10, yB + (hauteur - taille) / 2, {
       width: PAGE_W - 16, lineBreak: false,
     });
  doc.y = yB + hauteur + 6;
};

// ── Dessin boîte "Précaution médicale" ────────────────────────────────────────
const dessinerBoitePrecaution = (doc, lignes) => {
  if (!lignes.length) return;
  // Estimer la hauteur (~12px par ligne)
  const textesPropres = lignes.map(l => nettoyerPourPDF(l).replace(/\*\*/g, '')).filter(Boolean);
  let hauteurEst = 14 + textesPropres.length * 14 + 16;
  hauteurEst = Math.max(hauteurEst, 50);

  if (doc.y + hauteurEst + 16 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
  const yB = doc.y + 8;
  doc.rect(ML, yB, PAGE_W, hauteurEst).fill(JAUNE_FOND);
  doc.rect(ML, yB, PAGE_W, hauteurEst).strokeColor(JAUNE_BORD).lineWidth(0.8).stroke();
  doc.rect(ML, yB, 4, hauteurEst).fill(ORANGE);

  let y = yB + 8;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(ORANGE)
     .text('PRECAUTION MEDICALE', ML + 10, y, { width: PAGE_W - 20 });
  y += 14;

  for (const l of lignes) {
    const t = nettoyerPourPDF(l).replace(/\*\*/g, '').trim();
    if (!t) { y += 4; continue; }
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(GRIS)
       .text(t, ML + 10, y, { width: PAGE_W - 24 });
    y += 13;
  }
  doc.y = yB + hauteurEst + 10;
};

// ── Rendu principal du texte IA ───────────────────────────────────────────────
const rendreTexteIA = (doc, texte) => {
  if (!texte) return;

  // Séparer la section précaution du reste
  const allLignes = texte.split('\n');
  let idxPrec = -1;
  for (let i = 0; i < allLignes.length; i++) {
    const t = nettoyerPourPDF(allLignes[i].trim());
    if (/^pr[eé]caution\s+m[eé]dicale/i.test(t) || /^\d+\.\s*pr[eé]caution/i.test(t)) {
      idxPrec = i;
      break;
    }
  }
  const lignesPrincipales  = idxPrec >= 0 ? allLignes.slice(0, idxPrec) : allLignes;
  const lignesPrecaution   = idxPrec >= 0 ? allLignes.slice(idxPrec + 1) : [];

  // ── Rendu du contenu principal ─────────────────────────────────────────────
  let idx = 0;
  while (idx < lignesPrincipales.length) {
    if (doc.y > CONTENT_BOT - 20) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    const ligneRaw = lignesPrincipales[idx];
    const t = nettoyerPourPDF(ligneRaw.trim());

    if (!t || t === '---' || t === '--') { doc.y = Math.min(doc.y + 4, CONTENT_BOT); idx++; continue; }

    // Lignes de tableau Markdown — collecter d'un coup
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

    // En-tête de section principale (ex: "1. Analyse détaillée...")
    if (estEnteteSection(t)) {
      if (doc.y + 35 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const yH = doc.y + 10;
      doc.fontSize(13).font('Helvetica-Bold').fillColor(BLEU_FONCE)
         .text(t.replace(/\*\*/g, ''), ML, yH, { width: PAGE_W });
      const yLine = doc.y + 3;
      doc.moveTo(ML, yLine).lineTo(ML + PAGE_W, yLine).strokeColor(VERT).lineWidth(1).stroke();
      doc.y = yLine + 8;
      idx++; continue;
    }

    // Boîte "État général" (ligne contenant ÉTAT GÉNÉRAL ou similaire)
    if (/ETAT\s+GENERAL/i.test(t.replace(/É/g, 'E').replace(/è/g, 'e'))) {
      dessinerBoiteEtat(doc, t);
      idx++; continue;
    }

    // Sous-titre gras standalone **Texte**
    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      if (doc.y + 16 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      doc.fontSize(10).font('Helvetica-Bold').fillColor(VERT_FONCE)
         .text(t.slice(2, -2), ML, doc.y + 5, { width: PAGE_W });
      doc.y = doc.y + 2;
      idx++; continue;
    }

    // Point de liste
    const bM = t.match(/^[-]\s+(.*)/);
    if (bM) {
      if (doc.y + 14 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const yB = doc.y + 1;
      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text('•', ML + 4, yB, { width: 10 });
      rendreInline(doc, bM[1], ML + 16, yB, PAGE_W - 20, 9, NOIR);
      idx++; continue;
    }

    // Liste numérotée (ex: "1. Paludisme...")
    const nmM = t.match(/^(\d+)\.\s+(.*)/);
    if (nmM) {
      if (doc.y + 14 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      const yB = doc.y + 1;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(GRIS)
         .text(`${nmM[1]}.`, ML + 2, yB, { width: 14, align: 'right' });
      rendreInline(doc, nmM[2], ML + 18, yB, PAGE_W - 22, 9, NOIR);
      idx++; continue;
    }

    // Texte courant
    if (doc.y + 12 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    rendreInline(doc, t, ML, doc.y + 1, PAGE_W, 9, NOIR);
    idx++;
  }

  // ── Précaution médicale (section finale en boîte) ──────────────────────────
  if (lignesPrecaution.length) {
    if (doc.y + 20 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
    // Afficher l'en-tête de section
    doc.y = doc.y + 10;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(BLEU_FONCE)
       .text('Precaution medicale', ML, doc.y, { width: PAGE_W });
    const yLine = doc.y + 3;
    doc.moveTo(ML, yLine).lineTo(ML + PAGE_W, yLine).strokeColor(VERT).lineWidth(1).stroke();
    doc.y = yLine + 8;

    // Contenu dans une boîte
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
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    dessinerHeader(doc);
    doc.y = CONTENT_TOP;

    // ── Titre ──────────────────────────────────────────────────────────────
    doc.y = doc.y + 12;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(BLEU_FONCE)
       .text('ANALYSE MEDICALE COMPLETE', ML, doc.y, { width: PAGE_W, align: 'center' });
    doc.y = doc.y + 6;
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(VERT)
       .text('Interpretation des resultats biologiques', ML, doc.y, { width: PAGE_W, align: 'center' });
    doc.y = doc.y + 18;

    // ── Tableau infos patient ──────────────────────────────────────────────
    const panels  = parseJson(analyse.panels_demandes, []);
    const sexeA   = analyse.sexe_patient;
    const sexeP   = patient?.sexe === 'feminin' ? 'F' : patient?.sexe === 'masculin' ? 'M' : null;
    const sexe    = sexeA || sexeP;
    const sexeLbl = sexe === 'F' ? 'Feminin' : sexe === 'M' ? 'Masculin' : '—';
    const ageLbl  = analyse.age_patient ? `${analyse.age_patient} ans` : '—';
    const patLabel = sexe === 'F' ? 'Patiente' : sexe === 'M' ? 'Patient' : 'Patient(e)';
    const nomPatient = patient
      ? `${patient.prenom || ''} ${patient.nom || ''}`.trim()
      : '—';
    const panelsLbl = panels.map(p => PANELS_META[p]?.label || p).join(', ') || '—';

    dessinerTableauPatient(doc, [
      [patLabel,              nomPatient],
      ['Date des examens',    fmtDate(analyse.date_analyse)],
      ['Age / Sexe',          `${ageLbl}  -  ${sexeLbl}`],
      ['Examens',             panelsLbl],
    ]);

    // ── Contenu : texte IA uniquement ─────────────────────────────────────
    if (analyse.analyse_ia_texte) {
      rendreTexteIA(doc, analyse.analyse_ia_texte);
    } else {
      if (doc.y + 50 > CONTENT_BOT) { doc.addPage(); dessinerHeader(doc); doc.y = CONTENT_TOP; }
      doc.y = doc.y + 8;
      doc.rect(ML, doc.y, PAGE_W, 40).fill('#F5F5F5');
      doc.rect(ML, doc.y, PAGE_W, 40).strokeColor(GRIS_BORD).lineWidth(0.4).stroke();
      doc.fontSize(9).font('Helvetica').fillColor(GRIS)
         .text(
           "L'interpretation medicale n'a pas encore ete generee.\nUtilisez le bouton « Analyser avec l'IA » dans le dossier patient.",
           ML + 12, doc.y + 12, { width: PAGE_W - 24 },
         );
      doc.y = doc.y + 48;
    }

    // ── Pagination ──────────────────────────────────────────────────────────
    doc.flushPages();
    const total = doc.bufferedPageRange().count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      dessinerFooter(doc, i + 1, total);
    }
    doc.end();
  });

module.exports = { genererPdfAnalyse };
