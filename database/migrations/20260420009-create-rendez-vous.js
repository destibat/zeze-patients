'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rendez_vous', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onDelete: 'CASCADE',
      },
      medecin_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      date_heure: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      duree_minutes: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 30,
      },
      motif: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      statut: {
        type: Sequelize.ENUM('planifie', 'confirme', 'annule', 'honore', 'absent'),
        allowNull: false,
        defaultValue: 'planifie',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('rendez_vous', ['patient_id']);
    await queryInterface.addIndex('rendez_vous', ['medecin_id']);
    await queryInterface.addIndex('rendez_vous', ['date_heure']);
    await queryInterface.addIndex('rendez_vous', ['statut']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rendez_vous');
  },
};
