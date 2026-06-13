'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ASSETS      = path.resolve(__dirname, '../assets');
const HEADER      = path.join(ASSETS, 'header-ordonnance.png');
const FOOTER      = path.join(ASSETS, 'footer-racines.jpg');

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
  en_attente:            'EN ATTENTE',
  partiellement_soldee:  'PARTIELLEMENT SOLDEE',
  soldee:                'SOLDEE',
  annulee:               'ANNULEE',
};

const STATUT_COULEUR = {
  en_attente:            ORANGE,
  partiellement_soldee:  BLEU,
  soldee:                VERT,
  annulee:               GRIS,
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

// Intl fr-FR utilise   comme séparateur milliers — PDFKit le mesure mal → remplacer par espace normale
const formatMontant = (n) => { const num = Math.round(n || 0); const str = String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return str + ' FCFA'; };

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

    const lignes  = parseLignes(facture.lignes);
    const restant = (facture.montant_total || 0) - (facture.montant_paye || 0);
    // Avoir = excédent réel (calculé à la volée, pas lu en DB pour éviter les valeurs périmées)
    const avoirReel = Math.max(0, (facture.montant_paye || 0) - (facture.montant_total || 0));

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

    // Tableau 3 colonnes : Produit | Qté | Montant
    // RIGHT_TOT = 300 → centre de la page (50% de la zone de contenu)
    const TAB_W   = 250;                 // 50→300
    const X_PROD  = MARGIN_LEFT + 4;     // 54
    const W_PROD  = 150;                 // 54→204
    const X_QTE   = 210;                 // colonne Qté centrée 210→230
    const RIGHT_TOT = MARGIN_LEFT + TAB_W; // 300

    const ROW_H = 24;                    // 2 lignes dans la cellule produit

    const textRight8 = (str, rightX, y) => {
      doc.font('Helvetica').fontSize(8);
      const w = doc.widthOfString(str);
      doc.text(str, rightX - w, y, { lineBreak: false });
    };

    // En-tête tableau
    const yTh = doc.y;
    doc.rect(MARGIN_LEFT, yTh, TAB_W, 16).fill(BLEU);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
    doc.text('Produit / Description', X_PROD, yTh + 4, { width: W_PROD, lineBreak: false });
    const qteHW = doc.widthOfString('Qte');
    const totHW = doc.widthOfString('Montant');
    doc.text('Qte',     X_QTE,                yTh + 4, { lineBreak: false });
    doc.text('Montant', RIGHT_TOT - totHW,    yTh + 4, { lineBreak: false });
    doc.y = yTh + 18;

    if (lignes.length === 0) {
      const yL = doc.y;
      doc.rect(MARGIN_LEFT, yL, TAB_W, ROW_H).fill('#F5F5F5');
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
         .text('Aucune ligne', MARGIN_LEFT + 4, yL + (ROW_H - 8) / 2, { width: TAB_W - 8, align: 'center' });
      doc.y = yL + ROW_H + 2;
    } else {
      lignes.forEach((l, i) => {
        const yL = doc.y;
        const fond = i % 2 === 0 ? 'white' : BLEU_FOND;
        doc.rect(MARGIN_LEFT, yL, TAB_W, ROW_H).fill(fond);
        doc.rect(MARGIN_LEFT, yL, TAB_W, ROW_H).strokeColor(GRIS_BORD).lineWidth(0.2).stroke();

        // Ligne 1 : nom du produit
        doc.font('Helvetica-Bold').fontSize(8).fillColor(NOIR)
           .text(l.nom_produit || '—', X_PROD, yL + 3, { width: W_PROD, lineBreak: false });
        // Ligne 2 : prix unitaire en gris
        if (l.prix_unitaire > 0) {
          doc.font('Helvetica').fontSize(7).fillColor(GRIS)
             .text(`(P.U.: ${formatMontant(l.prix_unitaire)})`, X_PROD, yL + 14, { width: W_PROD, lineBreak: false });
        }

        // Qté centrée verticalement
        const qteStr = String(l.quantite || 0);
        doc.font('Helvetica').fontSize(8).fillColor(NOIR);
        const qteW = doc.widthOfString(qteStr);
        doc.text(qteStr, X_QTE + (20 - qteW) / 2, yL + (ROW_H - 8) / 2, { lineBreak: false });

        // Montant total ligne, centré verticalement, bord droit à RIGHT_TOT
        textRight8(formatMontant((l.prix_unitaire || 0) * (l.quantite || 0)), RIGHT_TOT, yL + (ROW_H - 8) / 2);

        doc.y = yL + ROW_H + 2;
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

    // Avoir disponible (recalculé depuis les montants, pas lu en DB pour éviter valeurs périmées)
    const avoir = avoirReel;
    if (avoir > 0) {
      doc.moveDown(0.6);
      const yAvoir = doc.y;
      const avoirBoxX = MARGIN_LEFT;
      const avoirBoxW = PAGE_W;
      doc.rect(avoirBoxX, yAvoir, avoirBoxW, 28).fill('#FFF3E0');
      doc.rect(avoirBoxX, yAvoir, avoirBoxW, 28).strokeColor(ORANGE).lineWidth(0.8).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(ORANGE)
         .text('AVOIR DISPONIBLE :', avoirBoxX + 8, yAvoir + 5, { continued: true })
         .font('Helvetica-Bold').fontSize(11)
         .text(`  ${formatMontant(avoir)}`, { continued: false });
      const msgAvoir = restant > 0
        ? `Ce credit sera deduit du solde restant de cette facture (reste a payer : ${formatMontant(restant)}).`
        : 'Credit applicable sur le prochain achat de ce patient.';
      doc.font('Helvetica').fontSize(7.5).fillColor(GRIS)
         .text(msgAvoir, avoirBoxX + 8, yAvoir + 17);
      doc.y = yAvoir + 36;
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
