'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('patients', 'sexe', {
      type: Sequelize.ENUM('masculin', 'feminin', 'autre'),
      allowNull: true,
    });
    await queryInterface.changeColumn('patients', 'date_naissance', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.changeColumn('patients', 'telephone', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.changeColumn('ordonnances', 'consultation_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('patients', 'sexe', {
      type: Sequelize.ENUM('masculin', 'feminin', 'autre'),
      allowNull: false,
    });
    await queryInterface.changeColumn('patients', 'date_naissance', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('patients', 'telephone', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
    await queryInterface.changeColumn('ordonnances', 'consultation_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
