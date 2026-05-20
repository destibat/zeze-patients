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
  const y = PAGE_H - MB - 22;
  doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(GRIS_CLAIR).lineWidth(0.5).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRIS)
    .text(`${mention} — le ${fmtDate(new Date())}`, ML, y + 5, {
      width: PAGE_W, align: 'center', lineBreak: false,
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
    // gain brut = commissions stockistes + délégués (ligne délégué non affichée, mais incluse dans le total)
    const gain_stockiste_brut = (bilan.commissions_stockistes || 0) + (bilan.commissions_delegues || 0);
    const commission_parrain  = Math.round(gain_stockiste_brut * 0.10);
    const gain_stockiste_net  = gain_stockiste_brut - commission_parrain;
    const ca_total            = bilan.ca_total || 0;
    const net_mapa            = bilan.net_mapa || 0;

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
      'TOTAL VENDU SUR L\'EXERCICE',
      `${(bilan.nb_factures || 0) + (bilan.nb_ventes_delegues || 0)} vente${((bilan.nb_factures || 0) + (bilan.nb_ventes_delegues || 0)) > 1 ? 's' : ''}`,
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
      'Bénéfice brut stockiste',
      fmtPourcent(gain_stockiste_brut, ca_total),
      fmtMontant(gain_stockiste_brut),
    ]);

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

    // ── Section 3 : Détail des produits vendus (payés uniquement) ───────────
    {
      const produits = [...(bilan.top_produits || [])].sort((a, b) => b.ca - a.ca);
      if (produits.length > 0) {
        const qte_total_prod = produits.reduce((s, p) => s + (p.quantite || 0), 0);
        const ca_produits    = produits.reduce((s, p) => s + (p.ca || 0), 0);

        // Nouvelle page si pas assez de place pour l'en-tête + 3 lignes mini
        if (doc.y > PAGE_H - MB - 100) {
          dessinerPiedDePage(doc);
          doc.addPage();
          if (exercice.statut !== 'cloture') dessinerFiligrane(doc);
          doc.rect(0, 0, 595, 6).fill(VERT);
          doc.y = MT + 10;
        } else {
          doc.y = doc.y + 10;
        }

        titreSection(doc, '3. PRODUITS VENDUS (payés uniquement, triés par CA décroissant)');

        const colsProd = [
          { x: ML + 4,   width: 205, align: 'left'  },
          { x: ML + 213, width: 70,  align: 'right' },
          { x: ML + 287, width: 80,  align: 'right' },
          { x: ML + 371, width: 114, align: 'right' },
        ];

        const yThProd = doc.y;
        doc.rect(ML, yThProd, PAGE_W, 14).fill('#CFD8DC');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
        ['Produit', 'Quantité', '% du CA', 'Montant (CA)'].forEach((h, i) => {
          doc.text(h, colsProd[i].x, yThProd + 3, { width: colsProd[i].width, align: colsProd[i].align });
        });
        doc.y = yThProd + 16;

        let yProd = doc.y;
        produits.forEach((p, i) => {
          if (yProd > PAGE_H - MB - 60) {
            dessinerPiedDePage(doc);
            doc.addPage();
            if (exercice.statut !== 'cloture') dessinerFiligrane(doc);
            doc.rect(0, 0, 595, 6).fill(VERT);
            doc.y = MT + 10;
            yProd = doc.y;
            doc.rect(ML, yProd, PAGE_W, 14).fill('#CFD8DC');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
            ['Produit', 'Quantité', '% du CA', 'Montant (CA)'].forEach((h, j) => {
              doc.text(h, colsProd[j].x, yProd + 3, { width: colsProd[j].width, align: colsProd[j].align });
            });
            yProd += 16;
            doc.y = yProd;
          }
          yProd = ligneTableau(doc, yProd, colsProd, [
            p.nom,
            `${p.quantite}`,
            fmtPourcent(p.ca, ca_produits),
            fmtMontant(p.ca),
          ], false, i % 2 === 0 ? FOND_GRIS : null);
        });

        yProd = ligneTableau(doc, yProd, colsProd, [
          `TOTAL (${produits.length} produit${produits.length > 1 ? 's' : ''})`,
          `${qte_total_prod}`,
          '100,0 %',
          fmtMontant(ca_produits),
        ], true);

        doc.y = yProd + 4;
      }
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
const genererBilanIndividuelPDF = (exercice, delegue, achats, ventes, stock = [], infos = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (exercice.statut !== 'cloture') dessinerFiligrane(doc);

    // ── En-tête ──────────────────────────────────────────────────────────────
    const nomCabinet    = infos.nom_cabinet || 'ZEZEPAGNON — Dossiers Patients';
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
    const duree   = exercice.duree_jours != null
      ? ` — ${exercice.duree_jours} jour${exercice.duree_jours > 1 ? 's' : ''}` : '';
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
      .text(`Exercice ${exercice.numero} · Du ${fmtDate(exercice.date_ouverture)} au ${dateFin}${duree}`, ML, y, { width: PAGE_W });
    y = doc.y + 4;

    if (exercice.statut === 'rouvert') {
      doc.fontSize(8).font('Helvetica').fillColor(ORANGE)
        .text('⚠ Cet exercice a été rouvert après clôture', ML, y, { width: PAGE_W });
      y = doc.y + 4;
    }

    y += 4;
    doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(VERT).lineWidth(1.5).stroke();
    doc.y = y + 10;

    // ── Calculs synthèse ─────────────────────────────────────────────────────
    const tauxDelegue = parseFloat(delegue.commission_rate ?? 15);
    const totalAchats = achats.reduce((s, a) => s + (a.montant_total || 0), 0);
    const commAchats  = achats.reduce((s, a) => s + (a.gain_delegue  || 0), 0);
    const validVentes = ventes.filter((v) => v.statut === 'valide');
    const totalVentes = validVentes.reduce((s, v) => s + (v.montant_total || 0), 0);
    const commVentes  = validVentes.reduce((s, v) => s + (v.gain_delegue  || 0), 0);
    const commTotale  = commAchats + commVentes;

    // ── 4 blocs KPI ──────────────────────────────────────────────────────────
    const ySynth = doc.y;
    const wBloc  = (PAGE_W - 12) / 4;

    [
      { label: 'Achats appro',                         val: fmtMontant(totalAchats), col: VERT_FONCE },
      { label: `Commission achats (${tauxDelegue} %)`, val: fmtMontant(commAchats),  col: BLEU       },
      { label: 'Ventes directes',                      val: fmtMontant(totalVentes), col: '#1A237E'  },
      { label: `Commission ventes (${tauxDelegue} %)`, val: fmtMontant(commVentes),  col: '#6A1B9A'  },
    ].forEach((bloc, i) => {
      const xBloc = ML + i * (wBloc + 4);
      doc.rect(xBloc, ySynth, wBloc, 46).fill(bloc.col);
      doc.fontSize(7.5).font('Helvetica').fillColor('white')
        .text(bloc.label, xBloc + 4, ySynth + 6, { width: wBloc - 8, align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('white')
        .text(bloc.val, xBloc + 4, ySynth + 22, { width: wBloc - 8, align: 'center' });
    });

    doc.y = ySynth + 54;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(VERT_FONCE)
      .text(`Commission totale : ${fmtMontant(commTotale)}`, ML, doc.y, { width: PAGE_W, align: 'right' });
    doc.y = doc.y + 10;

    // ── Utilitaires internes ─────────────────────────────────────────────────
    const parseLignes = (raw) => {
      if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
      return Array.isArray(raw) ? raw : [];
    };

    const fmtDateCourt = (d) => d
      ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : '—';

    const sautDePage = (cols, headers) => {
      dessinerPiedDePage(doc, 'Document personnel — à conserver');
      doc.addPage();
      if (exercice.statut !== 'cloture') dessinerFiligrane(doc);
      doc.rect(0, 0, 595, 6).fill(VERT);
      doc.y = MT + 10;
      const yH = doc.y;
      doc.rect(ML, yH, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
      headers.forEach((h, i) => {
        doc.text(h, cols[i].x, yH + 3, { width: cols[i].width, align: cols[i].align });
      });
      doc.y = yH + 16;
      return doc.y;
    };

    // ── Section ACHATS APPRO ─────────────────────────────────────────────────
    doc.moveDown(0.5);
    titreSection(doc, 'ACHATS APPRO (approvisionnements et commandes validées)');

    const colsAchats  = [
      { x: ML + 4,   width: 52,  align: 'left'  },  // Date
      { x: ML + 60,  width: 205, align: 'left'  },  // Produit
      { x: ML + 269, width: 30,  align: 'right' },  // Qté
      { x: ML + 303, width: 82,  align: 'right' },  // Prix unit.
      { x: ML + 389, width: 96,  align: 'right' },  // Montant
    ];
    const hdrsAchats = ['Date', 'Produit', 'Qté', 'Prix unit.', 'Montant'];

    let yTh = doc.y;
    doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    hdrsAchats.forEach((h, i) => {
      doc.text(h, colsAchats[i].x, yTh + 3, { width: colsAchats[i].width, align: colsAchats[i].align });
    });
    doc.y = yTh + 16;
    let yRow = doc.y;

    achats.sort((a, b) => new Date(a.date_mouvement) - new Date(b.date_mouvement));

    achats.forEach((a, idx) => {
      const lignes  = parseLignes(a.lignes);
      const rows    = lignes.length > 0 ? lignes : [{}];
      const dateStr = fmtDateCourt(a.date_mouvement);
      const fond    = idx % 2 === 0 ? FOND_GRIS : null;

      rows.forEach((l, li) => {
        if (yRow > PAGE_H - MB - 40) yRow = sautDePage(colsAchats, hdrsAchats);
        const montantLigne = (l.prix_unitaire != null && l.quantite != null)
          ? Math.round((l.prix_unitaire || 0) * (l.quantite || 0))
          : a.montant_total;
        yRow = ligneTableau(doc, yRow, colsAchats, [
          li === 0 ? dateStr : '',
          l.nom_produit || l.nom || '—',
          l.quantite    != null ? String(l.quantite)      : '—',
          l.prix_unitaire != null ? fmtMontant(l.prix_unitaire) : '—',
          fmtMontant(montantLigne),
        ], false, fond);
      });
    });

    if (yRow > PAGE_H - MB - 20) yRow = sautDePage(colsAchats, hdrsAchats);
    yRow = ligneTableau(doc, yRow, colsAchats, [
      'TOTAL',
      `${achats.length} achat${achats.length !== 1 ? 's' : ''} — Commission : ${fmtMontant(commAchats)}`,
      '', '',
      fmtMontant(totalAchats),
    ], true);

    doc.y = yRow + 8;

    // ── Section VENTES DIRECTES (si existantes) ──────────────────────────────
    if (validVentes.length > 0) {
      doc.moveDown(0.5);
      titreSection(doc, 'VENTES DIRECTES (depuis stock personnel)', BLEU);

      const colsVentes = [
        { x: ML + 4,   width: 52,  align: 'left'  },  // Date
        { x: ML + 60,  width: 100, align: 'left'  },  // Client
        { x: ML + 164, width: 155, align: 'left'  },  // Produit
        { x: ML + 323, width: 30,  align: 'right' },  // Qté
        { x: ML + 357, width: 72,  align: 'right' },  // Montant
        { x: ML + 433, width: 52,  align: 'right' },  // Comm.
      ];
      const hdrsVentes = ['Date', 'Client', 'Produit', 'Qté', 'Montant', 'Comm.'];

      yTh = doc.y;
      doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
      hdrsVentes.forEach((h, i) => {
        doc.text(h, colsVentes[i].x, yTh + 3, { width: colsVentes[i].width, align: colsVentes[i].align });
      });
      doc.y = yTh + 16;
      yRow = doc.y;

      validVentes.sort((a, b) => new Date(a.date_mouvement) - new Date(b.date_mouvement));

      validVentes.forEach((v, idx) => {
        const lignes  = parseLignes(v.lignes);
        const rows    = lignes.length > 0 ? lignes : [{}];
        const dateStr = fmtDateCourt(v.date_mouvement);
        const fond    = idx % 2 === 0 ? FOND_GRIS : null;

        rows.forEach((l, li) => {
          if (yRow > PAGE_H - MB - 40) yRow = sautDePage(colsVentes, hdrsVentes);
          const isLast = li === rows.length - 1;
          yRow = ligneTableau(doc, yRow, colsVentes, [
            li === 0 ? dateStr : '',
            li === 0 ? (v.client_nom || '—') : '',
            l.nom_produit || l.nom || '—',
            l.quantite != null ? String(l.quantite) : '—',
            isLast ? fmtMontant(v.montant_total) : '',
            isLast ? fmtMontant(v.gain_delegue || 0) : '',
          ], false, fond);
        });
      });

      if (yRow > PAGE_H - MB - 20) yRow = sautDePage(colsVentes, hdrsVentes);
      yRow = ligneTableau(doc, yRow, colsVentes, [
        `TOTAL (${validVentes.length} vente${validVentes.length !== 1 ? 's' : ''})`,
        '', '', '',
        fmtMontant(totalVentes),
        fmtMontant(commVentes),
      ], true);

      doc.y = yRow;
    }

    // ── Section STOCK ACTUEL ─────────────────────────────────────────────────
    if (stock.length > 0) {
      const valeurStockTotal  = stock.reduce((s, p) => s + p.valeur_totale, 0);
      const nbProduitsStock   = stock.reduce((s, p) => s + p.quantite, 0);

      doc.y = (doc.y ?? yRow) + 6;
      doc.moveDown(0.5);
      titreSection(doc, 'STOCK ACTUEL (produits en ta possession)', '#37474F');

      // Ligne de résumé
      doc.fontSize(9).font('Helvetica').fillColor(NOIR)
        .text(
          `${stock.length} référence${stock.length > 1 ? 's' : ''} · ${nbProduitsStock} unité${nbProduitsStock > 1 ? 's' : ''} · Valeur totale estimée : `,
          ML, doc.y, { continued: true }
        );
      doc.font('Helvetica-Bold').fillColor(VERT_FONCE)
        .text(fmtMontant(valeurStockTotal));
      doc.y = doc.y + 6;

      const colsStock = [
        { x: ML + 4,   width: 250, align: 'left'  },  // Produit
        { x: ML + 258, width: 70,  align: 'right' },  // Qté en stock
        { x: ML + 332, width: 90,  align: 'right' },  // Prix catalogue
        { x: ML + 426, width: 59,  align: 'right' },  // Valeur totale
      ];
      const hdrsStock = ['Produit', 'Qté en stock', 'Prix catalogue', 'Valeur'];

      const yThS = doc.y;
      doc.rect(ML, yThS, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
      hdrsStock.forEach((h, i) => {
        doc.text(h, colsStock[i].x, yThS + 3, { width: colsStock[i].width, align: colsStock[i].align });
      });
      doc.y = yThS + 16;
      yRow = doc.y;

      stock.forEach((p, idx) => {
        if (yRow > PAGE_H - MB - 40) yRow = sautDePage(colsStock, hdrsStock);
        yRow = ligneTableau(doc, yRow, colsStock, [
          p.nom,
          String(p.quantite),
          fmtMontant(p.prix_unitaire),
          fmtMontant(p.valeur_totale),
        ], false, idx % 2 === 0 ? FOND_GRIS : null);
      });

      if (yRow > PAGE_H - MB - 20) yRow = sautDePage(colsStock, hdrsStock);
      yRow = ligneTableau(doc, yRow, colsStock, [
        `TOTAL (${stock.length} référence${stock.length > 1 ? 's' : ''})`,
        String(nbProduitsStock),
        '',
        fmtMontant(valeurStockTotal),
      ], true);

      doc.y = yRow;
    }

    dessinerPiedDePage(doc, 'Document personnel — à conserver');
    doc.end();
  });


// ═══════════════════════════════════════════════════════════════════════════════
// FICHE 4 — BILAN PERSONNEL STOCKISTE
// ═══════════════════════════════════════════════════════════════════════════════
const genererBilanStockistePDF = (exercice, stockiste, factures, resumeAppros, infos = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (exercice.statut !== 'cloture') dessinerFiligrane(doc);

    // ── En-tête ──────────────────────────────────────────────────────────────
    const nomCabinet    = infos.nom_cabinet || 'ZEZEPAGNON — Dossiers Patients';
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
      .text('BILAN PERSONNEL — STOCKISTE', ML, y, { width: PAGE_W });
    y = doc.y + 4;

    doc.fontSize(12).font('Helvetica-Bold').fillColor(NOIR)
      .text(`${stockiste.prenom} ${stockiste.nom}`, ML, y, { width: PAGE_W });
    y = doc.y + 4;

    const dateFin = exercice.date_cloture ? fmtDate(exercice.date_cloture) : "aujourd'hui";
    const duree   = exercice.duree_jours != null
      ? ` — ${exercice.duree_jours} jour${exercice.duree_jours > 1 ? 's' : ''}` : '';
    doc.fontSize(9).font('Helvetica').fillColor(GRIS)
      .text(`Exercice ${exercice.numero} · Du ${fmtDate(exercice.date_ouverture)} au ${dateFin}${duree}`, ML, y, { width: PAGE_W });
    y = doc.y + 4;

    if (exercice.statut === 'rouvert') {
      doc.fontSize(8).font('Helvetica').fillColor(ORANGE)
        .text('⚠ Cet exercice a été rouvert après clôture', ML, y, { width: PAGE_W });
      y = doc.y + 4;
    }

    y += 4;
    doc.moveTo(ML, y).lineTo(ML + PAGE_W, y).strokeColor(VERT).lineWidth(1.5).stroke();
    doc.y = y + 10;

    // ── Calculs ──────────────────────────────────────────────────────────────
    const tauxStockiste = parseFloat(stockiste.commission_rate ?? 30);
    const caVentesDir   = factures.reduce((s, f) => s + (f.montant_paye || 0), 0);
    const commVentesDir = Math.round(caVentesDir * tauxStockiste / 100);
    const caAppros      = resumeAppros.reduce((s, d) => s + d.ca, 0);
    const commAppros    = resumeAppros.reduce((s, d) => s + d.commission, 0);
    const commTotale    = commVentesDir + commAppros;

    // ── 4 blocs KPI ──────────────────────────────────────────────────────────
    const ySynth = doc.y;
    const wBloc  = (PAGE_W - 12) / 4;

    [
      { label: 'Ventes directes patients',              val: fmtMontant(caVentesDir),   col: VERT_FONCE },
      { label: `Commission directe (${tauxStockiste}%)`,val: fmtMontant(commVentesDir), col: BLEU       },
      { label: 'CA appros revendeurs',                  val: fmtMontant(caAppros),      col: '#1A237E'  },
      { label: 'Commission appros',                     val: fmtMontant(commAppros),    col: '#6A1B9A'  },
    ].forEach((bloc, i) => {
      const xBloc = ML + i * (wBloc + 4);
      doc.rect(xBloc, ySynth, wBloc, 46).fill(bloc.col);
      doc.fontSize(7.5).font('Helvetica').fillColor('white')
        .text(bloc.label, xBloc + 4, ySynth + 6, { width: wBloc - 8, align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('white')
        .text(bloc.val, xBloc + 4, ySynth + 22, { width: wBloc - 8, align: 'center' });
    });

    doc.y = ySynth + 54;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(VERT_FONCE)
      .text(`Commission totale : ${fmtMontant(commTotale)}`, ML, doc.y, { width: PAGE_W, align: 'right' });
    doc.y = doc.y + 10;

    // ── Utilitaires internes ─────────────────────────────────────────────────
    const parseLignes = (raw) => {
      if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
      return Array.isArray(raw) ? raw : [];
    };

    const fmtDateCourt = (d) => d
      ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : '—';

    const sautDePage = (cols, headers) => {
      dessinerPiedDePage(doc, 'Document personnel — à conserver');
      doc.addPage();
      if (exercice.statut !== 'cloture') dessinerFiligrane(doc);
      doc.rect(0, 0, 595, 6).fill(VERT);
      doc.y = MT + 10;
      const yH = doc.y;
      doc.rect(ML, yH, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
      headers.forEach((h, i) => {
        doc.text(h, cols[i].x, yH + 3, { width: cols[i].width, align: cols[i].align });
      });
      doc.y = yH + 16;
      return doc.y;
    };

    // ── Section VENTES DIRECTES AUX PATIENTS ─────────────────────────────────
    doc.moveDown(0.5);
    titreSection(doc, 'VENTES DIRECTES AUX PATIENTS');

    const colsVentes = [
      { x: ML + 4,   width: 52,  align: 'left'  },  // Date
      { x: ML + 60,  width: 100, align: 'left'  },  // Patient
      { x: ML + 164, width: 145, align: 'left'  },  // Produit
      { x: ML + 313, width: 30,  align: 'right' },  // Qté
      { x: ML + 347, width: 68,  align: 'right' },  // Prix unit.
      { x: ML + 419, width: 76,  align: 'right' },  // Montant
    ];
    const hdrsVentes = ['Date', 'Patient', 'Produit', 'Qté', 'Prix unit.', 'Montant'];

    let yTh = doc.y;
    doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
    hdrsVentes.forEach((h, i) => {
      doc.text(h, colsVentes[i].x, yTh + 3, { width: colsVentes[i].width, align: colsVentes[i].align });
    });
    doc.y = yTh + 16;
    let yRow = doc.y;

    factures.sort((a, b) => new Date(a.date_facture) - new Date(b.date_facture));

    factures.forEach((f, idx) => {
      const lignes  = parseLignes(f.lignes);
      const rows    = lignes.length > 0 ? lignes : [{}];
      const dateStr = fmtDateCourt(f.date_facture);
      const client  = f.patient ? `${f.patient.prenom} ${f.patient.nom}` : '—';
      const fond    = idx % 2 === 0 ? FOND_GRIS : null;

      rows.forEach((l, li) => {
        if (yRow > PAGE_H - MB - 40) yRow = sautDePage(colsVentes, hdrsVentes);
        const isLast = li === rows.length - 1;
        const montantLigne = (l.prix_unitaire != null && l.quantite != null)
          ? Math.round((l.prix_unitaire || 0) * (l.quantite || 0))
          : null;
        yRow = ligneTableau(doc, yRow, colsVentes, [
          li === 0 ? dateStr : '',
          li === 0 ? client : '',
          l.nom_produit || l.nom || '—',
          l.quantite != null ? String(l.quantite) : '—',
          l.prix_unitaire != null ? fmtMontant(l.prix_unitaire) : '—',
          isLast ? fmtMontant(f.montant_paye || 0) : (montantLigne != null ? fmtMontant(montantLigne) : ''),
        ], false, fond);
      });
    });

    if (factures.length === 0) {
      if (yRow > PAGE_H - MB - 20) yRow = sautDePage(colsVentes, hdrsVentes);
      yRow = ligneTableau(doc, yRow, colsVentes, ['Aucune vente directe sur cet exercice.', '', '', '', '', ''], false, FOND_GRIS);
    }

    if (yRow > PAGE_H - MB - 20) yRow = sautDePage(colsVentes, hdrsVentes);
    yRow = ligneTableau(doc, yRow, colsVentes, [
      'TOTAL',
      `${factures.length} vente${factures.length !== 1 ? 's' : ''} — Commission : ${fmtMontant(commVentesDir)}`,
      '', '', '',
      fmtMontant(caVentesDir),
    ], true);

    doc.y = yRow + 8;

    // ── Section RÉSUMÉ APPROS REVENDEURS ─────────────────────────────────────
    if (resumeAppros.length > 0) {
      doc.moveDown(0.5);
      titreSection(doc, 'RÉSUMÉ DES APPROS REVENDEURS', BLEU);

      const colsAppros = [
        { x: ML + 4,   width: 185, align: 'left'  },  // Délégué
        { x: ML + 193, width: 65,  align: 'right' },  // Nb opérations
        { x: ML + 262, width: 110, align: 'right' },  // CA appro
        { x: ML + 376, width: 119, align: 'right' },  // Commission stockiste
      ];
      const hdrsAppros = ['Revendeur', 'Nb opérations', 'CA appros', 'Commission stockiste'];

      yTh = doc.y;
      doc.rect(ML, yTh, PAGE_W, 14).fill('#CFD8DC');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#37474F');
      hdrsAppros.forEach((h, i) => {
        doc.text(h, colsAppros[i].x, yTh + 3, { width: colsAppros[i].width, align: colsAppros[i].align });
      });
      doc.y = yTh + 16;
      yRow = doc.y;

      resumeAppros.forEach((d, idx) => {
        if (yRow > PAGE_H - MB - 40) yRow = sautDePage(colsAppros, hdrsAppros);
        yRow = ligneTableau(doc, yRow, colsAppros, [
          d.nom,
          String(d.nb),
          fmtMontant(d.ca),
          fmtMontant(d.commission),
        ], false, idx % 2 === 0 ? FOND_GRIS : null);
      });

      if (yRow > PAGE_H - MB - 20) yRow = sautDePage(colsAppros, hdrsAppros);
      yRow = ligneTableau(doc, yRow, colsAppros, [
        `TOTAL (${resumeAppros.length} revendeur${resumeAppros.length !== 1 ? 's' : ''})`,
        String(resumeAppros.reduce((s, d) => s + d.nb, 0)),
        fmtMontant(caAppros),
        fmtMontant(commAppros),
      ], true);

      doc.y = yRow;
    }

    dessinerPiedDePage(doc, 'Document personnel — à conserver');
    doc.end();
  });


module.exports = {
  genererFicheMAPAPDF,
  genererDetailProduitsPDF,
  genererRecapDeleguesPDF,
  genererBilanIndividuelPDF,
  genererBilanStockistePDF,
};
