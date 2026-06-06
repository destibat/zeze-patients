'use strict';

const { Patient, Consultation, Ordonnance, Facture, FactureAchat, RendezVous, MouvementDelegue, User, Exercice, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getCabinetId } = require('../config/cabinetContext');

const obtenirStats = async (req, res) => {
  const estAdmin = ['administrateur', 'stockiste'].includes(req.utilisateur.role);
  const userId = req.utilisateur.id;

  const aujourdhui = new Date().toISOString().split('T')[0];
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const debutMoisStr = debutMois.toISOString().split('T')[0];

  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
  const finJour   = new Date(); finJour.setHours(23, 59, 59, 999);

  // Pour l'admin : exclure les factures des délégués du CA du mois
  // (leurs ventes sont déjà comptées via MouvementDelegue type='achat' — double-compter créerait une inflation)
  let delegueIdsArr = [];
  if (estAdmin) {
    const delegueUsers = await User.findAll({ where: { role: 'delegue' }, attributes: ['id'], raw: true });
    delegueIdsArr = delegueUsers.map((u) => u.id);
  }

  // Filtre CA selon le rôle
  const whereFacturesMois = {
    date_facture: { [Op.gte]: debutMois },
    statut: { [Op.notIn]: ['annulee', 'partiellement_payee'] },
    ...(estAdmin
      ? (delegueIdsArr.length > 0 ? { created_by: { [Op.notIn]: delegueIdsArr } } : {})
      : { created_by: userId }),
  };
  const whereRelances = {
    statut: { [Op.in]: ['en_attente', 'partiellement_payee'] },
    ...(estAdmin ? {} : { created_by: userId }),
  };

  // Stockiste : consultations filtrées sur ses propres ordonnances (pas globales)
  const filtreConsultStockiste = req.utilisateur.role === 'stockiste' ? { medecin_id: userId } : {};

  const [patientsActifs, consultationsAujourdhui, consultationsMois, facturesMois, rdvAujourdhui, facturesARelancer] =
    await Promise.all([
      Patient.count({ where: { archive: 0 } }),
      Consultation.count({ where: { date_consultation: aujourdhui, ...filtreConsultStockiste } }),
      Consultation.count({ where: { date_consultation: { [Op.gte]: debutMois }, ...filtreConsultStockiste } }),
      Facture.findAll({
        where: whereFacturesMois,
        attributes: ['montant_paye', 'montant_total'],
        raw: true,
      }),
      RendezVous.count({
        where: {
          date_heure: { [Op.between]: [debutJour, finJour] },
          statut: { [Op.notIn]: ['annule'] },
        },
      }),
      Facture.count({ where: whereRelances }),
    ]);

  const caEncaisseMois = facturesMois.reduce((sum, f) => sum + (f.montant_paye || 0), 0);
  const caFactureMois  = facturesMois.reduce((sum, f) => sum + (f.montant_total || 0), 0);
  let caDirectMois = caEncaisseMois;
  let caMois = caDirectMois;
  let gainsOrdonnancesMois = 0;

  // Pour les délégués : CA = ordonnances + ventes directes stock. Gains via MouvementDelegue type='achat' uniquement.
  if (req.utilisateur.role === 'delegue') {
    const caOrdonnancesMois = caFactureMois;
    const ventesDirectes = await MouvementDelegue.findAll({
      where: {
        delegue_id: userId,
        type: 'vente',
        statut: 'valide',
        date_mouvement: { [Op.gte]: debutMois },
      },
      attributes: ['montant_total'],
      raw: true,
    });
    const caVentesDirectesMois = ventesDirectes.reduce((s, v) => s + (v.montant_total || 0), 0);
    caDirectMois = caOrdonnancesMois;
    caMois = caOrdonnancesMois + caVentesDirectesMois;
    gainsOrdonnancesMois = 0; // Les gains sont désormais uniquement via MouvementDelegue type='achat'
    // Champs supplémentaires transmis pour le dashboard
    req._delegueStats = { caOrdonnancesMois, caVentesDirectesMois };
  }

  // Pour les stockistes et l'admin : KPI CA mois + répartition scope exercice
  let repartition = null;
  if (estAdmin) {
    const exercice = await Exercice.findOne({
      where: { statut: { [Op.in]: ['ouvert', 'rouvert'] } },
      attributes: ['id', 'date_ouverture'],
    });
    const dateExercice = exercice?.date_ouverture
      ? new Date(exercice.date_ouverture).toISOString().split('T')[0]
      : debutMoisStr;
    // Approvisionnements ce mois (commandeAppro + ordonnances source='achat')
    // Source de vérité : MouvementDelegue type='achat' statut='valide' (inclut les deux flux,
    // contrairement à FactureAchat qui manquait les ordonnances source='achat')

    // Données exercice pour la répartition — exclure les Factures des délégués
    // (comptées séparément via gainsDelegues, delegueIdsArr déjà calculé plus haut)

    const filtreFacturesDirectes = {
      statut: { [Op.notIn]: ['annulee', 'partiellement_payee'] },
      date_facture: { [Op.gte]: dateExercice },
      ...(estAdmin
        ? (delegueIdsArr.length > 0 ? { created_by: { [Op.notIn]: delegueIdsArr } } : {})
        : { created_by: userId }),
    };

    const facturesExercice = await Facture.findAll({
      where: filtreFacturesDirectes,
      attributes: ['montant_paye'],
      raw: true,
    });
    const caDirectExercice = facturesExercice.reduce((s, f) => s + (f.montant_paye || 0), 0);

    // Tous les approvisionnements ce mois (pour ca_mois)
    const [caApproMoisAdmin, caApproExerciceAdmin] = await Promise.all([
      MouvementDelegue.sum('montant_total', {
        where: { type: 'achat', statut: 'valide', date_mouvement: { [Op.gte]: debutMoisStr } },
      }),
      MouvementDelegue.sum('montant_total', {
        where: { type: 'achat', statut: 'valide', date_mouvement: { [Op.gte]: dateExercice } },
      }),
    ]);
    caMois += caApproMoisAdmin || 0;

    // Gains sur Factures directes (hors délégués) depuis l'ouverture exercice
    const cabinetIdStats = getCabinetId();
    const excludeClause = delegueIdsArr.length > 0 ? 'AND f.created_by NOT IN (:delegueIds)' : '';
    const rowsConsult = await sequelize.query(
      `SELECT
         COALESCE(SUM(f.montant_paye * COALESCE(u.commission_rate, 0) / 100), 0) AS gains,
         COALESCE(SUM(f.montant_paye * (100 - COALESCE(u.commission_rate, 0)) / 100), 0) AS mapa
       FROM factures f
       LEFT JOIN users u ON f.created_by = u.id AND u.role IN ('stockiste', 'administrateur')
       WHERE f.date_facture >= :debut AND f.statut NOT IN ('annulee', 'partiellement_payee') AND f.cabinet_id = :cabinetId ${excludeClause}`,
      {
        replacements: {
          debut: dateExercice,
          cabinetId: cabinetIdStats,
          ...(delegueIdsArr.length > 0 ? { delegueIds: delegueIdsArr } : {}),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    repartition = {
      taux_total:        null,
      taux_direct:       null,
      taux_indirect:     null,
      taux_mapa:         null,
      ca_direct:         caDirectExercice,
      ca_appro_exercice: caApproExerciceAdmin || 0,
      gains_directs:     Math.round(rowsConsult[0]?.gains || 0),
      part_mapa_direct:  Math.round(rowsConsult[0]?.mapa || 0),
    };
  }

  res.json({
    patients_actifs: patientsActifs,
    consultations_aujourd_hui: consultationsAujourdhui,
    consultations_mois: consultationsMois,
    ca_mois: caMois,
    ca_filtre: !estAdmin,
    rdv_aujourd_hui: rdvAujourdhui,
    factures_a_relancer: facturesARelancer,
    gains_ordonnances_mois: gainsOrdonnancesMois,
    // Détail pour le dashboard délégué
    ca_ordonnances_mois: req._delegueStats?.caOrdonnancesMois ?? null,
    ca_ventes_directes_mois: req._delegueStats?.caVentesDirectesMois ?? null,
    repartition,
  });
};

const obtenirStatsDetaillees = async (req, res) => {
  const maintenant = new Date();
  const { periode = 'annee', annee, mois, semaine, jour, debut, fin } = req.query;
  const estAdmin = ['administrateur', 'stockiste'].includes(req.utilisateur.role);
  const userId = req.utilisateur.id;

  // ── Calcul de la plage de dates selon la période ──────────────────────────
  let dateDebut, dateFin, groupBy, labels;

  if (periode === 'annee') {
    const a = parseInt(annee) || maintenant.getFullYear();
    dateDebut = new Date(a, 0, 1);
    dateFin = new Date(a, 11, 31, 23, 59, 59);
    groupBy = 'mois';
    const moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    labels = moisLabels.map((label, i) => ({ key: i + 1, label }));

  } else if (periode === 'mois') {
    const a = parseInt(annee) || maintenant.getFullYear();
    const m = parseInt(mois) || maintenant.getMonth() + 1;
    dateDebut = new Date(a, m - 1, 1);
    dateFin = new Date(a, m, 0, 23, 59, 59);
    groupBy = 'jour';
    const nbJours = dateFin.getDate();
    labels = Array.from({ length: nbJours }, (_, i) => ({ key: i + 1, label: String(i + 1) }));

  } else if (periode === 'semaine') {
    const base = semaine ? new Date(semaine) : maintenant;
    const lundi = new Date(base);
    const jourSemaine = lundi.getDay() === 0 ? 6 : lundi.getDay() - 1;
    lundi.setDate(lundi.getDate() - jourSemaine);
    lundi.setHours(0, 0, 0, 0);
    dateDebut = lundi;
    dateFin = new Date(lundi);
    dateFin.setDate(dateFin.getDate() + 6);
    dateFin.setHours(23, 59, 59, 999);
    groupBy = 'jour_semaine';
    const joursSemaine = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    labels = joursSemaine.map((label, i) => {
      const d = new Date(lundi);
      d.setDate(d.getDate() + i);
      return { key: d.getDate(), label: `${label} ${d.getDate()}`, date: d };
    });

  } else if (periode === 'jour') {
    const d = jour ? new Date(jour) : maintenant;
    dateDebut = new Date(d); dateDebut.setHours(0, 0, 0, 0);
    dateFin = new Date(d); dateFin.setHours(23, 59, 59, 999);
    groupBy = 'heure';
    labels = Array.from({ length: 24 }, (_, i) => ({ key: i, label: `${String(i).padStart(2,'0')}h` }));

  } else if (periode === 'intervalle') {
    dateDebut = debut ? new Date(debut) : new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    dateFin = fin ? new Date(fin) : maintenant;
    dateFin.setHours(23, 59, 59, 999);
    groupBy = 'date';
    // Labels = chaque jour de l'intervalle
    labels = [];
    const cursor = new Date(dateDebut);
    while (cursor <= dateFin) {
      labels.push({
        key: cursor.toISOString().split('T')[0],
        label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (labels.length > 60) labels = labels.filter((_, i) => i % Math.ceil(labels.length / 60) === 0);
  }

  // ── Requêtes SQL selon groupBy ────────────────────────────────────────────
  const cabinetId = getCabinetId();

  const sqlGroupConsultations = {
    mois:        `SELECT MONTH(date_consultation) AS cle, COUNT(*) AS total FROM consultations WHERE date_consultation BETWEEN :debut AND :fin AND cabinet_id = :cabinetId GROUP BY MONTH(date_consultation)`,
    jour:        `SELECT DAY(date_consultation) AS cle, COUNT(*) AS total FROM consultations WHERE date_consultation BETWEEN :debut AND :fin AND cabinet_id = :cabinetId GROUP BY DAY(date_consultation)`,
    jour_semaine:`SELECT DAY(date_consultation) AS cle, COUNT(*) AS total FROM consultations WHERE date_consultation BETWEEN :debut AND :fin AND cabinet_id = :cabinetId GROUP BY DAY(date_consultation)`,
    heure:       `SELECT HOUR(created_at) AS cle, COUNT(*) AS total FROM consultations WHERE date_consultation = :debutDate AND cabinet_id = :cabinetId GROUP BY HOUR(created_at)`,
    date:        `SELECT DATE(date_consultation) AS cle, COUNT(*) AS total FROM consultations WHERE date_consultation BETWEEN :debut AND :fin AND cabinet_id = :cabinetId GROUP BY DATE(date_consultation)`,
  };

  const filtreUser = estAdmin ? '' : `AND created_by = :userId`;

  const sqlGroupFactures = {
    mois:        `SELECT MONTH(date_facture) AS cle, SUM(montant_total) AS facture, SUM(montant_paye) AS encaisse FROM factures WHERE date_facture BETWEEN :debut AND :fin AND statut NOT IN ('annulee', 'partiellement_payee') AND cabinet_id = :cabinetId ${filtreUser} GROUP BY MONTH(date_facture)`,
    jour:        `SELECT DAY(date_facture) AS cle, SUM(montant_total) AS facture, SUM(montant_paye) AS encaisse FROM factures WHERE date_facture BETWEEN :debut AND :fin AND statut NOT IN ('annulee', 'partiellement_payee') AND cabinet_id = :cabinetId ${filtreUser} GROUP BY DAY(date_facture)`,
    jour_semaine:`SELECT DAY(date_facture) AS cle, SUM(montant_total) AS facture, SUM(montant_paye) AS encaisse FROM factures WHERE date_facture BETWEEN :debut AND :fin AND statut NOT IN ('annulee', 'partiellement_payee') AND cabinet_id = :cabinetId ${filtreUser} GROUP BY DAY(date_facture)`,
    heure:       `SELECT HOUR(created_at) AS cle, SUM(montant_total) AS facture, SUM(montant_paye) AS encaisse FROM factures WHERE date_facture = :debutDate AND statut NOT IN ('annulee', 'partiellement_payee') AND cabinet_id = :cabinetId ${filtreUser} GROUP BY HOUR(created_at)`,
    date:        `SELECT DATE(date_facture) AS cle, SUM(montant_total) AS facture, SUM(montant_paye) AS encaisse FROM factures WHERE date_facture BETWEEN :debut AND :fin AND statut NOT IN ('annulee', 'partiellement_payee') AND cabinet_id = :cabinetId ${filtreUser} GROUP BY DATE(date_facture)`,
  };

  const debutDate = dateDebut.toISOString().split('T')[0];
  const replacements = { debut: dateDebut, fin: dateFin, debutDate, userId, cabinetId };

  const [rowsConsultations, rowsFactures, patientsParSexe, ordonnances] = await Promise.all([
    sequelize.query(sqlGroupConsultations[groupBy], { replacements, type: sequelize.QueryTypes.SELECT }),
    sequelize.query(sqlGroupFactures[groupBy], { replacements, type: sequelize.QueryTypes.SELECT }),
    sequelize.query(`SELECT sexe, COUNT(*) AS total FROM patients WHERE archive = 0 AND cabinet_id = :cabinetId GROUP BY sexe`, { replacements: { cabinetId }, type: sequelize.QueryTypes.SELECT }),
    Ordonnance.findAll({
      where: { date_ordonnance: { [Op.between]: [dateDebut, dateFin] }, statut: { [Op.ne]: 'annulee' } },
      attributes: ['lignes'],
      raw: true,
    }),
  ]);

  // ── Construire les séries ─────────────────────────────────────────────────
  const consultationsChart = labels.map(({ key, label }) => {
    const found = rowsConsultations.find((r) => String(r.cle) === String(key));
    return { label, total: found ? parseInt(found.total) : 0 };
  });

  const caChart = labels.map(({ key, label }) => {
    const found = rowsFactures.find((r) => String(r.cle) === String(key));
    return {
      label,
      facture: found ? parseInt(found.facture) : 0,
      encaisse: found ? parseInt(found.encaisse) : 0,
    };
  });

  // ── Top produits ──────────────────────────────────────────────────────────
  const produitsMap = {};
  for (const ord of ordonnances) {
    let lignes = ord.lignes;
    if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
    for (const l of (lignes || [])) {
      if (!l.nom_produit) continue;
      if (!produitsMap[l.nom_produit]) produitsMap[l.nom_produit] = { nom: l.nom_produit, quantite: 0, ca: 0 };
      produitsMap[l.nom_produit].quantite += l.quantite || 0;
      produitsMap[l.nom_produit].ca += (l.prix_unitaire || 0) * (l.quantite || 0);
    }
  }
  const topProduits = Object.values(produitsMap).sort((a, b) => b.quantite - a.quantite).slice(0, 10);

  const totalConsultations = consultationsChart.reduce((s, d) => s + d.total, 0);
  const totalFacture = caChart.reduce((s, d) => s + d.facture, 0);
  const totalEncaisse = caChart.reduce((s, d) => s + d.encaisse, 0);

  res.json({
    periode,
    date_debut: dateDebut,
    date_fin: dateFin,
    total_consultations: totalConsultations,
    total_facture: totalFacture,
    total_encaisse: totalEncaisse,
    consultations_chart: consultationsChart,
    ca_chart: caChart,
    patients_par_sexe: patientsParSexe,
    top_produits: topProduits,
  });
};

module.exports = { obtenirStats, obtenirStatsDetaillees };
