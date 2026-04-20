'use strict';

// Hash bcrypt de 'ZezeAdmin2026!' avec coût 12 — pré-calculé pour éviter la dépendance bcrypt dans les seeds
// UUID pré-généré pour la même raison (pas de node_modules disponible hors du dossier backend)

module.exports = {
  async up(queryInterface) {
    const passwordHash = '$2b$12$QfexzLsHfovA8ZvkTlqcF.RetIZDrJSMXkpUcRcHOKewqW029ih1i';

    await queryInterface.bulkInsert('users', [{
      id: 'c0a1a162-8d64-4d1d-a8c2-dad332eb1ef7',
      nom: 'Brevet',
      prenom: 'Alexis',
      email: 'admin@zezepagnon.local',
      password_hash: passwordHash,
      role: 'administrateur',
      actif: true,
      telephone: null,
      // Forcera le changement de mot de passe à la première connexion
      doit_changer_mdp: true,
      derniere_connexion: null,
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@zezepagnon.local' });
  },
};
