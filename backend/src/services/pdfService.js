'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ASSETS   = path.resolve(__dirname, '../assets');
const HEADER   = path.join(ASSETS, 'header-ordonnance.png');
const FOOTER   = path.join(ASSETS, 'footer-ordonnance.png');

// Header image : 460 × 124 px → sur 495pt de large → hauteur ≈ 133pt
const PAGE_W       = 495; // largeur utile (A4 595 – marges 2×50)
const HEADER_H     = Math.round(PAGE_W * 124 / 460); // ≈ 133
const FOOTER_H     = Math.round(PAGE_W * 360 / 1800); // ≈ 99
const MARGIN_LEFT  = 50;
const MARGIN_TOP   = 20;  // espace avant l'image d'en-tête
const CONTENT_TOP  = MARGIN_TOP + HEADER_H + 14; // début du contenu textuel
const FOOTER_Y     = 842 - 20 - FOOTER_H; // position verticale du footer sur A4

const VERT       = '#2E7D32';
const VERT_FONCE = '#1B5E20';
const GRIS       = '#757575';
const NOIR       = '#212121';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const genererOrdonnancePDF = (ordonnance, posologie) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN_LEFT, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes = typeof ordonnance.lignes === 'string'
      ? JSON.parse(ordonnance.lignes)
      : (ordonnance.lignes || []);
    const { patient, medecin, consultation } = ordonnance;

    // ── En-tête image ────────────────────────────────────────────────────
    if (fs.existsSync(HEADER)) {
      doc.image(HEADER, MARGIN_LEFT, MARGIN_TOP, { width: PAGE_W });
    }

    // Ligne séparatrice sous le header
    const ySep = CONTENT_TOP - 6;
    doc.moveTo(MARGIN_LEFT, ySep).lineTo(MARGIN_LEFT + PAGE_W, ySep)
       .strokeColor(VERT).lineWidth(1.5).stroke();

    // ── Titre ORDONNANCE + numéro + date ─────────────────────────────────
    doc.y = CONTENT_TOP;

    doc
      .fontSize(16).font('Helvetica-Bold').fillColor(VERT_FONCE)
      .text('ORDONNANCE', MARGIN_LEFT, doc.y, { width: PAGE_W, align: 'center' });

    doc
      .fontSize(8).font('Helvetica').fillColor(GRIS)
      .text(`N° ${ordonnance.numero}   –   ${formatDate(ordonnance.date_ordonnance)}`,
            MARGIN_LEFT, doc.y + 2, { width: PAGE_W, align: 'center' });

    doc.moveDown(0.8);

    // ── Patient + Prescripteur côte à côte ───────────────────────────────
    const colG = MARGIN_LEFT;
    const colD = MARGIN_LEFT + PAGE_W / 2 + 10;
    const yInfos = doc.y;

    // Bloc patient
    doc.font('Helvetica-Bold').fontSize(8).fillColor(VERT).text('PATIENT', colG, yInfos);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(`${patient.prenom} ${patient.nom}`, colG, doc.y + 2);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    doc.text(`Dossier : ${patient.numero_dossier}`, colG);
    if (patient.date_naissance) {
      const age = Math.floor(
        (new Date() - new Date(patient.date_naissance)) / (1000 * 60 * 60 * 24 * 365.25)
      );
      doc.text(`Âge : ${age} ans`, colG);
    }
    if (patient.telephone) doc.text(`Tél : ${patient.telephone}`, colG);

    const yApresPatient = doc.y;

    // Bloc prescripteur
    doc.font('Helvetica-Bold').fontSize(8).fillColor(VERT).text('PRESCRIPTEUR', colD, yInfos);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NOIR)
       .text(`${medecin.prenom} ${medecin.nom}`, colD, yInfos + 12);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    if (medecin.telephone) doc.text(`Tél : ${medecin.telephone}`, colD);

    doc.y = Math.max(yApresPatient, doc.y) + 10;

    // ── Motif de consultation ────────────────────────────────────────────
    if (consultation?.motif) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(VERT).text('MOTIF DE CONSULTATION');
      doc.font('Helvetica').fontSize(8).fillColor(NOIR).text(consultation.motif);
      doc.moveDown(0.5);
    }

    // ── Posologie suggérée ───────────────────────────────────────────────
    if (posologie) {
      const yPoso = doc.y;
      doc.rect(MARGIN_LEFT, yPoso, PAGE_W, 28).fillColor('#E8F5E9').fill();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(VERT_FONCE)
         .text("POSOLOGIE RECOMMANDÉE (tranche d'âge)", MARGIN_LEFT + 6, yPoso + 5);
      doc.font('Helvetica').fontSize(8).fillColor(NOIR)
         .text(posologie.instructions, MARGIN_LEFT + 6, doc.y + 2);
      doc.moveDown(0.8);
    }

    // ── Tableau des produits ─────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VERT_FONCE).text('PRODUITS PRESCRITS');
    doc.moveDown(0.3);

    const cols = { produit: MARGIN_LEFT, qte: 280, posologie: 330, duree: 430, prix: 490 };
    const yTh = doc.y;
    doc.rect(MARGIN_LEFT, yTh, PAGE_W, 16).fillColor(VERT).fill();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
       .text('Produit',   cols.produit + 4, yTh + 4)
       .text('Qté',       cols.qte,         yTh + 4)
       .text('Posologie', cols.posologie,    yTh + 4)
       .text('Durée',     cols.duree,        yTh + 4)
       .text('Prix',      cols.prix,         yTh + 4);

    doc.y = yTh + 18;

    lignes.forEach((ligne, i) => {
      const yL = doc.y;
      if (i % 2 === 0) {
        doc.rect(MARGIN_LEFT, yL, PAGE_W, 20).fillColor('#F1F8E9').fill();
      }
      doc.font('Helvetica-Bold').fontSize(8).fillColor(NOIR)
         .text(ligne.nom_produit, cols.produit + 4, yL + 3, { width: 220 });
      doc.font('Helvetica').fontSize(8).fillColor(NOIR);
      doc.text(String(ligne.quantite), cols.qte,      yL + 3);
      doc.text(ligne.posologie || '—', cols.posologie, yL + 3, { width: 95 });
      doc.text(ligne.duree     || '—', cols.duree,     yL + 3, { width: 55 });
      doc.text(formatMontant(ligne.prix_unitaire * ligne.quantite), cols.prix, yL + 3, { width: 55 });
      doc.y = yL + 22;
    });

    // Ligne total
    const yTotal = doc.y + 4;
    doc.moveTo(MARGIN_LEFT, yTotal).lineTo(MARGIN_LEFT + PAGE_W, yTotal)
       .strokeColor(VERT).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VERT_FONCE)
       .text(`TOTAL : ${formatMontant(ordonnance.montant_total)}`,
             MARGIN_LEFT, yTotal + 5, { width: PAGE_W, align: 'right' });

    doc.moveDown(1.2);

    // ── Allergies ────────────────────────────────────────────────────────
    const allergies = typeof patient.allergies === 'string'
      ? JSON.parse(patient.allergies)
      : (patient.allergies || []);
    if (allergies.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#C62828')
         .text('⚠ ALLERGIES CONNUES : ' + allergies.join(', '));
      doc.moveDown(0.5);
    }

    // ── Notes ────────────────────────────────────────────────────────────
    if (ordonnance.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS).text('NOTES :');
      doc.font('Helvetica').fontSize(8).fillColor(NOIR).text(ordonnance.notes);
      doc.moveDown(0.5);
    }

    // ── Zone signature ───────────────────────────────────────────────────
    const ySign = FOOTER_Y - 55;
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
       .text('Signature et cachet du prescripteur', 340, ySign,
             { width: 200, align: 'center' });
    doc.moveTo(340, ySign + 40).lineTo(540, ySign + 40)
       .strokeColor(GRIS).lineWidth(0.5).stroke();

    // ── Pied de page image ───────────────────────────────────────────────
    if (fs.existsSync(FOOTER)) {
      doc.image(FOOTER, MARGIN_LEFT, FOOTER_Y, { width: PAGE_W });
    }

    doc.end();
  });

module.exports = { genererOrdonnancePDF };
