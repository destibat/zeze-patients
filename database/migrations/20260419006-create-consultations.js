'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultations', {
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
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      date_consultation: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      motif: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      symptomes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      diagnostic: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      traitement_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Constantes vitales
      tension_systolique: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: true,
        comment: 'mmHg',
      },
      tension_diastolique: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: true,
        comment: 'mmHg',
      },
      frequence_cardiaque: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: true,
        comment: 'bpm',
      },
      temperature: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: true,
        comment: '°C',
      },
      poids: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'kg',
      },
      taille: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: true,
        comment: 'cm',
      },
      saturation_o2: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true,
        comment: '%',
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

    await queryInterface.addIndex('consultations', ['patient_id']);
    await queryInterface.addIndex('consultations', ['medecin_id']);
    await queryInterface.addIndex('consultations', ['date_consultation']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultations');
  },
};
