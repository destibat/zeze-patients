'use strict';

/**
 * Calcule l'âge en années (avec fraction) à partir d'une date de naissance.
 */
const calculerAgeAnnees = (dateNaissance) => {
  const naissance = new Date(dateNaissance);
  const maintenant = new Date();
  return (maintenant - naissance) / (1000 * 60 * 60 * 24 * 365.25);
};

/**
 * Calcule l'âge en mois à partir d'une date de naissance.
 */
const calculerAgeMois = (dateNaissance) => {
  return calculerAgeAnnees(dateNaissance) * 12;
};

/**
 * Retourne les instructions de posologie selon l'âge du patient.
 * Règles ZEZEPAGNON :
 *   1j – 6 mois    : 1 cuillère à café par jour
 *   6 mois – 1 an  : 1 cuillère à soupe par jour
 *   1 – 3 ans      : 2 cuillères à soupe par jour
 *   3 – 6 ans      : 75 ml par jour
 *   6 – 14 ans     : 100 ml par jour
 *   15 – 25 ans    : 250 ml matin (Spécialisé/Standard) + 150 ml soir (Booster), 1 mois
 *   25 – 40 ans    : 250 ml matin + 150 ml soir
 *   40 – 60 ans    : 150 ml matin + 100 ml soir
 *   60+ ans        : 125 ml matin + 100 ml soir, puis alterner 125 ml / 125 ml dès le 10e jour
 */
const getPosologie = (dateNaissance) => {
  if (!dateNaissance) return null;

  const ageMois = calculerAgeMois(dateNaissance);
  const ageAns = ageMois / 12;

  if (ageMois < 6) {
    return {
      tranche: 'nourrisson_0_6mois',
      libelle: '1 jour – 6 mois',
      matin: '1 cuillère à café',
      soir: null,
      duree: null,
      instructions: "1 cuillère à café par jour.",
    };
  }

  if (ageMois < 12) {
    return {
      tranche: 'nourrisson_6_12mois',
      libelle: '6 mois – 1 an',
      matin: '1 cuillère à soupe',
      soir: null,
      duree: null,
      instructions: "1 cuillère à soupe par jour.",
    };
  }

  if (ageAns < 3) {
    return {
      tranche: 'enfant_1_3ans',
      libelle: '1 – 3 ans',
      matin: '2 cuillères à soupe',
      soir: null,
      duree: null,
      instructions: "2 cuillères à soupe par jour.",
    };
  }

  if (ageAns < 6) {
    return {
      tranche: 'enfant_3_6ans',
      libelle: '3 – 6 ans',
      matin: '75 ml',
      soir: null,
      duree: null,
      instructions: "75 ml par jour.",
    };
  }

  if (ageAns < 14) {
    return {
      tranche: 'enfant_6_14ans',
      libelle: '6 – 14 ans',
      matin: '100 ml',
      soir: null,
      duree: null,
      instructions: "100 ml par jour.",
    };
  }

  if (ageAns < 25) {
    return {
      tranche: 'adulte_15_25ans',
      libelle: '15 – 25 ans',
      matin: '250 ml (Spécialisé / Standard)',
      soir: '150 ml (Booster)',
      duree: '1 mois',
      instructions:
        "250 ml le matin (Spécialisé ou Standard) + 150 ml le soir (Booster). Durée : 1 mois.",
    };
  }

  if (ageAns < 40) {
    return {
      tranche: 'adulte_25_40ans',
      libelle: '25 – 40 ans',
      matin: '250 ml',
      soir: '150 ml',
      duree: null,
      instructions: "250 ml le matin + 150 ml le soir.",
    };
  }

  if (ageAns < 60) {
    return {
      tranche: 'adulte_40_60ans',
      libelle: '40 – 60 ans',
      matin: '150 ml',
      soir: '100 ml',
      duree: null,
      instructions: "150 ml le matin + 100 ml le soir.",
    };
  }

  return {
    tranche: 'senior_60plus',
    libelle: '60 ans et plus',
    matin: '125 ml',
    soir: '100 ml',
    duree: null,
    instructions:
      "125 ml le matin + 100 ml le soir. À partir du 10e jour : alterner 125 ml matin / 125 ml soir.",
  };
};

module.exports = { getPosologie, calculerAgeAnnees, calculerAgeMois };
