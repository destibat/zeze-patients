'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('produits', 'seuil_alerte', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE produits SET seuil_alerte = 5 WHERE seuil_alerte IS NULL"
    );
    await queryInterface.changeColumn('produits', 'seuil_alerte', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
    });
  },
};
