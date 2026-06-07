'use strict';

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

const ASSETS   = path.resolve(__dirname, '../assets');
const LOGO_MAPA = path.join(ASSETS, 'logo-mapa.jpg');
const FOOTER    = path.join(ASSETS, 'footer-mapa.jpg');

const A4_H     = 842;
const ML       = 50;          // marge gauche/droite
const CW       = 495;         // largeur contenu (595 - 2×50)
const FOOTER_H = 99;
const FOOTER_Y = A4_H - ML - FOOTER_H;

const BLEU       = '#1A237E';
const ROUGE      = '#B71C1C';
const BLEU_CLAIR = '#E8EAF6';
const GRIS       = '#424242';
const GRIS_BORD  = '#BDBDBD';
const NOIR       = '#212121';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};
// Formatage avec espace ASCII simple (évite U+202F que Helvetica PDFKit ne connaît pas)
const fmtM = (n) => {
  const s = Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return s + ' FCFA';
};
const dots = (n) => '.'.repeat(n);

// ── Colonnes tableau ─────────────────────────────────────────────────────────
// Somme exacte : 165 + 33 + 100 + 197 = 495
const COL_NOM   = { x: ML,           w: 165 };  // 50  → 215
const COL_QTE   = { x: ML + 165,     w: 33  };  // 215 → 248
const COL_PU    = { x: ML + 198,     w: 100 };  // 248 → 348
const COL_TOT   = { x: ML + 298,     w: 197 };  // 348 → 545

// ── Helpers texte tableau (appels séparés, jamais chaînés) ────────────────────
const tNom = (doc, txt, y, bold) => {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(NOIR);
  doc.text(txt || '—', COL_NOM.x + 4, y, { width: COL_NOM.w - 8, lineBreak: false });
};
const tQte = (doc, txt, y) => {
  doc.font('Helvetica').fontSize(8.5).fillColor(NOIR);
  doc.text(String(txt || 0), COL_QTE.x, y, { width: COL_QTE.w, align: 'center', lineBreak: false });
};
const tPu = (doc, txt, y) => {
  doc.font('Helvetica').fontSize(8.5).fillColor(NOIR);
  // Zone : COL_PU.x → COL_PU.x + COL_PU.w - 4 (4px de marge droite)
  doc.text(txt, COL_PU.x, y, { width: COL_PU.w - 4, align: 'right', lineBreak: false });
};
const tTot = (doc, txt, y, bold, color) => {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(color || NOIR);
  // Zone : COL_TOT.x → COL_TOT.x + COL_TOT.w - 10 (10px de marge droite = bien à l'intérieur)
  doc.text(txt, COL_TOT.x, y, { width: COL_TOT.w - 10, align: 'right', lineBreak: false });
};

const genererPdfBonCommande = (bc, infosCabinet) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];
    const dateDoc = bc.date_commande || new Date().toISOString().split('T')[0];

    // ── Filigrane logo ────────────────────────────────────────────────────────
    if (fs.existsSync(LOGO_MAPA)) {
      doc.save();
      doc.opacity(0.07);
      const sz = 280;
      doc.image(LOGO_MAPA, ML + (CW - sz) / 2, 210, { width: sz });
      doc.restore();
    }

    let y = ML - 10;

    // ── "Abidjan, le [date]" ─────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').fillColor(NOIR);
    doc.text(`Abidjan, le ${fmtDate(dateDoc)}`, ML, y, { width: CW, align: 'right' });
    y += 20;

    // ── Logo (gauche) + Titre (droite) ────────────────────────────────────────
    const LOGO_H  = 65;
    const TX = ML + 85;
    const TW = CW - 85;

    if (fs.existsSync(LOGO_MAPA)) {
      doc.image(LOGO_MAPA, ML, y, { height: LOGO_H });
    }
    doc.fontSize(22).font('Helvetica-Bold').fillColor(BLEU);
    doc.text('BON DE COMMANDE', TX, y + 2, { width: TW, align: 'right' });
    doc.fontSize(8.5).font('Helvetica').fillColor(ROUGE);
    doc.text('MAXIMIZING AMERICAN POTENTIAL IN AFRICA', TX, y + 30, { width: TW, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GRIS);
    doc.text(`N° ${bc.numero}`, TX, y + 44, { width: TW, align: 'right' });
    y += LOGO_H + 10;

    // ── Séparatrice rouge ─────────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(ROUGE).lineWidth(2).stroke();
    y += 12;

    // ── Champs informations ──────────────────────────────────────────────────
    const nomPrenom = [bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' ');

    const champInfo = (label, valeur) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR);
      doc.text(label, ML, y, { continued: true });
      doc.font('Helvetica').fillColor(GRIS);
      doc.text(valeur || dots(45));
      y += 16;
    };

    champInfo('NOM ET PRENOM :  ', nomPrenom);
    champInfo('CONTACT :  ', bc.telephone_commandeur);
    champInfo('LIEU DE LIVRAISON :  ', bc.lieu_livraison);
    const valeurLivraison = bc.mention_livraison || (bc.date_livraison_prevue ? fmtDate(bc.date_livraison_prevue) : null);
    if (valeurLivraison) {
      champInfo('DATE DE LIVRAISON SOUHAITÉE :  ', valeurLivraison);
    }
    y += 6;

    // ── Séparatrice bleue ─────────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BLEU).lineWidth(1).stroke();
    y += 8;

    // ── En-tête tableau ───────────────────────────────────────────────────────
    const RH = 20;  // hauteur d'une ligne

    doc.rect(ML, y, CW, RH).fill(BLEU);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8.5);
    doc.text('DÉSIGNATION', COL_NOM.x + 4, y + 5, { width: COL_NOM.w - 8,  lineBreak: false });
    doc.text('QTÉ',         COL_QTE.x,     y + 5, { width: COL_QTE.w,      align: 'center', lineBreak: false });
    doc.text('PRIX UNIT.',  COL_PU.x,      y + 5, { width: COL_PU.w - 4,   align: 'right',  lineBreak: false });
    doc.text('MONTANT',     COL_TOT.x,     y + 5, { width: COL_TOT.w - 10, align: 'right',  lineBreak: false });
    y += RH;

    // ── Séparateurs verticaux (trait BLEU entre colonnes) ────────────────────
    const drawColBorders = (y0, h) => {
      [COL_QTE.x, COL_PU.x, COL_TOT.x].forEach((cx) => {
        doc.moveTo(cx, y0).lineTo(cx, y0 + h).strokeColor(GRIS_BORD).lineWidth(0.3).stroke();
      });
    };

    // ── Lignes produits ───────────────────────────────────────────────────────
    if (lignes.length === 0) {
      doc.rect(ML, y, CW, RH).fill(BLEU_CLAIR);
      doc.font('Helvetica').fontSize(9).fillColor(GRIS);
      doc.text('Aucune ligne de commande', ML, y + 5, { width: CW, align: 'center', lineBreak: false });
      drawColBorders(y, RH);
      y += RH;
    } else {
      lignes.forEach((l, idx) => {
        const fond = idx % 2 === 0 ? BLEU_CLAIR : 'white';
        doc.rect(ML, y, CW, RH).fill(fond);
        doc.rect(ML, y, CW, RH).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

        const pu      = l.prix_unitaire || 0;
        const qte     = l.quantite || 0;
        const montant = pu * qte;

        tNom(doc, l.nom_produit, y + 5, true);
        tQte(doc, qte,           y + 5);
        tPu (doc, fmtM(pu),      y + 5);
        tTot(doc, fmtM(montant), y + 5);

        drawColBorders(y, RH);
        y += RH;
      });
    }

    // ── Séparatrice rouge sous tableau ────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(ROUGE).lineWidth(1.5).stroke();
    y += 10;

    // ── Total ─────────────────────────────────────────────────────────────────
    const totalVal = lignes.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0);
    const TX2 = ML + CW / 2;
    const TW2 = CW / 2;

    doc.rect(TX2, y, TW2, 24).fill(BLEU);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('white');
    doc.text('TOTAL GÉNÉRAL', TX2 + 6, y + 6, { width: TW2 / 2 - 6, lineBreak: false });
    doc.text(fmtM(totalVal), TX2 + TW2 / 2, y + 6, { width: TW2 / 2 - 8, align: 'right', lineBreak: false });
    y += 32;

    // ── Remarques ─────────────────────────────────────────────────────────────
    if (bc.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU);
      doc.text('REMARQUES :', ML, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor(NOIR);
      doc.text(bc.notes, ML, y, { width: CW });
      y += 20;
    }

    // ── Signatures ────────────────────────────────────────────────────────────
    const ySign = Math.max(y + 24, FOOTER_Y - 72);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU);
    doc.text('Signature Commandeur',   ML,              ySign, { width: 200, align: 'center' });
    doc.text('Signature MAPA',         ML + CW - 200,   ySign, { width: 200, align: 'center' });
    doc.moveTo(ML,            ySign + 38).lineTo(ML + 200,    ySign + 38).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
    doc.moveTo(ML + CW - 200, ySign + 38).lineTo(ML + CW,     ySign + 38).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

    // ── Footer ────────────────────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, ML, FOOTER_Y, { width: CW });
    }

    doc.end();
  });

module.exports = { genererPdfBonCommande };
