'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ASSETS      = path.resolve(__dirname, '../assets');
const HEADER      = path.join(ASSETS, 'header-ordonnance.png');
const FOOTER      = path.join(ASSETS, 'footer-ordonnance.png');

const PAGE_W      = 495;
const HEADER_H    = Math.round(PAGE_W * 124 / 460 * 0.6); // ≈ 80
const FOOTER_H    = Math.round(PAGE_W * 360 / 1800);       // ≈ 99
const MARGIN_LEFT = 50;
const MARGIN_TOP  = 20;
const CONTENT_TOP = MARGIN_TOP + HEADER_H + 14;
const FOOTER_Y    = 842 - 20 - FOOTER_H;

const BLEU        = '#1565C0';
const BLEU_FONCE  = '#0D47A1';
const BLEU_FOND   = '#E3F2FD';
const VERT        = '#2E7D32';
const GRIS        = '#757575';
const GRIS_BORD   = '#BDBDBD';
const NOIR        = '#212121';
const ROUGE       = '#C62828';
const ORANGE      = '#E65100';

const STATUT_LABEL = {
  en_attente:          'EN ATTENTE',
  partiellement_payee: 'PARTIELLEMENT PAYEE',
  payee:               'PAYEE',
  annulee:             'ANNULEE',
};

const STATUT_COULEUR = {
  en_attente:          ORANGE,
  partiellement_payee: BLEU,
  payee:               VERT,
  annulee:             GRIS,
};

const MODE_LABEL = {
  especes:       'Especes',
  orange_money:  'Orange Money',
  momo_mtn:      'MoMo MTN',
  wave:          'Wave',
  moov:          'Moov Money',
  western_union: 'Western Union',
  moneygram:     'MoneyGram',
  ria:           'RIA',
  virement:      'Virement bancaire',
  cheque:        'Cheque',
  mobile_money:  'Mobile Money',
  autre:         'Autre',
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const parseLignes = (raw) => {
  if (!raw) return [];
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  return Array.isArray(raw) ? raw : [];
};

const genererPdfFacture = (facture, patient, emetteur) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN_LEFT, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes = parseLignes(facture.lignes);
    const restant = (facture.montant_total || 0) - (facture.montant_paye || 0);

    // ── En-tête image ───────────────────────────────────────────────────────
    if (fs.existsSync(HEADER)) {
      doc.image(HEADER, MARGIN_LEFT, MARGIN_TOP, { fit: [PAGE_W, HEADER_H], align: 'left' });
    }
    const ySep = CONTENT_TOP - 6;
    doc.moveTo(MARGIN_LEFT, ySep).lineTo(MARGIN_LEFT + PAGE_W, ySep)
       .strokeColor(BLEU).lineWidth(1.5).stroke();

    // ── Titre ───────────────────────────────────────────────────────────────
    doc.y = CONTENT_TOP;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(BLEU_FONCE)
       .text('FACTURE', MARGIN_LEFT, doc.y, { width: PAGE_W, align: 'center' });

    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
       .text(`N° ${facture.numero}   –   ${formatDate(facture.date_facture)}`,
             MARGIN_LEFT, doc.y + 2, { width: PAGE_W, align: 'center' });

    // Statut badge
    const statutLabel  = STATUT_LABEL[facture.statut]  || facture.statut;
    const statutCouleur = STATUT_COULEUR[facture.statut] || GRIS;
    const yBadge = doc.y + 4;
    const badgeW = 130;
    const badgeX = MARGIN_LEFT + (PAGE_W - badgeW) / 2;
    doc.rect(badgeX, yBadge, badgeW, 14).fill(BLEU_FOND);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(statutCouleur)
       .text(statutLabel, badgeX, yBadge + 3, { width: badgeW, align: 'center' });
    doc.y = yBadge + 22;

    // ── Patient + Emetteur côte à côte ──────────────────────────────────────
    const colG   = MARGIN_LEFT;
    const colD   = MARGIN_LEFT + PAGE_W / 2 + 10;
    const yInfos = doc.y;

    // Patient
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU).text('PATIENT', colG, yInfos);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(`${patient?.prenom || ''} ${patient?.nom || ''}`.trim() || '—', colG, doc.y + 2);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    if (patient?.numero_dossier) doc.text(`Dossier : ${patient.numero_dossier}`, colG);
    if (patient?.telephone)      doc.text(`Tel : ${patient.telephone}`, colG);

    const yApresPatient = doc.y;

    // Emetteur
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLEU).text('EMETTEUR', colD, yInfos);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(`${emetteur?.prenom || ''} ${emetteur?.nom || ''}`.trim() || '—', colD, yInfos + 12);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    if (emetteur?.telephone) doc.text(`Tel : ${emetteur.telephone}`, colD);

    doc.y = Math.max(yApresPatient, doc.y) + 12;

    // ── Tableau des lignes ──────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLEU_FONCE).text('DETAIL DE LA FACTURE');
    doc.moveDown(0.3);

    const C = {
      produit: MARGIN_LEFT,
      qte:     MARGIN_LEFT + 220,
      pu:      MARGIN_LEFT + 265,
      total:   MARGIN_LEFT + 370,
    };
    const COL_W = { produit: 215, qte: 40, pu: 100, total: PAGE_W - 370 };

    // En-tête tableau
    const yTh = doc.y;
    doc.rect(MARGIN_LEFT, yTh, PAGE_W, 16).fill(BLEU);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
       .text('Produit / Description', C.produit + 4, yTh + 4, { width: COL_W.produit })
       .text('Qte',    C.qte,   yTh + 4, { width: COL_W.qte,   align: 'center' })
       .text('P.U.',   C.pu,    yTh + 4, { width: COL_W.pu,    align: 'right' })
       .text('Total',  C.total, yTh + 4, { width: COL_W.total,  align: 'right' });
    doc.y = yTh + 18;

    if (lignes.length === 0) {
      const yL = doc.y;
      doc.rect(MARGIN_LEFT, yL, PAGE_W, 18).fill('#F5F5F5');
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
         .text('Aucune ligne', MARGIN_LEFT + 4, yL + 4, { width: PAGE_W - 8, align: 'center' });
      doc.y = yL + 20;
    } else {
      lignes.forEach((l, i) => {
        const yL = doc.y;
        const fond = i % 2 === 0 ? 'white' : BLEU_FOND;
        doc.rect(MARGIN_LEFT, yL, PAGE_W, 18).fill(fond);
        doc.rect(MARGIN_LEFT, yL, PAGE_W, 18).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

        doc.font('Helvetica-Bold').fontSize(8).fillColor(NOIR)
           .text(l.nom_produit || '—', C.produit + 4, yL + 4, { width: COL_W.produit - 4, lineBreak: false });
        doc.font('Helvetica').fontSize(8).fillColor(NOIR)
           .text(String(l.quantite || 0), C.qte,   yL + 4, { width: COL_W.qte,   align: 'center', lineBreak: false })
           .text(formatMontant(l.prix_unitaire),    C.pu,    yL + 4, { width: COL_W.pu,    align: 'right',  lineBreak: false })
           .text(formatMontant((l.prix_unitaire || 0) * (l.quantite || 0)),
                               C.total, yL + 4, { width: COL_W.total,  align: 'right',  lineBreak: false });
        doc.y = yL + 20;
      });
    }

    // ── Récapitulatif financier ─────────────────────────────────────────────
    doc.moveDown(0.6);
    const yRecap = doc.y;
    const recapX = MARGIN_LEFT + PAGE_W / 2;
    const recapW = PAGE_W / 2;

    const drawLigneRecap = (label, valeur, couleur, gras) => {
      const y = doc.y;
      doc.font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(couleur || NOIR)
         .text(label,  recapX,          y, { width: recapW / 2 })
         .text(valeur, recapX + recapW / 2, y, { width: recapW / 2, align: 'right' });
      doc.y = y + 14;
    };

    // Ligne séparatrice
    doc.moveTo(recapX, yRecap - 2).lineTo(MARGIN_LEFT + PAGE_W, yRecap - 2)
       .strokeColor(BLEU).lineWidth(0.8).stroke();

    drawLigneRecap('TOTAL TTC', formatMontant(facture.montant_total), NOIR, true);
    drawLigneRecap('Montant paye', formatMontant(facture.montant_paye), VERT, false);

    if (restant > 0 && facture.statut !== 'annulee') {
      drawLigneRecap('Reste a payer', formatMontant(restant), ROUGE, true);
    }

    // Mode de paiement
    if (facture.mode_paiement) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
         .text(`Mode de paiement : ${MODE_LABEL[facture.mode_paiement] || facture.mode_paiement}`,
               MARGIN_LEFT, doc.y);
      doc.moveDown(0.3);
    }

    // Notes
    if (facture.notes) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS).text('Notes :', MARGIN_LEFT, doc.y);
      doc.font('Helvetica').fontSize(8).fillColor(NOIR).text(facture.notes, MARGIN_LEFT);
    }

    // ── Zone signature ──────────────────────────────────────────────────────
    const ySign = FOOTER_Y - 50;
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
       .text('Signature et cachet', 340, ySign, { width: 200, align: 'center' });
    doc.moveTo(340, ySign + 38).lineTo(540, ySign + 38)
       .strokeColor(GRIS).lineWidth(0.5).stroke();

    // ── Pied de page image ──────────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, MARGIN_LEFT, FOOTER_Y, { width: PAGE_W });
    }

    doc.end();
  });

module.exports = { genererPdfFacture };
