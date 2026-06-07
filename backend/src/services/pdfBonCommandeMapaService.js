'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ASSETS     = path.resolve(__dirname, '../assets');
const LOGO_MAPA  = path.join(ASSETS, 'logo-mapa.jpg');
const FOOTER     = path.join(ASSETS, 'footer-mapa.jpg');

const PAGE_W      = 495;
const MARGIN_LEFT = 50;
const MARGIN_TOP  = 20;
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800);
const FOOTER_Y    = 842 - 20 - FOOTER_H;

const VERT       = '#1B5E20';
const VERT_FOND  = '#E8F5E9';
const GRIS       = '#616161';
const GRIS_BORD  = '#BDBDBD';
const NOIR       = '#212121';
const ORANGE     = '#E65100';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const genererPdfBonCommande = (bonCommande, infosCabinet) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN_LEFT, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes    = Array.isArray(bonCommande.lignes) ? bonCommande.lignes : [];
    const createur  = bonCommande.createur;
    const nomCabinet = infosCabinet?.nom_cabinet || `${createur?.prenom || ''} ${createur?.nom || ''}`.trim() || 'Cabinet';
    const telCabinet = infosCabinet?.telephone_cabinet || '';
    const villeCabinet = infosCabinet?.ville_cabinet || '';

    let y = MARGIN_TOP;

    // ── Logo MAPA ────────────────────────────────────────────────────────────
    const logoH = 70;
    if (fs.existsSync(LOGO_MAPA)) {
      doc.image(LOGO_MAPA, MARGIN_LEFT, y, { height: logoH, align: 'left' });
    }

    // Titre et numéro côte-à-côte avec le logo
    const titreX = MARGIN_LEFT + 120;
    const titreW = PAGE_W - 120;
    doc.fontSize(20).font('Helvetica-Bold').fillColor(VERT)
       .text('BON DE COMMANDE', titreX, y + 8, { width: titreW, align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor(GRIS)
       .text(`N° ${bonCommande.numero}`, titreX, y + 34, { width: titreW, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
       .text(`Date : ${formatDate(bonCommande.date_commande)}`, titreX, y + 48, { width: titreW, align: 'right' });

    y = MARGIN_TOP + logoH + 14;
    doc.moveTo(MARGIN_LEFT, y).lineTo(MARGIN_LEFT + PAGE_W, y)
       .strokeColor(VERT).lineWidth(1.5).stroke();
    y += 12;

    // ── Bloc commandeur / destinataire ───────────────────────────────────────
    const colG = MARGIN_LEFT;
    const colD = MARGIN_LEFT + PAGE_W / 2 + 10;
    const halfW = PAGE_W / 2 - 14;

    // Bloc "Commandeur"
    doc.rect(colG, y, halfW, 14).fill(VERT);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('white')
       .text('COMMANDEUR', colG + 4, y + 3, { width: halfW - 8 });
    y += 18;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(nomCabinet, colG, y, { width: halfW });
    y += 14;
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    if (telCabinet) { doc.text(`Tél : ${telCabinet}`, colG, y, { width: halfW }); y += 11; }
    if (villeCabinet) { doc.text(villeCabinet, colG, y, { width: halfW }); y += 11; }
    if (createur?.email) { doc.text(createur.email, colG, y, { width: halfW }); y += 11; }

    const yApresCmdeur = y;

    // Bloc "Destinataire" (MAPA)
    let yD = MARGIN_TOP + logoH + 26;
    doc.rect(colD, yD, halfW, 14).fill(ORANGE);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('white')
       .text('DESTINATAIRE', colD + 4, yD + 3, { width: halfW - 8 });
    yD += 18;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text('MAPA — Marché Africain', colD, yD, { width: halfW });
    yD += 14;
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
       .text('des Produits Alimentaires', colD, yD, { width: halfW });

    y = Math.max(yApresCmdeur, yD + 14) + 14;

    // ── Titre tableau ────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VERT)
       .text('DÉTAIL DE LA COMMANDE', MARGIN_LEFT, y);
    y += 14;

    // En-têtes colonnes
    const C = {
      ref:    MARGIN_LEFT,
      nom:    MARGIN_LEFT + 70,
      qte:    MARGIN_LEFT + 295,
      pu:     MARGIN_LEFT + 345,
      total:  MARGIN_LEFT + 415,
    };
    const W = {
      ref:   66,
      nom:   220,
      qte:   46,
      pu:    66,
      total: 80,
    };

    doc.rect(MARGIN_LEFT, y, PAGE_W, 16).fill(VERT);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('white')
       .text('Réf.',       C.ref + 3,   y + 4, { width: W.ref - 3 })
       .text('Désignation', C.nom + 3,  y + 4, { width: W.nom - 3 })
       .text('Qté',        C.qte,       y + 4, { width: W.qte,   align: 'center' })
       .text('P.U.',       C.pu,        y + 4, { width: W.pu,    align: 'right' })
       .text('Montant',    C.total,     y + 4, { width: W.total, align: 'right' });
    y += 18;

    // Lignes produits
    lignes.forEach((l, idx) => {
      const fond = idx % 2 === 0 ? VERT_FOND : 'white';
      doc.rect(MARGIN_LEFT, y, PAGE_W, 20).fill(fond);
      doc.rect(MARGIN_LEFT, y, PAGE_W, 20).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

      const ref = l.reference_mapa || '—';
      doc.font('Helvetica').fontSize(8).fillColor(NOIR)
         .text(ref,                                                      C.ref + 3,  y + 5, { width: W.ref - 3,    lineBreak: false })
         .text(l.nom_produit || '—',                                     C.nom + 3,  y + 5, { width: W.nom - 3,    lineBreak: false })
         .text(String(l.quantite || 0),                                  C.qte,      y + 5, { width: W.qte,   align: 'center', lineBreak: false })
         .text(formatMontant(l.prix_unitaire),                           C.pu,       y + 5, { width: W.pu,    align: 'right',  lineBreak: false })
         .text(formatMontant((l.prix_unitaire || 0) * (l.quantite || 0)), C.total,   y + 5, { width: W.total, align: 'right',  lineBreak: false });
      y += 22;
    });

    if (lignes.length === 0) {
      doc.rect(MARGIN_LEFT, y, PAGE_W, 24).fill(VERT_FOND);
      doc.font('Helvetica').fontSize(9).fillColor(GRIS)
         .text('Aucune ligne de commande', MARGIN_LEFT, y + 7, { width: PAGE_W, align: 'center' });
      y += 26;
    }

    // ── Total ────────────────────────────────────────────────────────────────
    y += 8;
    const totalX = MARGIN_LEFT + PAGE_W / 2;
    const totalW = PAGE_W / 2;
    doc.moveTo(totalX, y - 2).lineTo(MARGIN_LEFT + PAGE_W, y - 2)
       .strokeColor(VERT).lineWidth(0.8).stroke();

    doc.rect(totalX, y, totalW, 20).fill(VERT);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
       .text('MONTANT TOTAL',            totalX + 6,           y + 5, { width: totalW / 2 })
       .text(formatMontant(bonCommande.montant_total), totalX + totalW / 2, y + 5, { width: totalW / 2 - 6, align: 'right' });
    y += 28;

    // ── Notes ────────────────────────────────────────────────────────────────
    if (bonCommande.notes) {
      y += 6;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS).text('Remarques :', MARGIN_LEFT, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor(NOIR)
         .text(bonCommande.notes, MARGIN_LEFT, y, { width: PAGE_W });
      y += 20;
    }

    // ── Zone signatures ──────────────────────────────────────────────────────
    const ySign = Math.max(y + 20, FOOTER_Y - 70);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
       .text('Signature & Cachet Commandeur', MARGIN_LEFT, ySign, { width: 200, align: 'center' })
       .text('Signature & Cachet MAPA',       MARGIN_LEFT + 295, ySign, { width: 200, align: 'center' });
    doc.moveTo(MARGIN_LEFT,       ySign + 36).lineTo(MARGIN_LEFT + 200,       ySign + 36).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
    doc.moveTo(MARGIN_LEFT + 295, ySign + 36).lineTo(MARGIN_LEFT + PAGE_W,   ySign + 36).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

    // ── Footer image ─────────────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, MARGIN_LEFT, FOOTER_Y, { width: PAGE_W });
    }

    doc.end();
  });

module.exports = { genererPdfBonCommande };
