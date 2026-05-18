'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'devise', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'XOF',
      after: 'pays',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'devise');
  },
};
