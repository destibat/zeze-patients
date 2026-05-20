'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('factures', 'recouvrement_exercice_id', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: 'exercices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'exercice_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('factures', 'recouvrement_exercice_id');
  },
};
