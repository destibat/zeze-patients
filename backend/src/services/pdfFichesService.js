'use strict';

const PDFDocument = require('pdfkit');

// ── Constantes mise en page A4 ────────────────────────────────────────────────
const ML       = 50;   // marge gauche
const MR       = 50;   // marge droite
const PAGE_W   = 595 - ML - MR;  // largeur utile
const MT       = 50;   // marge haute
const MB       = 50;   // marge basse
const PAGE_H   = 842;

// ── Palette ───────────────────────────────────────────────────────────────────
const VERT        = '#1B7F4F';
const VERT_FONCE  = '#0D5C38';
const BLEU        = '#1565C0';
const ORANGE      = '#E65100';
const GRIS        = '#616161';
const GRIS_CLAIR  = '#BDBDBD';
const NOIR        = '#212121';
const FOND_VERT   = '#E8F5E9';
const FOND_BLEU   = '#E3F2FD';
const FOND_GRIS   = '#F5F5F5';

// ── Utilitaires ───────────────────────────────────────────────────────────────
const fmtMontant = (n) => {
  const entier = Math.round(n ?? 0);
  const str = entier.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return str + ' FCFA';
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const fmtPourcent = (part, total) => {
  if (!total) return '0,0 %';
  return (part / total * 100).toFixed(1).replace('.', ',') + ' %';
};

// ── Filigrane PROVISOIRE ──────────────────────────────────────────────────────
const dessinerFiligrane = (doc, texte = 'PROVISOIRE') => {
  doc.save();
  doc.opacity(0.08);
  doc.fontSize(72).font('Helvetica-Bold').fillColor('#CC0000');
  const textW = doc.widthOfString(texte);
  const x = (595 - textW) / 2;
  const y = (842 - 72) / 2;
  doc.translate(595 / 2, 842 / 2).rotate(-35).translate(-(595 / 2), -(842 / 2));
  doc.text(texte, x, y);
  doc.restore();
};

// ── En-tête commun à toutes les fiches ───────────────────────────────────────
const dessinerEntete = (doc, titre, exercice, infos = {}) => {
  const nomCabinet = infos.nom_cabinet || 'ZEZEPAGNON — Dossiers Patients';
  const adresse = infos.adresse || '';
  let y = MT;

  // Bandeau vert en haut
  doc.rect(0, 0, 595, 6).fill(VERT);

  // Nom structure + adresse
  doc.fontSize(9).font('Helvetica').fillColor(GRIS)
    .text(adresse ? `${nomCabinet} · ${adresse}` : nomCabinet, ML, y, { width: PAGE_W / 2 });

  // Date d'édition (alignée à droite)
  doc.fontSize(9).font('Helvetica').fillColor(GRIS)
    .text(`Édité le ${fmtDate(new Date())}`, ML, y, { width: PAGE_W, align: 'right' });

  y += 18;

  // Titre principal
  doc.fontSize(16).font('Helvetica-Bold').fillColor(VERT_FONCE)
    .text(titre, ML, y, { width: PAGE_W });
  y = doc.y + 4;

  // Numéro exercice
  doc.fontSize(11).font('Helvetica-Bold').fillColor(NOIR)
    .text(`Exercice ${exercice.numero}`, ML, y, { width: PAGE_W });
  y = doc.y + 6;

  // Période
  const dateFin = exercice.date_cloture ? fmtDate(exercice.date_cloture) : "aujourd'hui";
  const duree = exercice.duree_jours != null
    ? ` — ${exercice.duree_jours} jour${exercice.duree_jours > 1 ? 's' : ''}`
    : '';
  doc.fontSize(9).font('Helvetica').fillColor(GRIS)
    .text(`Du ${fmtDate(exercice.date_ouverture)} au ${dateFin}${duree}`, ML, y, { width: PAGE_W });
  y = doc.y + 4;

  // Mention exercice rouvert
  if (exercice.statut === 'rouvert' && exercice.date_reouverture) {
    doc.fontSize(8).font('Helvetica').fillColor(ORANGE)
      .text(`⚠ Exercice rouvert${exercice.rouvreur_nom ? ' par ' + exercice.rouvreur_nom : ''}${exercice.date_reouverture ? ' le ' + fmtDate(exercice.date_reouverture) : ''}`, ML, y, { width: PAGE_W });
    y = doc.y + 4;
  }

  // Ligne de séparation
  y += 4;
  doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(VERT).lineWidth(1.5).stroke();
  y += 10;

  doc.y = y;
  return y;
};

// ── Pied de page commun ───────────────────────────────────────────────────────
const dessinerPiedDePage = (doc, mention = 'Document généré automatiquement') => {
  const y = PAGE_H - MB + 10;
  doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRIS)
    .text(`${mention} — le ${fmtDate(new Date())}`, ML, y + 5, {
      width: PAGE_W, align: 'center',
    });
};

// ── Ligne de tableau bicolore ─────────────────────────────────────────────────
const ligneTableau = (doc, y, cols, valeurs, estTotal = false, fond = null) => {
  const h = estTotal ? 18 : 16;

  if (fond) {
    doc.rect(ML, y, PAGE_W, h).fill(fond);
  } else if (estTotal) {
    doc.rect(ML, y, PAGE_W, h).fill(FOND_VERT);
  }

  const font = estTotal ? 'Helvetica-Bold' : 'Helvetica';
  const taille = estTotal ? 9 : 8.5;

  doc.font(font).fontSize(taille).fillColor(NOIR);
  cols.forEach((col, i) => {
    const opts = { width: col.width, align: col.align || 'left' };
    doc.text(valeurs[i] ?? '', col.x, y + (estTotal ? 5 : 4), opts);
  });

  // Bordure basse fine
  doc.moveTo(ML, y + h).lineTo(ML + PAGE_W, y + h)
    .strokeColor('#E0E0E0').lineWidth(0.3).stroke();

  return y + h;
};

// ── En-tête de section ────────────────────────────────────────────────────────
const titreSection = (doc, texte, couleur = VERT_FONCE) => {
  const y = doc.y + 6;
  doc.rect(ML, y, PAGE_W, 18).fill(couleur);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
    .text(texte, ML + 8, y + 5, { width: PAGE_W - 16 });
  doc.y = y + 22;
};

// ═══════════════════════════════════════════════════════════════════════════════
// FICHE 1 — RÉCAPITULATIF MAPA
// ═══════════════════════════════════════════════════════════════════════════════
const genererFicheMAPAPDF = (exercice, bilan, parrain_nom = '', infos = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Filigrane si provisoire
    if (exercice.statut !== 'cloture') dessinerFiligrane(doc);

    // En-tête
    dessinerEntete(doc, 'FICHE RÉCAPITULATIVE MAPA', exercice, infos);

    // ── Calculs dérivés ──────────────────────────────────────────────────────
    const gain_stockiste_brut = (bilan.commissions_stockistes || 0) + (bilan.commissions_delegues || 0);
    const commission_parrain  = Math.round(gain_stockiste_brut * 0.10);
    const gain_stockiste_net  = gain_stockiste_brut - commission_parrain;
    const net_mapa            = bilan.net_mapa || 0;
    const ca_total            = bilan.ca_total || 0;

    // ── Section 1 : Volume d'activité ────────────────────────────────────────
    titreSection(doc, '1. VOLUME D\'ACTIVITÉ');

    const colsCA = [
      { x: ML + 4,        width: 260, align: 'left'  },
      { x: ML + 265,      width: 80,  align: 'right' },
      { x: ML + 355,      width: 130, align: 'right' },
    ];

    // Entête colonnes
    const yThCA = doc.y;
    doc.rect(ML, yThCA, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    doc.text('Désignation',    colsCA[0].x, yThCA + 3, { width: colsCA[0].width });
    doc.text('Nb',             colsCA[1].x, yThCA + 3, { width: colsCA[1].width, align: 'right' });
    doc.text('Montant',        colsCA[2].x, yThCA + 3, { width: colsCA[2].width, align: 'right' });
    doc.y = yThCA + 16;

    let yRow = doc.y;
    yRow = ligneTableau(doc, yRow, colsCA, [
      'Factures directes (stockiste / secrétaire)',
      `${bilan.nb_factures || 0} facture${(bilan.nb_factures || 0) > 1 ? 's' : ''}`,
      fmtMontant(bilan.ca_factures),
    ], false, FOND_GRIS);

    yRow = ligneTableau(doc, yRow, colsCA, [
      'Ventes délégués (validées)',
      `${bilan.nb_ventes_delegues || 0} vente${(bilan.nb_ventes_delegues || 0) > 1 ? 's' : ''}`,
      fmtMontant(bilan.ca_delegues),
    ]);

    yRow = ligneTableau(doc, yRow, colsCA, [
      'TOTAL VENDU SUR L\'EXERCICE',
      '',
      fmtMontant(ca_total),
    ], true);

    doc.y = yRow + 10;

    // ── Section 2 : Répartition financière ──────────────────────────────────
    titreSection(doc, '2. RÉPARTITION FINANCIÈRE');

    const colsFin = [
      { x: ML + 4,   width: 260, align: 'left'  },
      { x: ML + 265, width: 80,  align: 'right' },
      { x: ML + 355, width: 130, align: 'right' },
    ];

    const yThFin = doc.y;
    doc.rect(ML, yThFin, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    doc.text('Ligne',       colsFin[0].x, yThFin + 3, { width: colsFin[0].width });
    doc.text('% du CA',     colsFin[1].x, yThFin + 3, { width: colsFin[1].width, align: 'right' });
    doc.text('Montant',     colsFin[2].x, yThFin + 3, { width: colsFin[2].width, align: 'right' });
    doc.y = yThFin + 16;

    yRow = doc.y;

    yRow = ligneTableau(doc, yRow, colsFin, [
      'Montant total vendu',
      '100,0 %',
      fmtMontant(ca_total),
    ], false, FOND_GRIS);

    yRow = ligneTableau(doc, yRow, colsFin, [
      'Gain brut stockiste (commissions stockistes + délégués)',
      fmtPourcent(gain_stockiste_brut, ca_total),
      fmtMontant(gain_stockiste_brut),
    ]);

    // Sous-détails du gain brut (en retrait)
    const colsFin2 = [
      { x: ML + 16,  width: 248, align: 'left'  },
      { x: ML + 265, width: 80,  align: 'right' },
      { x: ML + 355, width: 130, align: 'right' },
    ];

    const yDet1 = yRow;
    doc.rect(ML, yDet1, PAGE_W, 14).fill('#FAFAFA');
    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
      .text('dont commissions stockistes (sur factures directes)',
            colsFin2[0].x, yDet1 + 3, { width: colsFin2[0].width });
    doc.text(fmtPourcent(bilan.commissions_stockistes, ca_total),
             colsFin2[1].x, yDet1 + 3, { width: colsFin2[1].width, align: 'right' });
    doc.text(fmtMontant(bilan.commissions_stockistes),
             colsFin2[2].x, yDet1 + 3, { width: colsFin2[2].width, align: 'right' });
    doc.moveTo(ML, yDet1 + 14).lineTo(ML + PAGE_W, yDet1 + 14)
      .strokeColor('#E0E0E0').lineWidth(0.3).stroke();
    yRow = yDet1 + 14;

    const yDet2 = yRow;
    doc.rect(ML, yDet2, PAGE_W, 14).fill('#FAFAFA');
    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
      .text('dont commissions délégués (ventes directes)',
            colsFin2[0].x, yDet2 + 3, { width: colsFin2[0].width });
    doc.text(fmtPourcent(bilan.commissions_delegues, ca_total),
             colsFin2[1].x, yDet2 + 3, { width: colsFin2[1].width, align: 'right' });
    doc.text(fmtMontant(bilan.commissions_delegues),
             colsFin2[2].x, yDet2 + 3, { width: colsFin2[2].width, align: 'right' });
    doc.moveTo(ML, yDet2 + 14).lineTo(ML + PAGE_W, yDet2 + 14)
      .strokeColor('#E0E0E0').lineWidth(0.3).stroke();
    yRow = yDet2 + 14;

    // Commission parrain
    const parrainLabel = parrain_nom
      ? `Commission parrain — ${parrain_nom} (10% du gain brut)`
      : 'Commission parrain (10% du gain brut)';

    yRow = ligneTableau(doc, yRow, colsFin, [
      parrainLabel,
      fmtPourcent(commission_parrain, ca_total),
      fmtMontant(commission_parrain),
    ], false, '#FFF3E0');

    yRow = ligneTableau(doc, yRow, colsFin, [
      'Bénéfice net stockiste (gain brut − commission parrain)',
      fmtPourcent(gain_stockiste_net, ca_total),
      fmtMontant(gain_stockiste_net),
    ]);

    // Ligne MAPA — mise en évidence
    doc.y = yRow + 4;
    const yMapa = doc.y;
    doc.rect(ML, yMapa, PAGE_W, 22).fill(VERT_FONCE);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
      .text('MONTANT TOTAL VERSÉ À MAPA', ML + 8, yMapa + 6, { width: PAGE_W - 160 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
      .text(fmtMontant(net_mapa), ML + 8, yMapa + 6, {
        width: PAGE_W - 16, align: 'right',
      });
    doc.y = yMapa + 26;

    // Note de cohérence
    doc.fontSize(7.5).font('Helvetica').fillColor(GRIS)
      .text(
        `Vérification : CA total (${fmtMontant(ca_total)}) = Gain brut stockiste (${fmtMontant(gain_stockiste_brut)}) + Montant MAPA (${fmtMontant(net_mapa)})`,
        ML, doc.y + 4, { width: PAGE_W }
      );

    // ── Section 3 : Détail par stockiste ────────────────────────────────────
    if (bilan.par_stockiste?.length > 0) {
      doc.y = doc.y + 10;
      titreSection(doc, '3. DÉTAIL PAR STOCKISTE');

      const colsSt = [
        { x: ML + 4,   width: 150, align: 'left'  },
        { x: ML + 158, width: 50,  align: 'right' },
        { x: ML + 212, width: 80,  align: 'right' },
        { x: ML + 296, width: 80,  align: 'right' },
        { x: ML + 380, width: 105, align: 'right' },
      ];

      const yThSt = doc.y;
      doc.rect(ML, yThSt, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
      ['Stockiste', 'Taux', 'CA généré', 'Commission', 'Part MAPA générée'].forEach((h, i) => {
        doc.text(h, colsSt[i].x, yThSt + 3, { width: colsSt[i].width, align: colsSt[i].align });
      });
      doc.y = yThSt + 16;

      yRow = doc.y;
      bilan.par_stockiste.forEach((st, i) => {
        yRow = ligneTableau(doc, yRow, colsSt, [
          st.nom,
          `${st.taux} %`,
          fmtMontant(st.ca_factures + st.ca_delegues),
          fmtMontant(st.commission_totale),
          fmtMontant(st.part_mapa_generee),
        ], false, i % 2 === 0 ? FOND_GRIS : null);
      });

      doc.y = yRow;
    }

    // ── Zone signature ───────────────────────────────────────────────────────
    const ySign = PAGE_H - MB - 55;
    if (doc.y < ySign) {
      doc.y = ySign;
      doc.moveTo(ML, ySign).lineTo(ML + PAGE_W, ySign)
        .strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();

      doc.fontSize(8).font('Helvetica').fillColor(GRIS)
        .text('Signature et cachet', ML + 20, ySign + 8, { width: 120, align: 'center' });
      doc.moveTo(ML + 20, ySign + 40).lineTo(ML + 140, ySign + 40)
        .strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();

      doc.fontSize(8).font('Helvetica').fillColor(GRIS)
        .text('Lu et approuvé', ML + PAGE_W - 140, ySign + 8, { width: 120, align: 'center' });
      doc.moveTo(ML + PAGE_W - 140, ySign + 40).lineTo(ML + PAGE_W - 20, ySign + 40)
        .strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();
    }

    dessinerPiedDePage(doc);
    doc.end();
  });


// ═══════════════════════════════════════════════════════════════════════════════
// FICHE 1 BIS — DÉTAIL DES PRODUITS VENDUS
// ═══════════════════════════════════════════════════════════════════════════════
const genererDetailProduitsPDF = (exercice, bilan, infos = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (exercice.statut !== 'cloture') dessinerFiligrane(doc);

    dessinerEntete(doc, 'DÉTAIL DES PRODUITS VENDUS', exercice, infos);

    const produits = [...(bilan.top_produits || [])].sort((a, b) => b.ca - a.ca);
    const ca_total = bilan.ca_total || 0;
    const qte_total = produits.reduce((s, p) => s + (p.quantite || 0), 0);

    titreSection(doc, 'PRODUITS VENDUS SUR L\'EXERCICE (triés par CA décroissant)');

    const cols = [
      { x: ML + 4,   width: 205, align: 'left'  },
      { x: ML + 213, width: 70,  align: 'right' },
      { x: ML + 287, width: 80,  align: 'right' },
      { x: ML + 371, width: 114, align: 'right' },
    ];

    const yTh = doc.y;
    doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    ['Produit', 'Quantité vendue', '% du CA', 'Montant (CA)'].forEach((h, i) => {
      doc.text(h, cols[i].x, yTh + 3, { width: cols[i].width, align: cols[i].align });
    });
    doc.y = yTh + 16;

    let yRow = doc.y;
    produits.forEach((p, i) => {
      // Nouvelle page si nécessaire
      if (yRow > PAGE_H - MB - 60) {
        dessinerPiedDePage(doc);
        doc.addPage();
        if (exercice.statut !== 'cloture') dessinerFiligrane(doc);
        doc.rect(0, 0, 595, 6).fill(VERT);
        doc.y = MT + 10;
        yRow = doc.y;

        doc.rect(ML, yRow, PAGE_W, 14).fill('#CFD8DC');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
        ['Produit', 'Quantité vendue', '% du CA', 'Montant (CA)'].forEach((h, j) => {
          doc.text(h, cols[j].x, yRow + 3, { width: cols[j].width, align: cols[j].align });
        });
        yRow += 16;
        doc.y = yRow;
      }

      yRow = ligneTableau(doc, yRow, cols, [
        p.nom,
        `${p.quantite}`,
        fmtPourcent(p.ca, ca_total),
        fmtMontant(p.ca),
      ], false, i % 2 === 0 ? FOND_GRIS : null);
    });

    // Ligne total
    yRow = ligneTableau(doc, yRow, cols, [
      `TOTAL (${produits.length} produit${produits.length > 1 ? 's' : ''})`,
      `${qte_total}`,
      '100,0 %',
      fmtMontant(ca_total),
    ], true);

    doc.y = yRow + 8;
    doc.fontSize(7.5).font('Helvetica').fillColor(GRIS)
      .text(
        `Le total correspond au CA global de l'exercice (${fmtMontant(ca_total)}).`,
        ML, doc.y, { width: PAGE_W }
      );

    dessinerPiedDePage(doc);
    doc.end();
  });


// ═══════════════════════════════════════════════════════════════════════════════
// FICHE 2 — RÉCAPITULATIF DÉLÉGUÉS
// ═══════════════════════════════════════════════════════════════════════════════
const genererRecapDeleguesPDF = (exercice, bilan, infos = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (exercice.statut !== 'cloture') dessinerFiligrane(doc);

    dessinerEntete(doc, 'RÉCAPITULATIF DÉLÉGUÉS', exercice, infos);

    const delegues = [...(bilan.par_delegue || [])].sort(
      (a, b) => b.gain_delegue - a.gain_delegue
    );
    const ca_delegues  = bilan.ca_delegues || 0;
    const comm_total   = bilan.commissions_delegues || 0;
    const nb_actifs    = delegues.length;

    // Résumé haut de page
    const yRes = doc.y;
    doc.rect(ML, yRes, PAGE_W, 40).fill(FOND_BLEU);
    doc.rect(ML, yRes, PAGE_W / 2 - 4, 40).strokeColor('#90CAF9').lineWidth(0).stroke();

    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
      .text('Montant total vendu par les délégués', ML + 8, yRes + 6, { width: PAGE_W / 2 - 16 });
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BLEU)
      .text(fmtMontant(ca_delegues), ML + 8, yRes + 18, { width: PAGE_W / 2 - 16 });

    doc.fontSize(8).font('Helvetica').fillColor(GRIS)
      .text(`Délégués actifs sur l'exercice`, ML + PAGE_W / 2 + 8, yRes + 6, { width: PAGE_W / 2 - 16 });
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BLEU)
      .text(`${nb_actifs} délégué${nb_actifs > 1 ? 's' : ''}`, ML + PAGE_W / 2 + 8, yRes + 18, { width: PAGE_W / 2 - 16 });

    doc.y = yRes + 48;

    titreSection(doc, 'DÉTAIL PAR DÉLÉGUÉ (triés par commission décroissante)');

    const cols = [
      { x: ML + 4,   width: 140, align: 'left'  },
      { x: ML + 148, width: 75,  align: 'right' },
      { x: ML + 227, width: 80,  align: 'right' },
      { x: ML + 311, width: 80,  align: 'right' },
      { x: ML + 395, width: 90,  align: 'right' },
    ];

    const yTh = doc.y;
    doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    ['Délégué', 'Nb ventes', 'Total ventes', 'Commission', '% du CA délégués'].forEach((h, i) => {
      doc.text(h, cols[i].x, yTh + 3, { width: cols[i].width, align: cols[i].align });
    });
    doc.y = yTh + 16;

    let yRow = doc.y;
    delegues.forEach((d, i) => {
      yRow = ligneTableau(doc, yRow, cols, [
        d.nom,
        `${d.nb_ventes}`,
        fmtMontant(d.ca),
        fmtMontant(d.gain_delegue),
        fmtPourcent(d.ca, ca_delegues),
      ], false, i % 2 === 0 ? FOND_GRIS : null);
    });

    yRow = ligneTableau(doc, yRow, cols, [
      `TOTAL (${nb_actifs} délégué${nb_actifs > 1 ? 's' : ''})`,
      '',
      fmtMontant(ca_delegues),
      fmtMontant(comm_total),
      '100,0 %',
    ], true);

    doc.y = yRow;
    dessinerPiedDePage(doc);
    doc.end();
  });


// ═══════════════════════════════════════════════════════════════════════════════
// FICHE 3 — BILAN INDIVIDUEL DÉLÉGUÉ
// ═══════════════════════════════════════════════════════════════════════════════
const genererBilanIndividuelPDF = (exercice, delegue, ventesDetail, infos = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (exercice.statut !== 'cloture') dessinerFiligrane(doc);

    // ── En-tête personnalisé ─────────────────────────────────────────────────
    const nomCabinet = infos.nom_cabinet || 'ZEZEPAGNON — Dossiers Patients';
    const adresseCabinet = infos.adresse || '';
    doc.rect(0, 0, 595, 6).fill(VERT);
    let y = MT;

    const enteteGauche = adresseCabinet ? `${nomCabinet} · ${adresseCabinet}` : nomCabinet;
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
      .text(enteteGauche, ML, y, { width: PAGE_W / 2 });
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
      .text(`Édité le ${fmtDate(new Date())}`, ML, y, { width: PAGE_W, align: 'right' });
    y += 18;

    doc.fontSize(16).font('Helvetica-Bold').fillColor(VERT_FONCE)
      .text('BILAN PERSONNEL', ML, y, { width: PAGE_W });
    y = doc.y + 4;

    doc.fontSize(12).font('Helvetica-Bold').fillColor(NOIR)
      .text(`${delegue.prenom} ${delegue.nom}`, ML, y, { width: PAGE_W });
    y = doc.y + 4;

    const dateFin = exercice.date_cloture ? fmtDate(exercice.date_cloture) : "aujourd'hui";
    const duree = exercice.duree_jours != null
      ? ` — ${exercice.duree_jours} jour${exercice.duree_jours > 1 ? 's' : ''}`
      : '';
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
      .text(
        `Exercice ${exercice.numero} · Du ${fmtDate(exercice.date_ouverture)} au ${dateFin}${duree}`,
        ML, y, { width: PAGE_W }
      );
    y = doc.y + 4;

    // Mention exercice rouvert
    if (exercice.statut === 'rouvert') {
      doc.fontSize(8).font('Helvetica').fillColor(ORANGE)
        .text('⚠ Cet exercice a été rouvert après clôture', ML, y, { width: PAGE_W });
      y = doc.y + 4;
    }

    y += 4;
    doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(VERT).lineWidth(1.5).stroke();
    doc.y = y + 10;

    // ── Synthèse en haut bien visible ────────────────────────────────────────
    const ventes      = ventesDetail.filter((v) => v.statut === 'valide');
    const nb_ventes   = ventes.length;
    const total_ventes = ventes.reduce((s, v) => s + (v.montant_total || 0), 0);
    const total_commission = ventes.reduce((s, v) => s + (v.gain_delegue || 0), 0);

    const ySynth = doc.y;
    const wBloc = (PAGE_W - 8) / 3;

    [
      { label: 'Total de tes ventes', val: fmtMontant(total_ventes), col: VERT_FONCE },
      { label: 'Ta commission (15 %)', val: fmtMontant(total_commission), col: BLEU },
      { label: 'Nombre de ventes', val: `${nb_ventes}`, col: '#6A1B9A' },
    ].forEach((bloc, i) => {
      const xBloc = ML + i * (wBloc + 4);
      doc.rect(xBloc, ySynth, wBloc, 44).fill(bloc.col);
      doc.fontSize(8).font('Helvetica').fillColor('white')
        .text(bloc.label, xBloc + 6, ySynth + 6, { width: wBloc - 12, align: 'center' });
      doc.fontSize(13).font('Helvetica-Bold').fillColor('white')
        .text(bloc.val, xBloc + 6, ySynth + 18, { width: wBloc - 12, align: 'center' });
    });

    doc.y = ySynth + 52;

    // ── Tableau détaillé des ventes ─────────────────────────────────────────
    doc.moveDown(0.5);
    titreSection(doc, 'DÉTAIL DE TES VENTES');

    const cols = [
      { x: ML + 4,   width: 60,  align: 'left'  },
      { x: ML + 68,  width: 95,  align: 'left'  },
      { x: ML + 167, width: 110, align: 'left'  },
      { x: ML + 281, width: 40,  align: 'right' },
      { x: ML + 325, width: 80,  align: 'right' },
      { x: ML + 409, width: 76,  align: 'right' },
    ];

    const yTh = doc.y;
    doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    ['Date', 'Client', 'Produit(s)', 'Qté', 'Montant', 'Commission'].forEach((h, i) => {
      doc.text(h, cols[i].x, yTh + 3, { width: cols[i].width, align: cols[i].align });
    });
    doc.y = yTh + 16;

    let yRow = doc.y;

    ventes.sort((a, b) => new Date(a.date_mouvement) - new Date(b.date_mouvement));

    ventes.forEach((v, idx) => {
      let lignes = v.lignes;
      if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
      if (!Array.isArray(lignes)) lignes = [];

      const produitStr = lignes.map((l) => `${l.nom_produit || l.nom || '?'}`).join(', ');
      const qteStr = lignes.map((l) => String(l.quantite || 1)).join(', ');
      const dateStr = v.date_mouvement
        ? new Date(v.date_mouvement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        : '—';

      // Nouvelle page si nécessaire
      if (yRow > PAGE_H - MB - 70) {
        dessinerPiedDePage(doc, 'Document personnel — à conserver');
        doc.addPage();
        if (exercice.statut !== 'cloture') dessinerFiligrane(doc);
        doc.rect(0, 0, 595, 6).fill(VERT);
        doc.y = MT + 10;
        yRow = doc.y;

        doc.rect(ML, yRow, PAGE_W, 14).fill('#CFD8DC');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
        ['Date', 'Client', 'Produit(s)', 'Qté', 'Montant', 'Commission'].forEach((h, i) => {
          doc.text(h, cols[i].x, yRow + 3, { width: cols[i].width, align: cols[i].align });
        });
        yRow += 16;
        doc.y = yRow;
      }

      yRow = ligneTableau(doc, yRow, cols, [
        dateStr,
        v.client_nom || '—',
        produitStr,
        qteStr,
        fmtMontant(v.montant_total),
        fmtMontant(v.gain_delegue),
      ], false, idx % 2 === 0 ? FOND_GRIS : null);
    });

    // Ligne total
    yRow = ligneTableau(doc, yRow, cols, [
      'TOTAL',
      '',
      '',
      '',
      fmtMontant(total_ventes),
      fmtMontant(total_commission),
    ], true);

    doc.y = yRow;
    dessinerPiedDePage(doc, 'Document personnel — à conserver');
    doc.end();
  });


module.exports = {
  genererFicheMAPAPDF,
  genererDetailProduitsPDF,
  genererRecapDeleguesPDF,
  genererBilanIndividuelPDF,
};
