'use strict';

const DESC_ANTIBIOTIQUE = `Zezepagnon miracle Tisane est un thé composé de dix plantes naturelles qui boostent votre système immunitaire, favorise votre santé en aidant à combattre la prostate, le diabète de type 1 et 2, Tension, Hypertension, AVC, Cancer, VIH SIDA, Insuffisance rénale, tout en nettoyant les reins, et élimination de tout agent nocif dans l'organisme, aussi favorise à détruire toutes les infections des maladies y compris des voies urinaires tant chez les femmes que les hommes. 100% naturelle.\n\nA prescrire quand la pathologie est débutante pour la prévention. Associer toujours à un booster OOygène (Cacao ou Café).\n\nPropriétés pharmacologiques :\n- Stimuler le système immunitaire permettant au corps de se défendre contre les infections et les cancers\n- Guérison interne et externe pour soigner les plaies externes, les hémorragies et les ulcères\n- Anti-infectieux contre toutes les formes d'infections et de germes résistants aux antibiotiques actuels\n- Antiviral contre toutes les formes de virus\n- Anti-inflammatoire pour soigner toutes sortes d'inflammations\n- Régénérer et dynamiser les nerfs et les muscles pour restaurer les fonctions motrices\n- Régulateur du glucose\n- Régulateur de la pression artérielle\n- Diurétique pour évacuer rapidement l'excès d'eau et les toxines du corps\n- Aphrodisiaque pour corriger les dysfonctionnements érectiles`;

const DESC_BANGALA = (type) =>
  `Zezepagnon ${type} Bangala est un thé composé de 12 plantes + ${
    type === 'Cacao'
      ? "la poudre de cacao cru qui provient des fèves de cacao de l'arbre (Théobroma cacao) connu aussi sous le nom de cacaoyer ou cacaotier"
      : 'le café grains torréfiés 100% robusta naturel'
  } qui favorise${type === 'Café' ? 'nt' : ''} votre santé en aidant à combattre la faiblesse sexuelle et la fatigue générale, puis nettoie les reins et le foie. Il favorise l'appétit et la sensation sexuelle aussi bien chez les hommes que chez les femmes.\n\nVirilité – Énergie – Endurance`;

const DESC_BOOSTER = (type) =>
  `Puissant Détox.\n\nZezepagnon miracle Tisane est un thé composé de dix plantes naturelles qui boostent votre système immunitaire, favorise votre santé en aidant à combattre la prostate, le diabète de type 1 et 2, Tension, Hypertension, AVC, Cancer, VIH SIDA, Insuffisance rénale, tout en nettoyant les reins, et élimination de tout agent nocif dans l'organisme, aussi favorise à détruire toutes les infections des maladies y compris des voies urinaires tant chez les femmes que les hommes. 100% naturelle.`;

const DESC_DIABETE = `Zezepagnon DIABETE SPECIALISE est un thé composé de dix plantes naturelles qui favorisent votre santé en aidant à combattre la prostate, le diabète de type 1 et 2, Tension, Hypertension, AVC, Cancer, VIH SIDA, Insuffisance rénale, tout en nettoyant les reins, et élimination de tout agent nocif dans l'organisme, aussi favorise à détruire toutes les infections des maladies y compris des voies urinaires tant chez les femmes que les hommes. 100% naturelle.\n\nPropriétés pharmacologiques :\n- Stimuler le système immunitaire permettant au corps de se défendre contre les infections et les cancers\n- Guérison interne et externe pour soigner les plaies externes, les hémorragies et les ulcères\n- Anti-infectieux contre toutes les formes d'infections et de germes résistants aux antibiotiques actuels\n- Antiviral contre toutes les formes de virus\n- Anti-inflammatoire pour soigner toutes sortes d'inflammations\n- Régénérer et dynamiser les nerfs et les muscles pour restaurer les fonctions motrices\n- Régulateur du glucose\n- Régulateur de la pression artérielle\n- Diurétique pour évacuer rapidement l'excès d'eau et les toxines du corps\n- Aphrodisiaque pour corriger les dysfonctionnements érectiles`;

const DESC_TISANE_SPEC = `Zezepagnon SPECIALISE TISANE est un thé composé de dix plantes naturelles qui favorisent votre santé en aidant à combattre la prostate, le diabète de type 1 et 2, Tension, Hypertension, AVC, Cancer, VIH SIDA, Insuffisance rénale, tout en nettoyant les reins, et élimination de tout agent nocif dans l'organisme, aussi favorise à détruire toutes les infections des maladies y compris des voies urinaires tant chez les femmes que les hommes. 100% naturelle.\n\nPropriétés pharmacologiques :\n- Stimuler le système immunitaire permettant au corps de se défendre contre les infections et les cancers\n- Guérison interne et externe pour soigner les plaies externes, les hémorragies et les ulcères\n- Anti-infectieux contre toutes les formes d'infections et de germes résistants aux antibiotiques actuels\n- Antiviral contre toutes les formes de virus\n- Anti-inflammatoire pour soigner toutes sortes d'inflammations\n- Régénérer et dynamiser les nerfs et les muscles pour restaurer les fonctions motrices\n- Régulateur du glucose\n- Régulateur de la pression artérielle\n- Diurétique pour évacuer rapidement l'excès d'eau et les toxines du corps\n- Aphrodisiaque pour corriger les dysfonctionnements érectiles`;

const now = new Date();

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('produits', [
      {
        id: 'a1000001-0000-4000-8000-000000000001',
        nom: 'ANTIBIOTIQUE GRAND FORMAT',
        description: DESC_ANTIBIOTIQUE,
        categorie: 'antibiotique',
        prix_unitaire: 150000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000002',
        nom: 'ANTIBIOTIQUE PETIT FORMAT',
        description: DESC_ANTIBIOTIQUE,
        categorie: 'antibiotique',
        prix_unitaire: 40000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000003',
        nom: 'CACAO BANGALA',
        description: DESC_BANGALA('Cacao'),
        categorie: 'booster',
        prix_unitaire: 20000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000004',
        nom: 'CAFÉ BANGALA',
        description: DESC_BANGALA('Café'),
        categorie: 'booster',
        prix_unitaire: 20000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000005',
        nom: 'CAFÉ BOOSTER OXYGÈNE',
        description: DESC_BOOSTER('café'),
        categorie: 'booster',
        prix_unitaire: 20000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000006',
        nom: 'CACAO BOOSTER OXYGÈNE',
        description: DESC_BOOSTER('cacao'),
        categorie: 'booster',
        prix_unitaire: 20000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000007',
        nom: 'SOMMEIL RÉPARATEUR',
        description:
          "Antifongique, antibactérien : traite les cas d'herpès, de mycoses ou de champignons, sédatif, calmant, relaxant ; il aide à calmer l'anxiété, le stress, la fatigue mentale et favorise un sommeil réparateur, lutte contre l'insomnie.",
        categorie: 'sommeil',
        prix_unitaire: 20000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000008',
        nom: 'DIABÈTE SPÉCIALISÉ GRAND',
        description: DESC_DIABETE,
        categorie: 'specialise',
        prix_unitaire: 300000,
        quantite_stock: 0,
        seuil_alerte: 3,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000009',
        nom: 'DIABÈTE SPÉCIALISÉ PETIT',
        description: DESC_DIABETE,
        categorie: 'specialise',
        prix_unitaire: 75000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000010',
        nom: 'TISANE SPÉCIALISÉE GRAND',
        description: DESC_TISANE_SPEC,
        categorie: 'specialise',
        prix_unitaire: 300000,
        quantite_stock: 0,
        seuil_alerte: 3,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000011',
        nom: 'TISANE SPÉCIALISÉE PETIT',
        description: DESC_TISANE_SPEC,
        categorie: 'specialise',
        prix_unitaire: 75000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000012',
        nom: 'ZEZEPAGNON SPÉCIALISÉ PERSONNALISÉ',
        description: DESC_TISANE_SPEC,
        categorie: 'specialise',
        prix_unitaire: 400000,
        quantite_stock: 0,
        seuil_alerte: 3,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000013',
        nom: 'ARGILE MIRACLE',
        description:
          "ZEZEPAGNON CLAY / ARGILE MIRACLE est un complément alimentaire composé de 12 plantes plus des graines et de l'argile médicinale. Il donne à votre système immunitaire une capacité vitale à régénérer vos organes.",
        categorie: 'autre',
        prix_unitaire: 50000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000014',
        nom: 'ZEZEPAGNON CANCER DU SEIN GRAND',
        description:
          "Défenses naturelles – Traitement anticancéreux – Thérapie ciblée.\n\nCe produit stimule la moelle osseuse afin qu'elle contribue à l'élimination des cellules tumorales malignes du sein.",
        categorie: 'specialise',
        prix_unitaire: 300000,
        quantite_stock: 0,
        seuil_alerte: 3,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000015',
        nom: 'ZEZEPAGNON CANCER DU SEIN PETIT',
        description:
          "Défenses naturelles – Traitement anticancéreux – Thérapie ciblée.\n\nCe produit stimule la moelle osseuse afin qu'elle contribue à l'élimination des cellules tumorales malignes du sein.",
        categorie: 'specialise',
        prix_unitaire: 75000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1000001-0000-4000-8000-000000000016',
        nom: 'ZEZEPAGNON PRÉVENTION',
        description:
          "Tisane naturelle de soutien immunitaire.\n\nZEZEPAGNON Prévention est une tisane à base de plantes soigneusement sélectionnées pour accompagner naturellement votre organisme au quotidien. Sa formule est conçue pour soutenir le système immunitaire, aider l'organisme à lutter contre le stress oxydatif et favoriser le bien-être général.\n\nGrâce à la richesse naturelle de ses composants, cette tisane contribue à :\n- Soutenir les défenses naturelles\n- Aider à réduire les inflammations\n- Combattre les radicaux libres\n- Favoriser un équilibre global de l'organisme\n\nProduit élaboré avec exigence et distribué par MAPA.",
        categorie: 'prevention',
        prix_unitaire: 40000,
        quantite_stock: 0,
        seuil_alerte: 5,
        actif: true,
        created_at: now,
        updated_at: now,
      },
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('produits', {
      id: {
        [require('sequelize').Op.like]: 'a1000001-%',
      },
    });
  },
};
