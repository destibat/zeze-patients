'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('prets_emprunts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('pret', 'emprunt'),
        allowNull: false,
      },
      stockiste_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      partenaire_nom: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      partenaire_telephone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      partenaire_cabinet: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      produit_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'produits', key: 'id' },
        onDelete: 'RESTRICT',
      },
      quantite: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantite_rendue: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      date_pret: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      date_retour: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      statut: {
        type: Sequelize.ENUM('en_cours', 'rendu', 'rendu_partiel'),
        allowNull: false,
        defaultValue: 'en_cours',
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('prets_emprunts', ['stockiste_id', 'statut'], {
      name: 'idx_prets_emprunts_stockiste_statut',
    });
    await queryInterface.addIndex('prets_emprunts', ['date_pret'], {
      name: 'idx_prets_emprunts_date_pret',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('prets_emprunts');
  },
};
