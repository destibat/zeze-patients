const { Patient } = require('../models');

// Génère le prochain numéro de dossier au format ZZP-YYYY-NNNNN
const genererNumeroDossier = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `ZZP-${annee}-`;

  // Cherche le dernier numéro de l'année en cours
  const dernier = await Patient.findOne({
    where: { numero_dossier: { [require('sequelize').Op.like]: `${prefixe}%` } },
    order: [['numero_dossier', 'DESC']],
    paranoid: false,
  });

  let sequence = 1;
  if (dernier) {
    const partieNumerique = dernier.numero_dossier.split('-')[2];
    sequence = parseInt(partieNumerique, 10) + 1;
  }

  return `${prefixe}${String(sequence).padStart(5, '0')}`;
};

module.exports = { genererNumeroDossier };
