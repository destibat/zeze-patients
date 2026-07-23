'use strict';

// audit_logs.cabinet_id : NOT NULL → NULL.
// Le journal d'audit doit pouvoir enregistrer des événements sans cabinet
// résolu (login échoué sur un Host inconnu, action système). Le modèle
// AuditLog déclare déjà allowNull: true — on aligne le schéma sur le modèle.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('audit_logs', 'cabinet_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('audit_logs', 'cabinet_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
