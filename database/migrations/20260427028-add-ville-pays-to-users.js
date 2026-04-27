'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'ville', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      after: 'telephone',
    });
    await queryInterface.addColumn('users', 'pays', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      after: 'ville',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'ville');
    await queryInterface.removeColumn('users', 'pays');
  },
};
