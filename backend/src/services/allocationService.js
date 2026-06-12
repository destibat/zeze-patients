'use strict';

/**
 * Sous-ensemble d'indices de somme MAXIMALE sans dépasser `capacite`.
 * Tri décroissant par prix → produits les plus chers déclarés en priorité.
 * Complexité DP sur les sommes atteignables — adapté aux factures réalistes (< 30 unités).
 *
 * @param {number[]} prix     Tableau des prix unitaires
 * @param {number}   capacite Montant disponible
 * @returns {number[]}        Indices sélectionnés
 */
function sousEnsembleSommeMax(prix, capacite) {
  const atteignable = new Map(); // somme → indices
  atteignable.set(0, []);
  const ordre = prix.map((p, i) => i).sort((a, b) => prix[b] - prix[a]);
  for (const i of ordre) {
    const p = prix[i];
    for (const [s, idx] of [...atteignable.entries()]) {
      const ns = s + p;
      if (ns <= capacite && !atteignable.has(ns)) {
        atteignable.set(ns, [...idx, i]);
      }
    }
  }
  let best = 0;
  for (const s of atteignable.keys()) if (s > best) best = s;
  return atteignable.get(best) || [];
}

/**
 * Décompose les lignes JSON d'une facture en unités individuelles.
 * Une ligne {quantite: 3, prix_unitaire: 20000} → 3 unités à 20 000.
 */
function decomposerEnUnites(lignes) {
  const unites = [];
  (Array.isArray(lignes) ? lignes : []).forEach((ligne, ligneIndex) => {
    const qte  = Math.max(parseInt(ligne.quantite, 10) || 0, 0);
    const prix = Math.max(parseInt(ligne.prix_unitaire, 10) || 0, 0);
    const nom  = ligne.nom_produit || ligne.nom || 'Inconnu';
    for (let u = 0; u < qte; u++) {
      unites.push({ ligneIndex, nom, prix });
    }
  });
  return unites;
}

/**
 * Alloue le montant disponible (avoir courant) sur les unités non encore déclarées.
 * Doit être appelé DANS la même transaction que l'enregistrement du paiement.
 *
 * @param {string}  factureId
 * @param {object}  opts
 * @param {object}  opts.transaction  Transaction Sequelize active (obligatoire)
 * @param {string}  opts.exerciceId   Exercice à associer aux nouvelles déclarations
 * @param {object}  opts.models       { Facture, DeclarationProduit }
 * @returns {{ montantDeclare, avoir, statut }}
 */
async function allouerFacture(factureId, { transaction, exerciceId, models }) {
  const { Facture, DeclarationProduit } = models;

  // Verrou de ligne pour éviter les courses concurrentes
  const facture = await Facture.findByPk(factureId, {
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!facture) throw new Error(`Facture ${factureId} introuvable`);

  const lignes  = Array.isArray(facture.lignes) ? facture.lignes : [];
  const unites  = decomposerEnUnites(lignes);
  if (unites.length === 0) {
    return { montantDeclare: 0, avoir: facture.montant_paye, statut: 'en_attente' };
  }

  // Nombre de déclarations existantes par ligne
  const dejaDeclarees = await DeclarationProduit.findAll({
    where: { facture_id: factureId },
    attributes: ['ligne_index'],
    transaction,
  });
  const compteParLigne = {};
  for (const d of dejaDeclarees) {
    compteParLigne[d.ligne_index] = (compteParLigne[d.ligne_index] || 0) + 1;
  }

  // Unités NON encore déclarées
  const unitesParLigne = {};
  for (const u of unites) {
    if (!unitesParLigne[u.ligneIndex]) unitesParLigne[u.ligneIndex] = 0;
    unitesParLigne[u.ligneIndex]++;
  }
  const unitesPendantes = unites.filter((u) => {
    const deja = compteParLigne[u.ligneIndex] || 0;
    const total = unitesParLigne[u.ligneIndex];
    // Compter combien de cette ligne ont déjà été déclarées
    const dejaIndex = dejaDeclarees.filter((d) => d.ligne_index === u.ligneIndex).length;
    return dejaIndex < total;
  });

  // Recalculer le vrai décompte par ligne pour filtrer correctement
  const compteFait = {};
  const unitesNonDeclarees = [];
  for (const u of unites) {
    if (!compteFait[u.ligneIndex]) compteFait[u.ligneIndex] = 0;
    const deja = compteParLigne[u.ligneIndex] || 0;
    if (compteFait[u.ligneIndex] < (unitesParLigne[u.ligneIndex] - deja)) {
      unitesNonDeclarees.push(u);
      compteFait[u.ligneIndex]++;
    }
  }

  if (unitesNonDeclarees.length === 0) {
    const montantDeclare = unites.reduce((s, u) => s + u.prix, 0);
    return { montantDeclare, avoir: 0, statut: 'soldee' };
  }

  // Montant disponible = montant_paye - montant déjà déclaré
  const montantDejaDeclare = dejaDeclarees.reduce((s, d) => {
    const u = unites.find((u) => u.ligneIndex === d.ligne_index);
    return s + (u ? u.prix : 0);
  }, 0);

  // Recalcul précis depuis les déclarations existantes
  const existantes = await DeclarationProduit.findAll({
    where: { facture_id: factureId },
    attributes: ['prix_unitaire'],
    raw: true,
    transaction,
  });
  const montantDejaDeclarePrecis = existantes.reduce((s, d) => s + (d.prix_unitaire || 0), 0);

  const disponible = (facture.montant_paye || 0) - montantDejaDeclarePrecis;

  if (disponible <= 0) {
    return {
      montantDeclare: montantDejaDeclarePrecis,
      avoir: 0,
      statut: montantDejaDeclarePrecis > 0 ? 'partiellement_soldee' : 'en_attente',
    };
  }

  // Sélection optimale parmi les unités pendantes
  const prixPendants = unitesNonDeclarees.map((u) => u.prix);
  const indicesSelectionnes = sousEnsembleSommeMax(prixPendants, disponible);

  // Créer les nouvelles déclarations
  const now = new Date();
  const nouvelles = indicesSelectionnes.map((idx) => ({
    facture_id:       factureId,
    cabinet_id:       facture.cabinet_id,
    ligne_index:      unitesNonDeclarees[idx].ligneIndex,
    nom_produit:      unitesNonDeclarees[idx].nom,
    prix_unitaire:    unitesNonDeclarees[idx].prix,
    exercice_id:      exerciceId,
    date_declaration: now,
  }));

  if (nouvelles.length > 0) {
    await DeclarationProduit.bulkCreate(nouvelles, { transaction });
  }

  // Totaux finaux
  const toutesDeclarations = await DeclarationProduit.findAll({
    where: { facture_id: factureId },
    attributes: ['prix_unitaire'],
    raw: true,
    transaction,
  });
  const montantDeclare = toutesDeclarations.reduce((s, d) => s + (d.prix_unitaire || 0), 0);
  const avoir = (facture.montant_paye || 0) - montantDeclare;
  const totalUnites = unites.reduce((s, u) => s + 1, 0);
  const toutesDeclarees = toutesDeclarations.length === totalUnites;

  const statut = toutesDeclarees
    ? 'soldee'
    : montantDeclare > 0 ? 'partiellement_soldee' : 'en_attente';

  return { montantDeclare, avoir, statut };
}

module.exports = { sousEnsembleSommeMax, decomposerEnUnites, allouerFacture };
