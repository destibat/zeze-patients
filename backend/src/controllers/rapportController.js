'use strict';

const PDFDocument = require('pdfkit');
const { sequelize, Patient, ParametreCabinet } = require('../models');
const { getCabinetId } = require('../config/cabinetContext');

const PAGE_W = 595;
const ML = 50;
const MR = 50;
const INNER_W = PAGE_W - ML - MR;

const VERT       = '#1B7F4F';
const VERT_FONCE = '#0D5C38';
const GRIS       = '#616161';
const GRIS_CLAIR = '#EEEEEE';
const NOIR       = '#212121';
const BLANC      = '#FFFFFF';

const net = (s) => {
  if (!s) return '';
  return String(s)
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[ÉÈÊË]/g, 'E').replace(/[ÀÂÄÁ]/g, 'A').replace(/[ÎÏÍÌ]/g, 'I')
    .replace(/[ÔÖÓÒ]/g, 'O').replace(/[ÙÛÜÚ]/g, 'U').replace(/[Ç]/g, 'C')
    .replace(/[–—]/g, '-').replace(/['']/g, "'").replace(/[""]/g, '"')
    .replace(/[^\x00-\xFF]/g, '?');
};

const fmt = (n) => {
  if (n == null) return '0';
  return Math.round(Number(n)).toLocaleString('fr-FR').replace(/\s/g, ' ');
};

const fmtMontant = (n) => `${fmt(n)} FCFA`;

const MOIS_FR = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];

// ── Génère le rapport mensuel PDF ─────────────────────────────────────────────
const genererRapportMensuel = async (req, res) => {
  const { mois } = req.query; // format YYYY-MM
  const cabinetId = getCabinetId();

  const maintenant = new Date();
  let annee  = maintenant.getFullYear();
  let moisNum = maintenant.getMonth() + 1;

  if (mois && /^\d{4}-\d{2}$/.test(mois)) {
    [annee, moisNum] = mois.split('-').map(Number);
  }

  const dateDebut = new Date(annee, moisNum - 1, 1);
  const dateFin   = new Date(annee, moisNum, 0, 23, 59, 59);
  const dateDebutStr = dateDebut.toISOString().split('T')[0];
  const dateFinStr   = dateFin.toISOString().split('T')[0];
  const labelMois = `${MOIS_FR[moisNum - 1]} ${annee}`;

  // ── Récupération des données ──────────────────────────────────────────────
  const [
    nomCabinet,
    patientsActifs,
    statsFactures,
    consultations,
    caParJour,
    topProduits,
    repartitionSexe,
    analysesIA,
  ] = await Promise.all([
    ParametreCabinet.findOne({ where: { cle: 'nom_cabinet' } }).then((p) => p?.valeur || 'Cabinet ZEZEPAGNON'),
    Patient.count({ where: { archive: 0 } }),
    sequelize.query(
      `SELECT COUNT(*) AS nb, COALESCE(SUM(montant_total),0) AS facture,
              (SELECT COALESCE(SUM(prix_unitaire),0) FROM declarations_produit
               WHERE DATE(date_declaration) BETWEEN :debut AND :fin AND cabinet_id = :cabinetId) AS encaisse
       FROM factures WHERE date_facture BETWEEN :debut AND :fin AND statut != 'annulee' AND cabinet_id = :cabinetId`,
      { replacements: { debut: dateDebutStr, fin: dateFinStr, cabinetId }, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COUNT(*) AS nb FROM consultations WHERE date_consultation BETWEEN :debut AND :fin AND cabinet_id = :cabinetId`,
      { replacements: { debut: dateDebutStr, fin: dateFinStr, cabinetId }, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT DAY(date_declaration) AS jour, COALESCE(SUM(prix_unitaire),0) AS encaisse
       FROM declarations_produit
       WHERE DATE(date_declaration) BETWEEN :debut AND :fin AND cabinet_id = :cabinetId
       GROUP BY DAY(date_declaration) ORDER BY jour`,
      { replacements: { debut: dateDebutStr, fin: dateFinStr, cabinetId }, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(l.value, '$.nom_produit')) AS nom,
              COALESCE(SUM(JSON_EXTRACT(l.value, '$.quantite')),0) AS qte,
              COALESCE(SUM(JSON_EXTRACT(l.value, '$.prix_unitaire') * JSON_EXTRACT(l.value, '$.quantite')),0) AS ca
       FROM ordonnances o
       JOIN JSON_TABLE(o.lignes, '$[*]' COLUMNS(value JSON PATH '$')) l ON TRUE
       WHERE o.date_ordonnance BETWEEN :debut AND :fin AND o.cabinet_id = :cabinetId AND o.statut != 'annulee'
         AND JSON_UNQUOTE(JSON_EXTRACT(l.value, '$.nom_produit')) IS NOT NULL
       GROUP BY nom ORDER BY qte DESC LIMIT 10`,
      { replacements: { debut: dateDebutStr, fin: dateFinStr, cabinetId }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => []),
    sequelize.query(
      `SELECT sexe, COUNT(*) AS nb FROM patients WHERE archive = 0 AND cabinet_id = :cabinetId GROUP BY sexe`,
      { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COUNT(*) AS nb FROM analyses_biologiques WHERE created_at BETWEEN :debut AND :fin AND analyse_ia_texte IS NOT NULL AND cabinet_id = :cabinetId`,
      { replacements: { debut: dateDebut.toISOString(), fin: dateFin.toISOString(), cabinetId }, type: sequelize.QueryTypes.SELECT }
    ),
  ]);

  const sf   = statsFactures[0] || {};
  const nbConsult   = parseInt(consultations[0]?.nb || 0);
  const nbFactures  = parseInt(sf.nb || 0);
  const caFacture   = Math.round(Number(sf.facture || 0));
  const caEncaisse  = Math.round(Number(sf.encaisse || 0));
  const nbAnalysesIA = parseInt(analysesIA[0]?.nb || 0);
  const dateGen = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Génération PDF ────────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Rapport ${labelMois}` } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-${annee}-${String(moisNum).padStart(2,'0')}.pdf"`);
  doc.pipe(res);

  let y = 30;

  // ── Bandeau titre ─────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 80).fill(VERT_FONCE);
  doc.fillColor(BLANC).fontSize(18).font('Helvetica-Bold')
     .text(net(nomCabinet), ML, 18, { width: INNER_W });
  doc.fontSize(11).font('Helvetica')
     .text(`Rapport mensuel - ${net(labelMois)}`, ML, 42, { width: INNER_W });
  doc.fontSize(8).fillColor('#CCCCCC')
     .text(`Genere le ${net(dateGen)}`, ML, 60, { width: INNER_W });

  y = 100;

  // ── KPI box ──────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Patients actifs',   valeur: fmt(patientsActifs) },
    { label: 'Consultations',     valeur: fmt(nbConsult) },
    { label: 'CA facture',        valeur: fmtMontant(caFacture) },
    { label: 'CA encaisse',       valeur: fmtMontant(caEncaisse) },
    { label: 'Nb factures',       valeur: fmt(nbFactures) },
    { label: 'Analyses IA',       valeur: fmt(nbAnalysesIA) },
  ];

  const kpiW = Math.floor(INNER_W / 3);
  const kpiH = 52;
  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = ML + col * kpiW;
    const ky = y + row * (kpiH + 8);
    doc.rect(x, ky, kpiW - 6, kpiH).fillAndStroke('#F5F5F5', '#DDDDDD');
    doc.fillColor(VERT).fontSize(7).font('Helvetica').text(net(k.label), x + 8, ky + 8, { width: kpiW - 20 });
    doc.fillColor(NOIR).fontSize(13).font('Helvetica-Bold').text(net(k.valeur), x + 8, ky + 19, { width: kpiW - 20 });
  });

  y += 2 * (kpiH + 8) + 16;

  // ── CA par jour (mini chart en barres texte) ──────────────────────────────
  if (caParJour.length > 0) {
    doc.fillColor(VERT_FONCE).fontSize(10).font('Helvetica-Bold')
       .text('Chiffre d\'affaires encaisse par jour', ML, y);
    y += 16;

    const maxCA = Math.max(...caParJour.map((r) => Number(r.encaisse)), 1);
    const barW  = Math.max(4, Math.floor((INNER_W - 2) / dateFin.getDate()));
    const barMaxH = 50;

    caParJour.forEach((r) => {
      const bh = Math.max(2, Math.round((Number(r.encaisse) / maxCA) * barMaxH));
      const bx = ML + (parseInt(r.jour) - 1) * barW;
      const by = y + barMaxH - bh;
      doc.rect(bx, by, barW - 1, bh).fill(VERT);
    });

    y += barMaxH + 4;

    // Légende min/max
    doc.fillColor(GRIS).fontSize(7).font('Helvetica')
       .text(`0`, ML, y)
       .text(net(fmtMontant(maxCA)), ML + INNER_W - 80, y, { width: 80, align: 'right' });
    y += 16;
  }

  // ── Top produits ─────────────────────────────────────────────────────────
  if (topProduits.length > 0) {
    doc.fillColor(VERT_FONCE).fontSize(10).font('Helvetica-Bold')
       .text('Top produits vendus', ML, y);
    y += 14;

    // En-tête tableau
    doc.rect(ML, y, INNER_W, 18).fill(VERT);
    doc.fillColor(BLANC).fontSize(8).font('Helvetica-Bold')
       .text('Produit', ML + 4, y + 5, { width: INNER_W * 0.55 })
       .text('Qte', ML + INNER_W * 0.55, y + 5, { width: 50, align: 'right' })
       .text('CA (FCFA)', ML + INNER_W * 0.55 + 54, y + 5, { width: INNER_W * 0.35, align: 'right' });
    y += 18;

    topProduits.forEach((p, i) => {
      const bg = i % 2 === 0 ? BLANC : GRIS_CLAIR;
      doc.rect(ML, y, INNER_W, 16).fill(bg);
      doc.fillColor(NOIR).fontSize(8).font('Helvetica')
         .text(net(p.nom), ML + 4, y + 4, { width: INNER_W * 0.55 - 4, ellipsis: true })
         .text(fmt(p.qte), ML + INNER_W * 0.55, y + 4, { width: 50, align: 'right' })
         .text(fmt(p.ca), ML + INNER_W * 0.55 + 54, y + 4, { width: INNER_W * 0.35, align: 'right' });
      y += 16;
    });
    y += 12;
  }

  // ── Répartition patients par sexe ─────────────────────────────────────────
  const totalPatientsRep = repartitionSexe.reduce((s, r) => s + parseInt(r.nb), 0);
  if (totalPatientsRep > 0 && y < 700) {
    doc.fillColor(VERT_FONCE).fontSize(10).font('Helvetica-Bold')
       .text('Repartition des patients', ML, y);
    y += 14;

    const labels = { masculin: 'Hommes', feminin: 'Femmes', autre: 'Autre' };
    repartitionSexe.forEach((r) => {
      const pct = Math.round((parseInt(r.nb) / totalPatientsRep) * 100);
      const barW = Math.round((INNER_W - 120) * pct / 100);
      doc.fillColor(NOIR).fontSize(8).font('Helvetica')
         .text(net(labels[r.sexe] || r.sexe), ML, y + 2, { width: 60 });
      doc.rect(ML + 65, y, barW, 12).fill(VERT);
      doc.fillColor(GRIS).text(`${fmt(r.nb)} (${pct}%)`, ML + 70 + barW, y + 2, { width: 80 });
      y += 18;
    });
    y += 8;
  }

  // ── Pied de page ─────────────────────────────────────────────────────────
  doc.rect(0, 800, PAGE_W, 42).fill(VERT_FONCE);
  doc.fillColor(BLANC).fontSize(8).font('Helvetica')
     .text(`GECAM - ${net(nomCabinet)} | Rapport ${net(labelMois)} | genere le ${net(dateGen)}`, ML, 812, { width: INNER_W, align: 'center' });

  doc.end();
};

module.exports = { genererRapportMensuel };
