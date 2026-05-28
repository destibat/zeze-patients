'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ASSETS      = path.resolve(__dirname, '../assets');
const HEADER      = path.join(ASSETS, 'header-ordonnance.png');
const FOOTER      = path.join(ASSETS, 'footer-racines.jpg');

const PAGE_W      = 495;
const HEADER_H    = Math.round(PAGE_W * 124 / 460 * 0.6);
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800);
const MARGIN_LEFT = 50;
const MARGIN_TOP  = 20;
const CONTENT_TOP = MARGIN_TOP + HEADER_H + 14;
const FOOTER_Y    = 842 - 20 - FOOTER_H;

const ORANGE      = '#E65100';
const ORANGE_FOND = '#FFF3E0';
const VERT        = '#2E7D32';
const GRIS        = '#757575';
const GRIS_BORD   = '#BDBDBD';
const NOIR        = '#212121';
const BLEU_FOND   = '#E3F2FD';

const STATUT_LABEL = { en_attente: 'EN ATTENTE', envoye: 'PAIEMENT ENVOYE', paye: 'PAYE' };
const STATUT_COULEUR = { en_attente: ORANGE, envoye: '#1565C0', paye: VERT };

const MODE_LABEL = {
  especes: 'Especes', orange_money: 'Orange Money', momo_mtn: 'MoMo MTN',
  wave: 'Wave', moov: 'Moov Money', western_union: 'Western Union',
  moneygram: 'MoneyGram', ria: 'RIA', virement: 'Virement bancaire',
  cheque: 'Cheque', mobile_money: 'Mobile Money', autre: 'Autre',
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const genererPdfFactureAchat = (facture) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN_LEFT, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const produit   = facture.mouvement?.produit;
    const mouvement = facture.mouvement;
    const commande  = facture.commande;
    const delegue   = facture.delegue;
    const stockiste = facture.stockiste;
    const statut    = facture.statut_paiement || 'en_attente';

    const lignes = Array.isArray(commande?.lignes) && commande.lignes.length > 0
      ? commande.lignes
      : produit
        ? [{ nom_produit: produit.nom, quantite: mouvement?.quantite || 0, prix_unitaire: produit.prix_unitaire }]
        : [];

    // ── En-tête image ───────────────────────────────────────────────────────
    if (fs.existsSync(HEADER)) {
      doc.image(HEADER, MARGIN_LEFT, MARGIN_TOP, { fit: [PAGE_W, HEADER_H], align: 'left' });
    }
    const ySep = CONTENT_TOP - 6;
    doc.moveTo(MARGIN_LEFT, ySep).lineTo(MARGIN_LEFT + PAGE_W, ySep)
       .strokeColor(ORANGE).lineWidth(1.5).stroke();

    // ── Titre ───────────────────────────────────────────────────────────────
    doc.y = CONTENT_TOP;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(ORANGE)
       .text('FACTURE D\'ACHAT', MARGIN_LEFT, doc.y, { width: PAGE_W, align: 'center' });

    const dateRef = mouvement?.date_mouvement ?? commande?.date_validation ?? commande?.date_commande;
    const ref = dateRef
      ? `Ref. ${String(facture.id).slice(0, 8).toUpperCase()}   -   ${formatDate(dateRef)}`
      : `Ref. ${String(facture.id).slice(0, 8).toUpperCase()}`;
    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
       .text(ref, MARGIN_LEFT, doc.y + 2, { width: PAGE_W, align: 'center' });

    // Badge statut
    const yBadge = doc.y + 4;
    const badgeW = 150;
    const badgeX = MARGIN_LEFT + (PAGE_W - badgeW) / 2;
    doc.rect(badgeX, yBadge, badgeW, 14).fill(ORANGE_FOND);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(STATUT_COULEUR[statut] || GRIS)
       .text(STATUT_LABEL[statut] || statut, badgeX, yBadge + 3, { width: badgeW, align: 'center' });
    doc.y = yBadge + 22;

    // ── Délégué + Stockiste côte à côte ─────────────────────────────────────
    const colG   = MARGIN_LEFT;
    const colD   = MARGIN_LEFT + PAGE_W / 2 + 10;
    const yInfos = doc.y;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(ORANGE).text('ACHETEUR (DELEGUE)', colG, yInfos);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(`${delegue?.prenom || ''} ${delegue?.nom || ''}`.trim() || '—', colG, doc.y + 2);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    if (delegue?.email) doc.text(delegue.email, colG);

    const yApresDelegue = doc.y;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(ORANGE).text('VENDEUR (STOCKISTE)', colD, yInfos);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(`${stockiste?.prenom || ''} ${stockiste?.nom || ''}`.trim() || '—', colD, yInfos + 12);

    doc.y = Math.max(yApresDelegue, doc.y) + 12;

    // ── Tableau produit ─────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(ORANGE).text('DETAIL DE LA COMMANDE');
    doc.moveDown(0.3);

    const C = { produit: MARGIN_LEFT, qte: MARGIN_LEFT + 230, pu: MARGIN_LEFT + 285, total: MARGIN_LEFT + 380 };
    const W = { produit: 225, qte: 50, pu: 90, total: PAGE_W - 380 };

    // En-tête tableau
    const yTh = doc.y;
    doc.rect(MARGIN_LEFT, yTh, PAGE_W, 16).fill(ORANGE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
       .text('Produit', C.produit + 4, yTh + 4, { width: W.produit })
       .text('Qte',     C.qte,         yTh + 4, { width: W.qte,    align: 'center' })
       .text('P.U.',    C.pu,          yTh + 4, { width: W.pu,     align: 'right' })
       .text('Total',   C.total,       yTh + 4, { width: W.total,  align: 'right' });
    doc.y = yTh + 18;

    lignes.forEach((l, idx) => {
      const yL = doc.y;
      const fond = idx % 2 === 0 ? BLEU_FOND : 'white';
      doc.rect(MARGIN_LEFT, yL, PAGE_W, 20).fill(fond);
      doc.rect(MARGIN_LEFT, yL, PAGE_W, 20).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(NOIR)
         .text(l.nom_produit || '—', C.produit + 4, yL + 5, { width: W.produit - 4, lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor(NOIR)
         .text(String(l.quantite || 0),                                   C.qte,   yL + 5, { width: W.qte,   align: 'center', lineBreak: false })
         .text(formatMontant(l.prix_unitaire),                             C.pu,    yL + 5, { width: W.pu,    align: 'right',  lineBreak: false })
         .text(formatMontant((l.prix_unitaire || 0) * (l.quantite || 0)), C.total, yL + 5, { width: W.total, align: 'right',  lineBreak: false });
      doc.y = yL + 22;
    });

    // ── Total ───────────────────────────────────────────────────────────────
    doc.moveDown(0.6);
    const recapX = MARGIN_LEFT + PAGE_W / 2;
    const recapW = PAGE_W / 2;

    doc.moveTo(recapX, doc.y - 2).lineTo(MARGIN_LEFT + PAGE_W, doc.y - 2)
       .strokeColor(ORANGE).lineWidth(0.8).stroke();

    const yTotal = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text('MONTANT TOTAL', recapX, yTotal, { width: recapW / 2 })
       .text(formatMontant(facture.montant_total), recapX + recapW / 2, yTotal, { width: recapW / 2, align: 'right' });
    doc.y = yTotal + 16;

    // Mode et date de paiement
    if (facture.mode_paiement) {
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
         .text(`Mode de paiement : ${MODE_LABEL[facture.mode_paiement] || facture.mode_paiement}`,
               MARGIN_LEFT, doc.y + 6);
    }
    if (facture.date_paiement) {
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
         .text(`Date de paiement : ${formatDate(facture.date_paiement)}`, MARGIN_LEFT, doc.y + 4);
    }

    // ── Zone signature ──────────────────────────────────────────────────────
    const ySign = FOOTER_Y - 50;
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
       .text('Signature du stockiste', 340, ySign, { width: 200, align: 'center' });
    doc.moveTo(340, ySign + 38).lineTo(540, ySign + 38)
       .strokeColor(GRIS).lineWidth(0.5).stroke();

    // ── Pied de page image ──────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, MARGIN_LEFT, FOOTER_Y, { width: PAGE_W });
    }

    doc.end();
  });

module.exports = { genererPdfFactureAchat };
