'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ASSETS    = path.resolve(__dirname, '../assets');
const LOGO_MAPA = path.join(ASSETS, 'logo-mapa.jpg');
const FOOTER    = path.join(ASSETS, 'footer-mapa.jpg');

const PAGE_W      = 495;
const MARGIN_LEFT = 50;
const MARGIN_TOP  = 20;
const FOOTER_H    = 99;
const FOOTER_Y    = 842 - 20 - FOOTER_H;

// Couleurs MAPA officielles
const BLEU       = '#1A237E';
const ROUGE      = '#B71C1C';
const BLEU_CLAIR = '#E8EAF6';
const GRIS       = '#424242';
const GRIS_BORD  = '#BDBDBD';
const NOIR       = '#212121';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const tirets = (nb) => '.'.repeat(nb);

const genererPdfBonCommande = (bc, infosCabinet) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN_LEFT, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];
    let y = MARGIN_TOP;

    // ── Logo MAPA en filigrane (centré, semi-transparent) ───────────────────
    if (fs.existsSync(LOGO_MAPA)) {
      doc.save();
      doc.opacity(0.08);
      const logoSize = 260;
      const logoX = MARGIN_LEFT + (PAGE_W - logoSize) / 2;
      const logoY = 200;
      doc.image(LOGO_MAPA, logoX, logoY, { width: logoSize });
      doc.restore();
    }

    // ── En-tête : logo à gauche, titre à droite ──────────────────────────────
    if (fs.existsSync(LOGO_MAPA)) {
      doc.image(LOGO_MAPA, MARGIN_LEFT, y, { height: 70 });
    }

    const titreX = MARGIN_LEFT + 90;
    const titreW = PAGE_W - 90;
    doc.fontSize(20).font('Helvetica-Bold').fillColor(BLEU)
       .text('BON DE COMMANDE', titreX, y + 4, { width: titreW, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(ROUGE)
       .text('MAXIMIZING AMERICAN POTENTIAL IN AFRICA', titreX, y + 30, { width: titreW, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
       .text(`N° ${bc.numero}`, titreX, y + 46, { width: titreW, align: 'right' });

    y += 80;

    // Ligne rouge séparatrice
    doc.moveTo(MARGIN_LEFT, y).lineTo(MARGIN_LEFT + PAGE_W, y)
       .strokeColor(ROUGE).lineWidth(2).stroke();
    y += 10;

    // ── Section formulaire (format officiel MAPA) ────────────────────────────
    const nomPrenom = [bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' ');
    const nomStockiste = bc.nom_stockiste_mapa || '';

    // NOM ET PRENOM
    doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR)
       .text('NOM ET PRENOM : ', MARGIN_LEFT, y, { continued: true })
       .font('Helvetica').fillColor(GRIS)
       .text(nomPrenom || tirets(60));
    y += 16;

    // CONTACT + ABIDJAN LE (même ligne)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text('CONTACT : ', MARGIN_LEFT, y, { continued: true })
       .font('Helvetica').fillColor(GRIS)
       .text(bc.telephone_commandeur || tirets(25), { continued: true })
       .font('Helvetica-Bold').fillColor(NOIR)
       .text('          ABIDJAN LE : ', { continued: true })
       .font('Helvetica').fillColor(GRIS)
       .text(formatDate(bc.date_commande));
    y += 16;

    // LIEU
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text('LIEU : ', MARGIN_LEFT, y, { continued: true })
       .font('Helvetica').fillColor(GRIS)
       .text(bc.lieu_livraison || tirets(55));
    y += 16;

    // STOCKISTE (remplace l'email)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text('STOCKISTE : ', MARGIN_LEFT, y, { continued: true })
       .font('Helvetica').fillColor(GRIS)
       .text(nomStockiste || tirets(55));
    y += 16;

    // Date de livraison prévue si renseignée
    if (bc.date_livraison_prevue) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
         .text('LIVRAISON PRÉVUE : ', MARGIN_LEFT, y, { continued: true })
         .font('Helvetica').fillColor(GRIS)
         .text(formatDate(bc.date_livraison_prevue));
      y += 16;
    }

    y += 8;

    // Ligne bleue avant le tableau
    doc.moveTo(MARGIN_LEFT, y).lineTo(MARGIN_LEFT + PAGE_W, y)
       .strokeColor(BLEU).lineWidth(1).stroke();
    y += 8;

    // ── Tableau produits ─────────────────────────────────────────────────────
    // Colonnes : Désignation | Quantité | Prix unitaire | Montant
    const C = {
      nom:   MARGIN_LEFT,
      qte:   MARGIN_LEFT + 300,
      pu:    MARGIN_LEFT + 355,
      total: MARGIN_LEFT + 420,
    };
    const W = {
      nom:   296,
      qte:   52,
      pu:    62,
      total: 75,
    };

    // En-tête tableau
    doc.rect(MARGIN_LEFT, y, PAGE_W, 18).fill(BLEU);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('white')
       .text('DÉSIGNATION',   C.nom + 4,   y + 5, { width: W.nom - 4 })
       .text('QTÉ',           C.qte,        y + 5, { width: W.qte,   align: 'center' })
       .text('PRIX UNIT.',    C.pu,         y + 5, { width: W.pu,    align: 'right' })
       .text('MONTANT',       C.total,      y + 5, { width: W.total, align: 'right' });
    y += 20;

    if (lignes.length === 0) {
      doc.rect(MARGIN_LEFT, y, PAGE_W, 22).fill(BLEU_CLAIR);
      doc.fontSize(9).font('Helvetica').fillColor(GRIS)
         .text('Aucune ligne de commande', MARGIN_LEFT, y + 6, { width: PAGE_W, align: 'center' });
      y += 24;
    } else {
      lignes.forEach((l, idx) => {
        const fond = idx % 2 === 0 ? BLEU_CLAIR : 'white';
        doc.rect(MARGIN_LEFT, y, PAGE_W, 20).fill(fond);
        doc.rect(MARGIN_LEFT, y, PAGE_W, 20).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NOIR)
           .text(l.nom_produit || '—', C.nom + 4, y + 5, { width: W.nom - 8, lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(NOIR)
           .text(String(l.quantite || 0),                                    C.qte,   y + 5, { width: W.qte,   align: 'center', lineBreak: false })
           .text(formatMontant(l.prix_unitaire),                              C.pu,    y + 5, { width: W.pu,    align: 'right',  lineBreak: false })
           .text(formatMontant((l.prix_unitaire || 0) * (l.quantite || 0)),  C.total, y + 5, { width: W.total, align: 'right',  lineBreak: false });
        y += 22;
      });
    }

    // Ligne rouge sous le tableau
    doc.moveTo(MARGIN_LEFT, y).lineTo(MARGIN_LEFT + PAGE_W, y)
       .strokeColor(ROUGE).lineWidth(1.5).stroke();
    y += 10;

    // ── Total ────────────────────────────────────────────────────────────────
    const totalX = MARGIN_LEFT + PAGE_W / 2;
    const totalW = PAGE_W / 2;

    doc.rect(totalX, y, totalW, 22).fill(BLEU);
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('white')
       .text('TOTAL GÉNÉRAL',          totalX + 6,          y + 5, { width: totalW / 2 })
       .text(formatMontant(bc.montant_total), totalX + totalW / 2, y + 5, { width: totalW / 2 - 6, align: 'right' });
    y += 30;

    // ── Notes ────────────────────────────────────────────────────────────────
    if (bc.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU).text('REMARQUES :', MARGIN_LEFT, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor(NOIR)
         .text(bc.notes, MARGIN_LEFT, y, { width: PAGE_W });
      y += 20;
    }

    // ── Signatures ───────────────────────────────────────────────────────────
    const ySign = Math.max(y + 20, FOOTER_Y - 65);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU)
       .text('Signature Commandeur', MARGIN_LEFT, ySign, { width: 200, align: 'center' })
       .text('Signature MAPA',       MARGIN_LEFT + 295, ySign, { width: 200, align: 'center' });
    doc.moveTo(MARGIN_LEFT,       ySign + 38).lineTo(MARGIN_LEFT + 200,     ySign + 38).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();
    doc.moveTo(MARGIN_LEFT + 295, ySign + 38).lineTo(MARGIN_LEFT + PAGE_W, ySign + 38).strokeColor(GRIS_BORD).lineWidth(0.5).stroke();

    // ── Footer image ─────────────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, MARGIN_LEFT, FOOTER_Y, { width: PAGE_W });
    }

    doc.end();
  });

module.exports = { genererPdfBonCommande };
