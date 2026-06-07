'use strict';

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

const ASSETS    = path.resolve(__dirname, '../assets');
const LOGO_MAPA = path.join(ASSETS, 'logo-mapa.jpg');
const FOOTER    = path.join(ASSETS, 'footer-mapa.jpg');

const A4_H     = 842;
const ML       = 50;
const CW       = 495;
const FOOTER_H = 99;
const FOOTER_Y = A4_H - ML - FOOTER_H;

const BLEU       = '#1A237E';
const ROUGE      = '#B71C1C';
const VERT       = '#1B5E20';
const VERT_CLAIR = '#E8F5E9';
const AMBER      = '#E65100';
const AMBER_CLAIR= '#FFF3E0';
const ROUGE_CLAIR= '#FFEBEE';
const BLEU_CLAIR = '#E8EAF6';
const GRIS       = '#424242';
const GRIS_BORD  = '#BDBDBD';
const NOIR       = '#212121';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtM = (n) => {
  const s = Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return s + ' FCFA';
};

// Colonnes : 200 + 65 + 65 + 65 + 100 = 495
const COL_NOM  = { x: ML,           w: 200 };
const COL_CMD  = { x: ML + 200,     w: 65  };
const COL_REC  = { x: ML + 265,     w: 65  };
const COL_ECR  = { x: ML + 330,     w: 65  };
const COL_MNT  = { x: ML + 395,     w: 100 };

const tCell = (doc, txt, col, y, opts = {}) => {
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(opts.size || 8.5)
     .fillColor(opts.color || NOIR);
  doc.text(String(txt ?? '—'), col.x + 4, y, {
    width:     col.w - 8,
    align:     opts.align || 'center',
    lineBreak: opts.lineBreak !== false ? false : true,
  });
};

const drawColBorders = (doc, y0, h) => {
  [COL_CMD.x, COL_REC.x, COL_ECR.x, COL_MNT.x].forEach((cx) => {
    doc.moveTo(cx, y0).lineTo(cx, y0 + h).strokeColor(GRIS_BORD).lineWidth(0.3).stroke();
  });
};

const genererPdfReceptionBC = (bc, infosCabinet) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes        = Array.isArray(bc.lignes)         ? bc.lignes         : [];
    const lignesLivrees = Array.isArray(bc.lignes_livrees) ? bc.lignes_livrees : [];
    const dateRecep     = bc.date_livraison_effective || new Date().toISOString().split('T')[0];
    const estComplet    = bc.statut === 'livre';

    // ── Filigrane ────────────────────────────────────────────────────────────
    if (fs.existsSync(LOGO_MAPA)) {
      doc.save();
      doc.opacity(0.07);
      const sz = 280;
      doc.image(LOGO_MAPA, ML + (CW - sz) / 2, 210, { width: sz });
      doc.restore();
    }

    let y = ML - 10;

    // ── "Abidjan, le [date]" ──────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').fillColor(NOIR);
    doc.text(`Abidjan, le ${fmtDate(dateRecep)}`, ML, y, { width: CW, align: 'right' });
    y += 20;

    // ── Logo + Titre ──────────────────────────────────────────────────────
    const LOGO_H = 65;
    const TX = ML + 85;
    const TW = CW - 85;

    if (fs.existsSync(LOGO_MAPA)) {
      doc.image(LOGO_MAPA, ML, y, { height: LOGO_H });
    }
    doc.fontSize(20).font('Helvetica-Bold').fillColor(BLEU);
    doc.text('BON DE RÉCEPTION', TX, y + 2, { width: TW, align: 'right' });
    doc.fontSize(8.5).font('Helvetica').fillColor(ROUGE);
    doc.text('MAXIMIZING AMERICAN POTENTIAL IN AFRICA', TX, y + 28, { width: TW, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GRIS);
    doc.text(`Réf. BC : ${bc.numero}`, TX, y + 42, { width: TW, align: 'right' });

    // Badge statut livraison
    const badgeColor = estComplet ? VERT : AMBER;
    const badgeLabel = estComplet ? 'LIVRAISON COMPLÈTE' : 'LIVRAISON PARTIELLE';
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(badgeColor);
    doc.text(`● ${badgeLabel}`, TX, y + 56, { width: TW, align: 'right' });
    y += LOGO_H + 12;

    // ── Séparatrice rouge ─────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(ROUGE).lineWidth(2).stroke();
    y += 12;

    // ── Informations ─────────────────────────────────────────────────────
    const nomPrenom = [bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' ');

    const champInfo = (label, valeur) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR);
      doc.text(label, ML, y, { continued: true });
      doc.font('Helvetica').fillColor(GRIS);
      doc.text(valeur || '—');
      y += 16;
    };

    champInfo('NOM ET PRENOM :  ', nomPrenom);
    champInfo('CONTACT :  ', bc.telephone_commandeur);
    champInfo('LIEU DE LIVRAISON :  ', bc.lieu_livraison);
    champInfo('DATE DE RÉCEPTION :  ', fmtDate(dateRecep));
    if (bc.nom_stockiste_mapa) {
      champInfo('STOCKISTE MAPA :  ', bc.nom_stockiste_mapa);
    }
    y += 6;

    // ── Séparatrice bleue ─────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BLEU).lineWidth(1).stroke();
    y += 8;

    // ── En-tête tableau ───────────────────────────────────────────────────
    const RH = 20;
    doc.rect(ML, y, CW, RH).fill(BLEU);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8);
    doc.text('DÉSIGNATION',   COL_NOM.x + 4, y + 6, { width: COL_NOM.w - 8, lineBreak: false });
    doc.text('QTÉ CMD.',      COL_CMD.x,     y + 6, { width: COL_CMD.w - 8, align: 'center', lineBreak: false });
    doc.text('QTÉ REÇUE',     COL_REC.x,     y + 6, { width: COL_REC.w - 8, align: 'center', lineBreak: false });
    doc.text('ÉCART',         COL_ECR.x,     y + 6, { width: COL_ECR.w - 8, align: 'center', lineBreak: false });
    doc.text('MONTANT REÇU',  COL_MNT.x,     y + 6, { width: COL_MNT.w - 8, align: 'right',  lineBreak: false });
    y += RH;

    // ── Lignes ────────────────────────────────────────────────────────────
    let totalCmd = 0;
    let totalRec = 0;

    if (lignes.length === 0) {
      doc.rect(ML, y, CW, RH).fill(BLEU_CLAIR);
      doc.font('Helvetica').fontSize(9).fillColor(GRIS);
      doc.text('Aucune ligne', ML, y + 5, { width: CW, align: 'center', lineBreak: false });
      y += RH;
    } else {
      lignes.forEach((l, idx) => {
        const ll      = lignesLivrees.find((x) => x.produit_id === l.produit_id);
        const qteCmd  = l.quantite || 0;
        const qteRec  = ll ? (ll.quantite_livree ?? 0) : qteCmd; // si pas dans lignes_livrees → considéré livré
        const ecart   = qteCmd - qteRec;
        const pu      = l.prix_unitaire || 0;
        const mntRec  = pu * qteRec;

        totalCmd += pu * qteCmd;
        totalRec += mntRec;

        // Fond selon état de livraison
        let fond;
        if (qteRec === 0)          fond = ROUGE_CLAIR;
        else if (ecart > 0)        fond = AMBER_CLAIR;
        else                       fond = idx % 2 === 0 ? VERT_CLAIR : 'white';

        const nomH  = doc.font('Helvetica-Bold').fontSize(8.5)
                         .heightOfString(l.nom_produit || '—', { width: COL_NOM.w - 8 });
        const rowH  = Math.max(RH, Math.ceil(nomH) + 10);

        doc.rect(ML, y, CW, rowH).fill(fond);
        doc.rect(ML, y, CW, rowH).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

        // Nom (haut gauche, peut déborder sur 2 lignes)
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NOIR);
        doc.text(l.nom_produit || '—', COL_NOM.x + 4, y + 5, { width: COL_NOM.w - 8 });

        const midY = y + Math.floor((rowH - 9) / 2);

        tCell(doc, qteCmd, COL_CMD, midY);
        tCell(doc, qteRec, COL_REC, midY, { color: qteRec === 0 ? ROUGE : ecart > 0 ? AMBER : VERT, bold: true });
        tCell(doc, ecart > 0 ? `-${ecart}` : '—', COL_ECR, midY, { color: ecart > 0 ? ROUGE : GRIS });
        tCell(doc, fmtM(mntRec), COL_MNT, midY, { align: 'right' });

        drawColBorders(doc, y, rowH);
        y += rowH;
      });
    }

    // ── Séparatrice rouge sous tableau ────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(ROUGE).lineWidth(1.5).stroke();
    y += 10;

    // ── Totaux ────────────────────────────────────────────────────────────
    const TX2 = ML;
    const TW2 = CW;
    const rowTot = 22;

    // Total commandé
    doc.rect(TX2, y, TW2, rowTot).fill(BLEU_CLAIR);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLEU);
    doc.text('TOTAL COMMANDÉ', TX2 + 6, y + 6, { width: TW2 / 2 - 6, lineBreak: false });
    doc.text(fmtM(totalCmd), TX2 + TW2 / 2, y + 6, { width: TW2 / 2 - 8, align: 'right', lineBreak: false });
    y += rowTot;

    // Total reçu
    doc.rect(TX2, y, TW2, rowTot).fill(VERT_CLAIR);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VERT);
    doc.text('TOTAL REÇU', TX2 + 6, y + 6, { width: TW2 / 2 - 6, lineBreak: false });
    doc.text(fmtM(totalRec), TX2 + TW2 / 2, y + 6, { width: TW2 / 2 - 8, align: 'right', lineBreak: false });
    y += rowTot;

    // Écart si partiel
    if (!estComplet && totalCmd > totalRec) {
      doc.rect(TX2, y, TW2, rowTot).fill(ROUGE_CLAIR);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(ROUGE);
      doc.text('RESTANT À RECEVOIR', TX2 + 6, y + 6, { width: TW2 / 2 - 6, lineBreak: false });
      doc.text(fmtM(totalCmd - totalRec), TX2 + TW2 / 2, y + 6, { width: TW2 / 2 - 8, align: 'right', lineBreak: false });
      y += rowTot;
    }

    y += 8;

    // ── Remarques ─────────────────────────────────────────────────────────
    if (bc.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU);
      doc.text('REMARQUES :', ML, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor(NOIR);
      doc.text(bc.notes, ML, y, { width: CW });
      y += 20;
    }

    // ── Signatures ────────────────────────────────────────────────────────
    const ySign = Math.max(y + 24, FOOTER_Y - 72);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU);
    doc.text('Signature Réceptionnaire', ML,              ySign, { width: 200, align: 'center' });
    doc.text('Signature MAPA',           ML + CW - 200,   ySign, { width: 200, align: 'center' });
    doc.moveTo(ML,            ySign + 38).lineTo(ML + 200,    ySign + 38).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
    doc.moveTo(ML + CW - 200, ySign + 38).lineTo(ML + CW,     ySign + 38).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

    // ── Footer ────────────────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, ML, FOOTER_Y, { width: CW });
    }

    doc.end();
  });

module.exports = { genererPdfReceptionBC };
