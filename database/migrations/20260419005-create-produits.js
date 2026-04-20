'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('produits', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      nom: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      categorie: {
        type: Sequelize.ENUM(
          'antibiotique',
          'booster',
          'specialise',
          'sommeil',
          'prevention',
          'autre'
        ),
        allowNull: false,
        defaultValue: 'autre',
      },
      prix_unitaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Prix en FCFA',
      },
      quantite_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      seuil_alerte: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      actif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('produits', ['nom']);
    await queryInterface.addIndex('produits', ['categorie']);
    await queryInterface.addIndex('produits', ['actif']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('produits');
  },
};
