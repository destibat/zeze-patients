'use strict';

const { Exercice, MouvementDelegue, User, ParametreCabinet } = require('../models');
const { calculerBilan } = require('./exerciceController');
const {
  genererFicheMAPAPDF,
  genererDetailProduitsPDF,
  genererRecapDeleguesPDF,
  genererBilanIndividuelPDF,
} = require('../services/pdfFichesService');

// ── Charge les infos cabinet depuis parametres_cabinet ────────────────────────
const chargerInfosCabinet = async () => {
  const params = await ParametreCabinet.findAll({
    where: { cle: ['nom_cabinet', 'adresse'] },
    raw: true,
  });
  const map = {};
  params.forEach((p) => { map[p.cle] = p.valeur; });
  return {
    nom_cabinet: map.nom_cabinet || 'ZEZEPAGNON — Dossiers Patients',
    adresse: map.adresse || '',
  };
};

// ── Utilitaire : charge exercice + bilan (snapshot si clôturé) ────────────────
const chargerExerciceEtBilan = async (id) => {
  const exercice = await Exercice.findByPk(id, {
    include: [
      { model: User, as: 'rouvreur', attributes: ['id', 'nom', 'prenom'] },
      { model: User, as: 'clotureur', attributes: ['id', 'nom', 'prenom'] },
    ],
  });
  if (!exercice) return null;

  const dureeJours = exercice.date_cloture
    ? Math.floor((new Date(exercice.date_cloture) - new Date(exercice.date_ouverture)) / 86400000)
    : Math.floor((new Date() - new Date(exercice.date_ouverture)) / 86400000);

  const exercicePlat = {
    id: exercice.id,
    numero: exercice.numero,
    statut: exercice.statut,
    date_ouverture: exercice.date_ouverture,
    date_cloture: exercice.date_cloture,
    duree_jours: dureeJours,
    motif_reouverture: exercice.motif_reouverture,
    rouvreur_nom: exercice.rouvreur
      ? `${exercice.rouvreur.prenom} ${exercice.rouvreur.nom}`
      : null,
  };

  // Clôturé + snapshot → données figées ; sinon recalcul avec taux actuels
  let bilan;
  if (exercice.statut === 'cloture' && exercice.bilan_snapshot) {
    bilan = exercice.bilan_snapshot;
  } else {
    bilan = await calculerBilan(exercice.id, exercice.statut);
  }

  return { exercice: exercicePlat, bilan };
};

// ── Envoi PDF en réponse HTTP ─────────────────────────────────────────────────
const envoyerPDF = (res, buffer, nomFichier) => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${nomFichier}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
};

// ── GET /exercices/:id/fiches/mapa.pdf ────────────────────────────────────────
const ficheMapa = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const parrain_nom = (req.query.parrain || '').trim();
  const infos = await chargerInfosCabinet();

  const buffer = await genererFicheMAPAPDF(exercice, bilan, parrain_nom, infos);
  envoyerPDF(res, buffer, `fiche-mapa-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/detail-produits.pdf ─────────────────────────────
const ficheDetailProduits = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const infos = await chargerInfosCabinet();

  const buffer = await genererDetailProduitsPDF(exercice, bilan, infos);
  envoyerPDF(res, buffer, `detail-produits-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/recap-delegues.pdf ──────────────────────────────
const ficheRecapDelegues = async (req, res) => {
  const resultat = await chargerExerciceEtBilan(req.params.id);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice, bilan } = resultat;
  const infos = await chargerInfosCabinet();

  const buffer = await genererRecapDeleguesPDF(exercice, bilan, infos);
  envoyerPDF(res, buffer, `recap-delegues-${exercice.numero}.pdf`);
};

// ── GET /exercices/:id/fiches/delegue/:delegueId.pdf ─────────────────────────
const ficheBilanDelegue = async (req, res) => {
  const { id: exerciceId, delegueId } = req.params;
  const utilisateur = req.utilisateur;

  // Un délégué peut uniquement voir son propre bilan
  if (utilisateur.role === 'delegue' && utilisateur.id !== delegueId) {
    return res.status(403).json({ message: 'Accès refusé : vous ne pouvez voir que votre propre bilan' });
  }

  const resultat = await chargerExerciceEtBilan(exerciceId);
  if (!resultat) return res.status(404).json({ message: 'Exercice introuvable' });

  const { exercice } = resultat;

  const delegue = await User.findByPk(delegueId, {
    attributes: ['id', 'nom', 'prenom', 'role'],
  });
  if (!delegue || delegue.role !== 'delegue') {
    return res.status(404).json({ message: 'Délégué introuvable' });
  }

  const ventes = await MouvementDelegue.findAll({
    where: {
      delegue_id: delegueId,
      exercice_id: exerciceId,
      type: 'vente',
    },
    order: [['date_mouvement', 'ASC'], ['created_at', 'ASC']],
    raw: true,
  });

  const infos = await chargerInfosCabinet();
  const buffer = await genererBilanIndividuelPDF(exercice, delegue, ventes, infos);
  const nom = `${delegue.prenom}-${delegue.nom}`.toLowerCase().replace(/\s+/g, '-');
  envoyerPDF(res, buffer, `bilan-delegue-${nom}-${exercice.numero}.pdf`);
};

module.exports = { ficheMapa, ficheDetailProduits, ficheRecapDelegues, ficheBilanDelegue };
