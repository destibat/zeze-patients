import * as XLSX from 'xlsx';

const fmtDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Exporte un tableau d'objets en fichier Excel (.xlsx).
 * @param {Array<{titre: string, donnees: Array<Object>}>} feuilles
 * @param {string} nomFichier  Sans extension
 */
export const exporterExcel = (feuilles, nomFichier) => {
  const wb = XLSX.utils.book_new();
  feuilles.forEach(({ titre, donnees }) => {
    if (!donnees || !donnees.length) return;
    const ws = XLSX.utils.json_to_sheet(donnees);
    // Largeur automatique des colonnes
    const cols = Object.keys(donnees[0]).map((k) => ({
      wch: Math.max(k.length, ...donnees.map((r) => String(r[k] ?? '').length)) + 2,
    }));
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, titre.substring(0, 31));
  });
  XLSX.writeFile(wb, `${nomFichier}_${fmtDate()}.xlsx`);
};

// ── Helpers de formatage pour les exports ─────────────────────────────────────

export const fmtMontant = (v) => (v != null ? Number(v).toLocaleString('fr-FR') + ' FCFA' : '—');
export const fmtNombre = (v) => (v != null ? Number(v).toLocaleString('fr-FR') : '—');
export const fmtDateFR = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// ── Fonctions d'export métier ─────────────────────────────────────────────────

/** Export top produits depuis les stats */
export const exportTopProduits = (topProduits, libellePeriode) => {
  const donnees = topProduits.map((p, i) => ({
    'Rang': i + 1,
    'Produit': p.nom,
    'Quantité vendue': p.quantite,
    'CA (FCFA)': p.ca,
  }));
  exporterExcel(
    [{ titre: 'Top produits', donnees }],
    `GECAM_Top_Produits_${libellePeriode.replace(/[^a-zA-Z0-9]/g, '_')}`,
  );
};

/** Export performance délégués */
export const exportPerformanceDelegues = (performance, libellePeriode) => {
  const donnees = performance.map((d) => ({
    'Délégué': `${d.prenom} ${d.nom}`,
    'Nb achats stock': d.nb_achats,
    'CA achats (FCFA)': d.ca_total,
    'Gains délégué (FCFA)': d.gains_delegue,
    'Commission stockiste (FCFA)': d.commission_stockiste,
    'Nb ventes directes': d.nb_ventes_directes,
    'CA ventes directes (FCFA)': d.ca_ventes_directes,
  }));
  exporterExcel(
    [{ titre: 'Délégués', donnees }],
    `GECAM_Performance_Delegues_${libellePeriode.replace(/[^a-zA-Z0-9]/g, '_')}`,
  );
};

/** Export complet statistiques (top produits + délégués) */
export const exportStatsVentes = (topProduits, performance, libellePeriode) => {
  const feuilles = [];

  if (topProduits?.length) {
    feuilles.push({
      titre: 'Top produits',
      donnees: topProduits.map((p, i) => ({
        'Rang': i + 1,
        'Produit': p.nom,
        'Quantité vendue': p.quantite,
        'CA (FCFA)': p.ca,
      })),
    });
  }

  if (performance?.length) {
    feuilles.push({
      titre: 'Performance délégués',
      donnees: performance.map((d) => ({
        'Délégué': `${d.prenom} ${d.nom}`,
        'Nb achats stock': d.nb_achats,
        'CA achats (FCFA)': d.ca_total,
        'Gains délégué (FCFA)': d.gains_delegue,
        'Commission stockiste (FCFA)': d.commission_stockiste,
        'Nb ventes directes': d.nb_ventes_directes,
        'CA ventes directes (FCFA)': d.ca_ventes_directes,
      })),
    });
  }

  if (feuilles.length) {
    exporterExcel(feuilles, `GECAM_Stats_Ventes_${libellePeriode.replace(/[^a-zA-Z0-9]/g, '_')}`);
  }
};

/** Export liste de factures */
export const exportFactures = (factures) => {
  const donnees = factures.map((f) => ({
    'Numéro': f.numero,
    'Date': fmtDateFR(f.date_facture),
    'Patient': f.patient ? `${f.patient.prenom} ${f.patient.nom}` : '—',
    'N° dossier': f.patient?.numero_dossier || '—',
    'Montant total (FCFA)': f.montant_total,
    'Montant payé (FCFA)': f.montant_paye,
    'Reste dû (FCFA)': f.montant_total - f.montant_paye,
    'Mode paiement': f.mode_paiement || '—',
    'Statut': f.statut,
  }));
  exporterExcel([{ titre: 'Factures', donnees }], 'GECAM_Factures');
};

/** Export inventaire stock */
export const exportStock = (produits) => {
  const donnees = produits.map((p) => ({
    'Produit': p.nom,
    'Catégorie': p.categorie,
    'Prix unitaire (FCFA)': p.prix_unitaire,
    'Quantité en stock': p.quantite_stock,
    'Valeur stock (FCFA)': p.prix_unitaire * p.quantite_stock,
    'Seuil alerte': p.seuil_alerte ?? '—',
    'Statut': p.quantite_stock === 0 ? 'Rupture' : p.seuil_alerte && p.quantite_stock <= p.seuil_alerte ? 'Stock bas' : 'OK',
  }));
  exporterExcel([{ titre: 'Stock', donnees }], 'GECAM_Inventaire_Stock');
};
