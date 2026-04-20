'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.resolve(__dirname, '../../../..', 'logo-zeze.png');
const VERT = '#2E7D32';
const VERT_FONCE = '#1B5E20';
const GRIS = '#757575';
const NOIR = '#212121';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMontant = (n) =>
  new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const genererOrdonnancePDF = (ordonnance, posologie) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lignes = typeof ordonnance.lignes === 'string'
    ? JSON.parse(ordonnance.lignes)
    : (ordonnance.lignes || []);
  const { patient, medecin, consultation } = ordonnance;
    const pageW = doc.page.width - 100; // marges 50 de chaque côté

    // ── En-tête ─────────────────────────────────────────────────────────
    const logoExiste = fs.existsSync(LOGO_PATH);
    if (logoExiste) {
      doc.image(LOGO_PATH, 50, 40, { height: 60 });
    }

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(VERT_FONCE)
      .text('ORDONNANCE', logoExiste ? 300 : 50, 45, { align: logoExiste ? 'right' : 'left' });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GRIS)
      .text(`N° ${ordonnance.numero}`, { align: 'right' })
      .text(`Date : ${formatDate(ordonnance.date_ordonnance)}`, { align: 'right' });

    // Ligne séparatrice
    doc.moveDown(0.5);
    const y0 = doc.y;
    doc.moveTo(50, y0).lineTo(545, y0).strokeColor(VERT).lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ── Patient + Médecin côte à côte ────────────────────────────────────
    const colG = 50;
    const colD = 310;
    const yInfos = doc.y;

    // Bloc patient
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VERT).text('PATIENT', colG, yInfos);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(NOIR)
      .text(`${patient.prenom} ${patient.nom}`, colG, doc.y + 2);
    doc.font('Helvetica').fontSize(9).fillColor(GRIS);
    doc.text(`Dossier : ${patient.numero_dossier}`, colG);
    if (patient.date_naissance) {
      const age = Math.floor(
        (new Date() - new Date(patient.date_naissance)) / (1000 * 60 * 60 * 24 * 365.25)
      );
      doc.text(`Âge : ${age} ans`, colG);
    }
    if (patient.telephone) doc.text(`Tél : ${patient.telephone}`, colG);

    // Bloc médecin
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VERT).text('PRESCRIPTEUR', colD, yInfos);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(NOIR)
      .text(`${medecin.prenom} ${medecin.nom}`, colD, yInfos + 14);
    doc.font('Helvetica').fontSize(9).fillColor(GRIS);
    if (medecin.telephone) doc.text(`Tél : ${medecin.telephone}`, colD);

    doc.moveDown(1.5);

    // ── Consultation ─────────────────────────────────────────────────────
    if (consultation?.motif) {
      doc
        .font('Helvetica-Bold').fontSize(9).fillColor(VERT)
        .text('MOTIF DE CONSULTATION');
      doc
        .font('Helvetica').fontSize(9).fillColor(NOIR)
        .text(consultation.motif);
      doc.moveDown(0.5);
    }

    // ── Posologie suggérée ───────────────────────────────────────────────
    if (posologie) {
      const yPoso = doc.y;
      doc.rect(50, yPoso, pageW, 30).fillColor('#E8F5E9').fill();
      doc
        .font('Helvetica-Bold').fontSize(8).fillColor(VERT_FONCE)
        .text('POSOLOGIE RECOMMANDÉE (tranche d\'âge)', 58, yPoso + 6);
      doc
        .font('Helvetica').fontSize(8).fillColor(NOIR)
        .text(posologie.instructions, 58, doc.y + 2);
      doc.moveDown(1);
    }

    // ── Tableau des produits ─────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor(VERT_FONCE).text('PRODUITS PRESCRITS');
    doc.moveDown(0.3);

    // En-têtes tableau
    const cols = { produit: 50, qte: 280, posologie: 330, duree: 430, prix: 490 };
    const yTh = doc.y;
    doc.rect(50, yTh, pageW, 18).fillColor(VERT).fill();
    doc
      .font('Helvetica-Bold').fontSize(8).fillColor('white')
      .text('Produit', cols.produit + 4, yTh + 5)
      .text('Qté', cols.qte, yTh + 5)
      .text('Posologie', cols.posologie, yTh + 5)
      .text('Durée', cols.duree, yTh + 5)
      .text('Prix', cols.prix, yTh + 5);

    doc.y = yTh + 20;

    lignes.forEach((ligne, i) => {
      const yLigne = doc.y;
      if (i % 2 === 0) {
        doc.rect(50, yLigne, pageW, 22).fillColor('#F1F8E9').fill();
      }
      doc
        .font('Helvetica-Bold').fontSize(8).fillColor(NOIR)
        .text(ligne.nom_produit, cols.produit + 4, yLigne + 4, { width: 225 });

      doc.font('Helvetica').fontSize(8).fillColor(NOIR);
      doc.text(String(ligne.quantite), cols.qte, yLigne + 4);
      doc.text(ligne.posologie || '—', cols.posologie, yLigne + 4, { width: 95 });
      doc.text(ligne.duree || '—', cols.duree, yLigne + 4, { width: 55 });
      doc.text(formatMontant(ligne.prix_unitaire * ligne.quantite), cols.prix, yLigne + 4, { width: 55 });

      doc.y = yLigne + 24;
    });

    // Ligne total
    const yTotal = doc.y + 4;
    doc.moveTo(50, yTotal).lineTo(545, yTotal).strokeColor(VERT).lineWidth(1).stroke();
    doc
      .font('Helvetica-Bold').fontSize(9).fillColor(VERT_FONCE)
      .text(`TOTAL : ${formatMontant(ordonnance.montant_total)}`, 50, yTotal + 6, { align: 'right' });

    doc.moveDown(1.5);

    // ── Allergies ────────────────────────────────────────────────────────
    const allergies = typeof patient.allergies === 'string'
      ? JSON.parse(patient.allergies)
      : (patient.allergies || []);
    if (allergies.length > 0) {
      doc
        .font('Helvetica-Bold').fontSize(8).fillColor('#C62828')
        .text('⚠ ALLERGIES CONNUES : ' + allergies.join(', '));
      doc.moveDown(0.5);
    }

    // ── Notes ────────────────────────────────────────────────────────────
    if (ordonnance.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS).text('NOTES :');
      doc.font('Helvetica').fontSize(8).fillColor(NOIR).text(ordonnance.notes);
      doc.moveDown(0.5);
    }

    // ── Pied de page — signature ─────────────────────────────────────────
    const ySign = doc.page.height - 120;
    doc
      .font('Helvetica').fontSize(8).fillColor(GRIS)
      .text(`Signature et cachet du prescripteur`, 350, ySign);
    doc.moveTo(350, ySign + 50).lineTo(540, ySign + 50).strokeColor(GRIS).lineWidth(0.5).stroke();

    doc
      .fontSize(7).fillColor(GRIS)
      .text(
        'ZEZEPAGNON — Dossiers Patients | patients.zezepagnon.solution',
        50,
        doc.page.height - 40,
        { align: 'center', width: pageW }
      );

    doc.end();
  });

module.exports = { genererOrdonnancePDF };
