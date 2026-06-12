'use strict';

const { v4: uuidv4 } = require('uuid');

// Reproduit l'algorithme sousEnsembleSommeMax sans dépendances extérieures
function sousEnsembleSommeMax(prix, capacite) {
  const atteignable = new Map();
  atteignable.set(0, []);
  const ordre = prix.map((p, i) => i).sort((a, b) => prix[b] - prix[a]);
  for (const i of ordre) {
    const p = prix[i];
    for (const [s, idx] of [...atteignable.entries()]) {
      const ns = s + p;
      if (ns <= capacite && !atteignable.has(ns)) atteignable.set(ns, [...idx, i]);
    }
  }
  let best = 0;
  for (const s of atteignable.keys()) if (s > best) best = s;
  return atteignable.get(best) || [];
}

// Décompose les lignes en unités individuelles
function decomposerEnUnites(lignes) {
  const unites = [];
  (lignes || []).forEach((ligne, ligneIndex) => {
    const qte = ligne.quantite || 1;
    const prix = ligne.prix_unitaire || 0;
    const nom = ligne.nom_produit || ligne.nom || 'Inconnu';
    for (let u = 0; u < qte; u++) {
      unites.push({ ligneIndex, nom, prix });
    }
  });
  return unites;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [factures] = await queryInterface.sequelize.query(`
      SELECT id, cabinet_id, statut, montant_total, montant_paye, lignes,
             exercice_id, recouvrement_exercice_id
      FROM factures
      WHERE statut IN ('payee', 'partiellement_payee')
    `);

    for (const f of factures) {
      let lignes = [];
      try { lignes = typeof f.lignes === 'string' ? JSON.parse(f.lignes) : (f.lignes || []); } catch {}

      const unites = decomposerEnUnites(lignes);
      if (unites.length === 0) continue;

      let declarations = [];
      let montantDeclare = 0;
      let avoir = 0;

      if (f.statut === 'payee') {
        // Toutes les unités déclarées
        const exerciceId = f.recouvrement_exercice_id || f.exercice_id;
        if (!exerciceId) continue;
        declarations = unites.map((u) => ({
          id: uuidv4(),
          cabinet_id: f.cabinet_id,
          facture_id: f.id,
          ligne_index: u.ligneIndex,
          nom_produit: u.nom,
          prix_unitaire: u.prix,
          exercice_id: exerciceId,
          date_declaration: now,
          created_at: now,
          updated_at: now,
        }));
        montantDeclare = unites.reduce((s, u) => s + u.prix, 0);
        avoir = 0;
      } else {
        // partiellement_payee : allocation optimale sur montant_paye
        const exerciceId = f.exercice_id;
        if (!exerciceId) continue;
        const disponible = f.montant_paye || 0;
        const prixUnites = unites.map((u) => u.prix);
        const indicesSelectionnes = sousEnsembleSommeMax(prixUnites, disponible);
        for (const idx of indicesSelectionnes) {
          const u = unites[idx];
          declarations.push({
            id: uuidv4(),
            cabinet_id: f.cabinet_id,
            facture_id: f.id,
            ligne_index: u.ligneIndex,
            nom_produit: u.nom,
            prix_unitaire: u.prix,
            exercice_id: exerciceId,
            date_declaration: now,
            created_at: now,
            updated_at: now,
          });
        }
        montantDeclare = declarations.reduce((s, d) => s + d.prix_unitaire, 0);
        avoir = disponible - montantDeclare;
      }

      if (declarations.length > 0) {
        await queryInterface.bulkInsert('declarations_produit', declarations);
      }

      // Mettre à jour montant_declare, avoir
      await queryInterface.sequelize.query(
        `UPDATE factures SET montant_declare = ?, avoir = ? WHERE id = ?`,
        { replacements: [montantDeclare, avoir, f.id] }
      );
    }

    // Renommer les statuts : payee → soldee, partiellement_payee → partiellement_soldee
    await queryInterface.sequelize.query(`
      UPDATE factures SET statut = 'soldee' WHERE statut = 'payee'
    `);
    await queryInterface.sequelize.query(`
      UPDATE factures SET statut = 'partiellement_soldee' WHERE statut = 'partiellement_payee'
    `);

    // Retirer les anciennes valeurs de l'ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE factures
        MODIFY COLUMN statut
          ENUM('en_attente','partiellement_soldee','soldee','annulee')
          NOT NULL DEFAULT 'en_attente'
    `);
  },

  async down(queryInterface) {
    // Remettre les anciennes valeurs dans l'ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE factures
        MODIFY COLUMN statut
          ENUM('en_attente','partiellement_soldee','soldee','annulee',
               'partiellement_payee','payee')
          NOT NULL DEFAULT 'en_attente'
    `);
    await queryInterface.sequelize.query(`
      UPDATE factures SET statut = 'payee' WHERE statut = 'soldee'
    `);
    await queryInterface.sequelize.query(`
      UPDATE factures SET statut = 'partiellement_payee' WHERE statut = 'partiellement_soldee'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE factures
        MODIFY COLUMN statut
          ENUM('en_attente','partiellement_payee','payee','annulee')
          NOT NULL DEFAULT 'en_attente'
    `);
    await queryInterface.sequelize.query(`DELETE FROM declarations_produit`);
    await queryInterface.sequelize.query(`UPDATE factures SET montant_declare = 0, avoir = 0`);
  },
};
