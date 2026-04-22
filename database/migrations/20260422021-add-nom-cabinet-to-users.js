'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'nom_cabinet', {
      type: Sequelize.STRING(200),
      allowNull: true,
      defaultValue: null,
      after: 'telephone',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'nom_cabinet');
  },
};
