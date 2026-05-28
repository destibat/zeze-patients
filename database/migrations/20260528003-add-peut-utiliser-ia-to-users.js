'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'peut_utiliser_ia', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'devise',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'peut_utiliser_ia');
  },
};
