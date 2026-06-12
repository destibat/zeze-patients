'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Nouveaux champs sur factures ──────────────────────────────────────
    await queryInterface.addColumn('factures', 'montant_declare', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Somme des prix_unitaire des unités déclarées (comptabilisées)',
      after: 'montant_paye',
    });

    await queryInterface.addColumn('factures', 'avoir', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'montant_paye_cumule - montant_declare ; crédit non comptabilisé',
      after: 'montant_declare',
    });

    // ── 2. Agrandir ENUM statut (ajouter les nouvelles valeurs) ──────────────
    // On garde les anciennes valeurs le temps du back-fill (migration suivante)
    await queryInterface.sequelize.query(`
      ALTER TABLE factures
        MODIFY COLUMN statut
          ENUM('en_attente','partiellement_payee','payee','annulee',
               'partiellement_soldee','soldee')
          NOT NULL DEFAULT 'en_attente'
    `);

    // ── 3. Table declarations_produit ────────────────────────────────────────
    await queryInterface.createTable('declarations_produit', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      cabinet_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Isolation multi-tenant',
      },
      facture_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'factures', key: 'id' },
        onDelete: 'CASCADE',
      },
      ligne_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Index de la ligne dans le JSON factures.lignes',
      },
      nom_produit: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      prix_unitaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'FCFA — montant comptabilisé pour cette unité',
      },
      exercice_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'exercices', key: 'id' },
        onDelete: 'RESTRICT',
      },
      date_declaration: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('declarations_produit', ['facture_id']);
    await queryInterface.addIndex('declarations_produit', ['exercice_id']);
    await queryInterface.addIndex('declarations_produit', ['cabinet_id']);
    await queryInterface.addIndex('declarations_produit', ['facture_id', 'ligne_index'], { name: 'dp_facture_ligne_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('declarations_produit');
    await queryInterface.removeColumn('factures', 'avoir');
    await queryInterface.removeColumn('factures', 'montant_declare');
    // Retour ENUM original
    await queryInterface.sequelize.query(`
      ALTER TABLE factures
        MODIFY COLUMN statut
          ENUM('en_attente','partiellement_payee','payee','annulee')
          NOT NULL DEFAULT 'en_attente'
    `);
  },
};
