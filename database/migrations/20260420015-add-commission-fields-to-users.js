'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'commission_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 25.00,
      after: 'telephone',
    });
    await queryInterface.addColumn('users', 'stockiste_id', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      after: 'commission_rate',
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'stockiste_id');
    await queryInterface.removeColumn('users', 'commission_rate');
  },
};
