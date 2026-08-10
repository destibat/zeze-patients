'use strict';

const { Facture, Ordonnance, Patient, User, Exercice, MouvementDelegue, DeclarationProduit, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getCabinetId } = require('../config/cabinetContext');
const { allouerFacture } = require('../services/allocationService');

// Valide les MouvementDelegue type='achat' en_attente liés à une ordonnance
const validerMouvDelegueOrdonnance = async (ordonnance) => {
  if (!ordonnance?.medecin_id) return;
  const cabinetId = getCabinetId();
  await MouvementDelegue.update(
    { statut: 'valide' },
    { where: {
      delegue_id: ordonnance.medecin_id,
      type: 'achat',
      statut: 'en_attente',
      lignes: null,
      date_mouvement: ordonnance.date_ordonnance,
      cabinet_id: cabinetId,
    }}
  );
};
const { genererPdfFacture } = require('../services/pdfFactureService');

const INCLUDE_BASE = [
  { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'telephone', 'numero_dossier'] },
  {
    model: User, as: 'createur', attributes: ['id', 'nom', 'prenom', 'role', 'commission_rate', 'stockiste_id'],
    include: [{ model: User, as: 'stockiste', attributes: ['id', 'nom', 'prenom', 'commission_rate'] }],
  },
];

const genererNumero = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `FAC-${annee}-`;
  const derniere = await Facture.findOne({
    where: { numero: { [Op.like]: `${prefixe}%` } },
    order: [['numero', 'DESC']],
  });
  const seq = derniere ? parseInt(derniere.numero.split('-')[2], 10) + 1 : 1;
  return `${prefixe}${String(seq).padStart(5, '0')}`;
};

// Statut basé sur les DÉCLARATIONS (pas seulement le paiement)
const calculerStatut = (montantDeclare, montantTotal) => {
  if (montantDeclare <= 0) return 'en_attente';
  if (montantDeclare >= montantTotal) return 'soldee';
  return 'partiellement_soldee';
};

const lister = async (req, res) => {
  const { statut, patient_id, debut, fin } = req.query;
  const estAdmin = ['administrateur', 'stockiste'].includes(req.utilisateur.role);

  const where = {};
  if (statut) where.statut = statut;
  if (patient_id) where.patient_id = patient_id;
  if (debut && fin) where.date_facture = { [Op.between]: [debut, fin] };
  else if (debut) where.date_facture = { [Op.gte]: debut };

  // Non-admin : ses propres factures + celles de ses délégués (pour les stockistes)
  if (!estAdmin) {
    if (req.utilisateur.role === 'stockiste') {
      const delegues = await User.findAll({
        where: { stockiste_id: req.utilisateur.id },
        attributes: ['id'],
      });
      const ids = [req.utilisateur.id, ...delegues.map((d) => d.id)];
      where.created_by = { [Op.in]: ids };
    } else {
      where.created_by = req.utilisateur.id;
    }
  }

  const factures = await Facture.findAll({
    where,
    include: INCLUDE_BASE,
    order: [['date_facture', 'DESC'], ['created_at', 'DESC']],
  });
  res.json(factures);
};

const obtenir = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id, {
    include: [
      ...INCLUDE_BASE,
      { model: Ordonnance, as: 'ordonnance', attributes: ['id', 'numero'] },
    ],
  });
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });
  res.json(facture);
};

const creerDepuisOrdonnance = async (req, res) => {
  const { ordonnanceId } = req.params;
  const { notes, mode_paiement, montant_paye = 0 } = req.body;

  // Vérifier qu'un exercice est ouvert
  const exercice = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
    attributes: ['id', 'numero'],
  });
  if (!exercice) {
    return res.status(422).json({
      message: 'Aucun exercice comptable ouvert. Ouvrez un exercice avant d\'émettre une facture.',
      code: 'EXERCICE_REQUIS',
    });
  }

  const ordonnance = await Ordonnance.findByPk(ordonnanceId, {
    include: [{ model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'numero_dossier'] }],
  });
  if (!ordonnance) return res.status(404).json({ message: 'Ordonnance introuvable' });

  const dejaFacturee = await Facture.findOne({
    where: { ordonnance_id: ordonnanceId, statut: { [Op.ne]: 'annulee' } },
  });
  if (dejaFacturee) {
    return res.status(409).json({ message: `Ordonnance déjà facturée (${dejaFacturee.numero})` });
  }

  const paye = Math.min(parseInt(montant_paye) || 0, ordonnance.montant_total);
  const numero = await genererNumero();

  const tx = await sequelize.transaction();
  try {
    const facture = await Facture.create({
      numero,
      patient_id: ordonnance.patient_id,
      ordonnance_id: ordonnanceId,
      created_by: ordonnance.medecin_id,
      date_facture: new Date().toISOString().split('T')[0],
      montant_total: ordonnance.montant_total,
      montant_paye: paye,
      mode_paiement: mode_paiement || null,
      statut: 'en_attente',
      montant_declare: 0,
      avoir: 0,
      lignes: ordonnance.lignes,
      notes,
      exercice_id: exercice.id,
    }, { transaction: tx });

    let statutFinal = 'en_attente';
    if (paye > 0) {
      const { montantDeclare, avoir, statut } = await allouerFacture(facture.id, {
        transaction: tx,
        exerciceId: exercice.id,
        models: { Facture, DeclarationProduit },
      });
      await facture.update({ montant_declare: montantDeclare, avoir, statut }, { transaction: tx });
      statutFinal = statut;
    }

    await tx.commit();

    if (statutFinal === 'soldee') await validerMouvDelegueOrdonnance(ordonnance);

    const factureComplete = await Facture.findByPk(facture.id, { include: INCLUDE_BASE });
    res.status(201).json(factureComplete);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};

const enregistrerPaiement = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });
  if (facture.statut === 'annulee') return res.status(409).json({ message: 'Facture annulée' });
  if (facture.statut === 'soldee')  return res.status(409).json({ message: 'Facture déjà soldée' });

  const { montant, mode_paiement } = req.body;
  const montantSaisi = parseInt(montant, 10) || 0;
  if (montantSaisi <= 0) return res.status(400).json({ message: 'Montant invalide' });

  // Récupérer l'exercice ouvert (nécessaire pour horodater la déclaration)
  const exercice = await Exercice.findOne({
    where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
    attributes: ['id'],
  });
  if (!exercice) {
    return res.status(422).json({ message: 'Aucun exercice ouvert. Ouvrez un exercice avant d\'enregistrer un paiement.', code: 'EXERCICE_REQUIS' });
  }

  const tx = await sequelize.transaction();
  try {
    // Relecture sous verrou : deux paiements concurrents ne doivent pas
    // partir du même montant_paye (perte silencieuse d'un des deux)
    await facture.reload({ transaction: tx, lock: tx.LOCK.UPDATE });
    if (['annulee', 'soldee'].includes(facture.statut)) {
      await tx.rollback();
      return res.status(409).json({ message: facture.statut === 'annulee' ? 'Facture annulée' : 'Facture déjà soldée' });
    }

    // 1. Enregistrer le paiement (plafonné au reste à payer, lu sous verrou)
    const montantAccepte = Math.min(montantSaisi, facture.montant_total - facture.montant_paye);
    const nouveauPaye = facture.montant_paye + montantAccepte;
    await facture.update({
      montant_paye:  nouveauPaye,
      mode_paiement: mode_paiement || facture.mode_paiement,
    }, { transaction: tx });

    // 2. Allouer produit par produit
    const { montantDeclare, avoir, statut } = await allouerFacture(facture.id, {
      transaction:  tx,
      exerciceId:   exercice.id,
      models:       { Facture, DeclarationProduit },
    });

    // 3. Mise à jour statut + montant_declare + avoir
    const updateFinale = { montant_declare: montantDeclare, avoir, statut };

    // Gestion recouvrement : première fois que la facture est soldée dans un exercice différent
    if (statut === 'soldee' && !facture.recouvrement_exercice_id && exercice.id !== facture.exercice_id) {
      updateFinale.recouvrement_exercice_id = exercice.id;
    }

    await facture.update(updateFinale, { transaction: tx });

    await tx.commit();

    // Valider les MouvementDelegue associés si facture soldée
    if (statut === 'soldee' && facture.ordonnance_id) {
      const ordonnance = await Ordonnance.findByPk(facture.ordonnance_id, { attributes: ['medecin_id', 'date_ordonnance'] });
      await validerMouvDelegueOrdonnance(ordonnance);
    }

    const factureComplete = await Facture.findByPk(facture.id, {
      include: [
        ...INCLUDE_BASE,
        { model: DeclarationProduit, as: 'declarations', attributes: ['ligne_index', 'nom_produit', 'prix_unitaire', 'exercice_id', 'date_declaration'] },
      ],
    });
    res.json(factureComplete);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};

const annuler = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id);
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });
  if (facture.montant_declare > 0) {
    return res.status(409).json({ message: 'Impossible d\'annuler : des produits ont déjà été déclarés et comptabilisés.' });
  }
  await facture.update({ statut: 'annulee' });
  res.json(facture);
};

const listerAvoirs = async (req, res) => {
  const estAdmin = ['administrateur', 'stockiste'].includes(req.utilisateur.role);
  const where = { avoir: { [Op.gt]: 0 } };

  if (!estAdmin) {
    if (req.utilisateur.role === 'stockiste') {
      const delegues = await User.findAll({ where: { stockiste_id: req.utilisateur.id }, attributes: ['id'] });
      where.created_by = { [Op.in]: [req.utilisateur.id, ...delegues.map((d) => d.id)] };
    } else {
      where.created_by = req.utilisateur.id;
    }
  }

  const factures = await Facture.findAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'telephone', 'numero_dossier'] },
      { model: User, as: 'createur', attributes: ['id', 'nom', 'prenom', 'role'] },
      { model: Exercice, as: 'exercice', attributes: ['id', 'numero', 'statut'] },
    ],
    order: [['patient_id', 'ASC'], ['date_facture', 'ASC']],
  });
  res.json(factures);
};

const listerCreanciers = async (req, res) => {
  const estAdmin = ['administrateur', 'stockiste'].includes(req.utilisateur.role);
  const where = { statut: { [Op.in]: ['en_attente', 'partiellement_soldee'] } };

  if (!estAdmin) {
    if (req.utilisateur.role === 'stockiste') {
      const delegues = await User.findAll({ where: { stockiste_id: req.utilisateur.id }, attributes: ['id'] });
      where.created_by = { [Op.in]: [req.utilisateur.id, ...delegues.map((d) => d.id)] };
    } else {
      where.created_by = req.utilisateur.id;
    }
  }

  const factures = await Facture.findAll({
    where,
    include: [
      ...INCLUDE_BASE,
      { model: Exercice, as: 'exercice', attributes: ['id', 'numero', 'statut'] },
    ],
    order: [['patient_id', 'ASC'], ['date_facture', 'ASC']],
  });
  res.json(factures);
};

const telechargerPdf = async (req, res) => {
  const facture = await Facture.findByPk(req.params.id, {
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'nom', 'prenom', 'telephone', 'numero_dossier'] },
      { model: User,    as: 'createur', attributes: ['id', 'nom', 'prenom', 'telephone'] },
    ],
  });
  if (!facture) return res.status(404).json({ message: 'Facture introuvable' });

  const buffer = await genererPdfFacture(facture, facture.patient, facture.createur);

  const nomFichier = `facture_${facture.numero}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
  res.send(buffer);
};

module.exports = { lister, obtenir, creerDepuisOrdonnance, enregistrerPaiement, annuler, listerAvoirs, listerCreanciers, telechargerPdf };
