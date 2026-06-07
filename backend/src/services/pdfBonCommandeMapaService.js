'use strict';

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

const ASSETS    = path.resolve(__dirname, '../assets');
const LOGO_MAPA = path.join(ASSETS, 'logo-mapa.jpg');
const FOOTER    = path.join(ASSETS, 'footer-mapa.jpg');

const A4_W        = 595;
const A4_H        = 842;
const MARGIN      = 50;
const CONTENT_W   = A4_W - 2 * MARGIN;   // 495
const FOOTER_H    = 99;
const FOOTER_Y    = A4_H - MARGIN - FOOTER_H;

// Couleurs MAPA
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

const fmtMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const tirets = (n) => '.'.repeat(n);

// Colonnes du tableau — largeurs recalculées pour éviter tout débordement
// Total = 495 = 220 + 40 + 110 + 125
const COL = {
  nom:   { x: MARGIN,           w: 220 },
  qte:   { x: MARGIN + 220,     w: 40  },
  pu:    { x: MARGIN + 260,     w: 110 },
  total: { x: MARGIN + 370,     w: 125 },
};

const genererPdfBonCommande = (bc, infosCabinet) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];
    const dateCommande = bc.date_commande || new Date().toISOString().split('T')[0];

    // ── Filigrane logo ───────────────────────────────────────────────────────
    if (fs.existsSync(LOGO_MAPA)) {
      doc.save();
      doc.opacity(0.07);
      const sz = 280;
      doc.image(LOGO_MAPA, MARGIN + (CONTENT_W - sz) / 2, 220, { width: sz });
      doc.restore();
    }

    let y = MARGIN - 10;   // commence légèrement au-dessus du margin par défaut

    // ── "Abidjan, le [date]" — en-tête lettre, aligné à droite ─────────────
    doc.fontSize(10).font('Helvetica').fillColor(NOIR)
       .text(`Abidjan, le ${fmtDate(dateCommande)}`, MARGIN, y, { width: CONTENT_W, align: 'right' });
    y += 18;

    // ── Logo MAPA (gauche) + Titre (droite) ──────────────────────────────────
    const LOGO_H   = 65;
    const TITRE_X  = MARGIN + 80;
    const TITRE_W  = CONTENT_W - 80;

    if (fs.existsSync(LOGO_MAPA)) {
      doc.image(LOGO_MAPA, MARGIN, y, { height: LOGO_H });
    }

    doc.fontSize(22).font('Helvetica-Bold').fillColor(BLEU)
       .text('BON DE COMMANDE', TITRE_X, y + 2, { width: TITRE_W, align: 'right' });
    doc.fontSize(8.5).font('Helvetica').fillColor(ROUGE)
       .text('MAXIMIZING AMERICAN POTENTIAL IN AFRICA', TITRE_X, y + 28, { width: TITRE_W, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
       .text(`N° ${bc.numero}`, TITRE_X, y + 42, { width: TITRE_W, align: 'right' });

    y += LOGO_H + 10;

    // ── Ligne séparatrice rouge ───────────────────────────────────────────────
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
       .strokeColor(ROUGE).lineWidth(2).stroke();
    y += 12;

    // ── Corps lettre : NOM ET PRENOM / CONTACT / LIEU ────────────────────────
    const nomPrenom = [bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' ');

    const ligneChamp = (labelBold, valeur, y0) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR)
         .text(labelBold, MARGIN, y0, { continued: true });
      doc.font('Helvetica').fillColor(GRIS)
         .text(valeur || tirets(50));
    };

    ligneChamp('NOM ET PRENOM :  ', nomPrenom, y);
    y += 16;

    // CONTACT  +  ABIDJAN LE (même ligne, séparés)
    doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR)
       .text('CONTACT :  ', MARGIN, y, { continued: true });
    doc.font('Helvetica').fillColor(GRIS)
       .text(bc.telephone_commandeur || tirets(22), { continued: true });
    doc.font('Helvetica-Bold').fillColor(NOIR)
       .text('          ABIDJAN LE :  ', { continued: true });
    doc.font('Helvetica').fillColor(GRIS)
       .text(fmtDate(dateCommande));
    y += 16;

    ligneChamp('LIEU DE LIVRAISON :  ', bc.lieu_livraison, y);
    y += 16;

    if (bc.date_livraison_prevue) {
      ligneChamp('LIVRAISON PRÉVUE :  ', fmtDate(bc.date_livraison_prevue), y);
      y += 16;
    }

    y += 6;

    // ── Ligne séparatrice bleue avant tableau ─────────────────────────────────
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
       .strokeColor(BLEU).lineWidth(1).stroke();
    y += 8;

    // ── En-tête tableau ──────────────────────────────────────────────────────
    const ROW_H = 20;
    doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(BLEU);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('white')
       .text('DÉSIGNATION',
             COL.nom.x + 4,   y + 5, { width: COL.nom.w - 8,  lineBreak: false })
       .text('QTÉ',
             COL.qte.x,       y + 5, { width: COL.qte.w,      align: 'center', lineBreak: false })
       .text('PRIX UNIT.',
             COL.pu.x,        y + 5, { width: COL.pu.w - 4,   align: 'right',  lineBreak: false })
       .text('MONTANT',
             COL.total.x,     y + 5, { width: COL.total.w - 4, align: 'right', lineBreak: false });
    y += ROW_H + 2;

    // ── Lignes produits ───────────────────────────────────────────────────────
    if (lignes.length === 0) {
      doc.rect(MARGIN, y, CONTENT_W, 22).fill(BLEU_CLAIR);
      doc.fontSize(9).font('Helvetica').fillColor(GRIS)
         .text('Aucune ligne de commande', MARGIN, y + 6, { width: CONTENT_W, align: 'center' });
      y += 24;
    } else {
      lignes.forEach((l, idx) => {
        const fond = idx % 2 === 0 ? BLEU_CLAIR : 'white';
        doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(fond);
        doc.rect(MARGIN, y, CONTENT_W, ROW_H)
           .strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

        const montantLigne = (l.prix_unitaire || 0) * (l.quantite || 0);

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NOIR)
           .text(l.nom_produit || '—',
                 COL.nom.x + 4, y + 5, { width: COL.nom.w - 8, lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(NOIR)
           .text(String(l.quantite || 0),
                 COL.qte.x,  y + 5, { width: COL.qte.w,      align: 'center', lineBreak: false })
           .text(fmtMontant(l.prix_unitaire),
                 COL.pu.x,   y + 5, { width: COL.pu.w - 4,   align: 'right',  lineBreak: false })
           .text(fmtMontant(montantLigne),
                 COL.total.x, y + 5, { width: COL.total.w - 4, align: 'right', lineBreak: false });
        y += ROW_H + 2;
      });
    }

    // ── Ligne rouge sous le tableau ───────────────────────────────────────────
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
       .strokeColor(ROUGE).lineWidth(1.5).stroke();
    y += 10;

    // ── Total ─────────────────────────────────────────────────────────────────
    const totalValeur = lignes.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0);
    const TOTAL_X = MARGIN + CONTENT_W / 2;
    const TOTAL_W = CONTENT_W / 2;

    doc.rect(TOTAL_X, y, TOTAL_W, 22).fill(BLEU);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
       .text('TOTAL GÉNÉRAL', TOTAL_X + 6, y + 5, { width: TOTAL_W / 2 - 6 })
       .text(fmtMontant(totalValeur),
             TOTAL_X + TOTAL_W / 2, y + 5,
             { width: TOTAL_W / 2 - 6, align: 'right' });
    y += 30;

    // ── Remarques ─────────────────────────────────────────────────────────────
    if (bc.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU)
         .text('REMARQUES :', MARGIN, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor(NOIR)
         .text(bc.notes, MARGIN, y, { width: CONTENT_W });
      y += 20;
    }

    // ── Signatures ────────────────────────────────────────────────────────────
    const ySign = Math.max(y + 20, FOOTER_Y - 70);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU)
       .text('Signature Commandeur', MARGIN,           ySign, { width: 200, align: 'center' })
       .text('Signature MAPA',       MARGIN + CONTENT_W - 200, ySign, { width: 200, align: 'center' });
    doc.moveTo(MARGIN,                   ySign + 38)
       .lineTo(MARGIN + 200,             ySign + 38)
       .strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
    doc.moveTo(MARGIN + CONTENT_W - 200, ySign + 38)
       .lineTo(MARGIN + CONTENT_W,       ySign + 38)
       .strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

    // ── Footer image ──────────────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, MARGIN, FOOTER_Y, { width: CONTENT_W });
    }

    doc.end();
  });

module.exports = { genererPdfBonCommande };
