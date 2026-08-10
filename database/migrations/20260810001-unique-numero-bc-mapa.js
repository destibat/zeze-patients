'use strict';

// Deux créations simultanées de BC peuvent générer le même numéro (lecture du
// max + 1 sans verrou dans numeroBonCommandeService) : l'unicité doit être
// garantie en base. Portée par cabinet : la numérotation est par cabinet.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex('bons_commande_mapa', ['numero']);
    await queryInterface.addIndex('bons_commande_mapa', ['cabinet_id', 'numero'], {
      unique: true,
      name: 'bc_mapa_cabinet_numero_uniq',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('bons_commande_mapa', 'bc_mapa_cabinet_numero_uniq');
    await queryInterface.addIndex('bons_commande_mapa', ['numero']);
  },
};
