/**
 * Moteur d'interprétation biologique — NFS + Rénal + Glycémie + Lipidique + Ionogramme
 */

export const SEVERITE = {
  NORMAL:    'normal',
  INFO:      'info',
  ATTENTION: 'attention',
  CRITIQUE:  'critique',
};

export const couleurSeverite = (sev) => ({
  [SEVERITE.NORMAL]:    'bg-green-50 border-green-200 text-green-800',
  [SEVERITE.INFO]:      'bg-blue-50 border-blue-200 text-blue-800',
  [SEVERITE.ATTENTION]: 'bg-orange-50 border-orange-200 text-orange-800',
  [SEVERITE.CRITIQUE]:  'bg-red-50 border-red-300 text-red-900',
})[sev] || 'bg-gray-50 border-gray-200 text-gray-700';

export const iconesSeverite = {
  [SEVERITE.NORMAL]:    '✓',
  [SEVERITE.INFO]:      'ℹ',
  [SEVERITE.ATTENTION]: '⚠',
  [SEVERITE.CRITIQUE]:  '✕',
};

const v = (val) => (val !== null && val !== undefined && val !== '') ? parseFloat(val) : null;
const entre = (x, min, max) => x !== null && x >= min && x <= max;

// ─────────────────────────────────────────────────────────────────────────────
// NFS (réutilise la logique existante — conservée intégralement)
// ─────────────────────────────────────────────────────────────────────────────
function interpreterNFS(vals, sexe) {
  const s = sexe === 'F' ? 'F' : 'H';
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const REF = {
    hb:    { H: [13.0, 17.0], F: [12.0, 16.0] },
    ht:    { H: [40, 54],     F: [35, 47] },
    gr:    { H: [4.5, 5.9],   F: [4.0, 5.2] },
    vgm:   [80, 100], tcmh: [27, 33], ccmh: [32, 36], rdw: [11.5, 14.5],
    gb:    [4.0, 10.0], neut: [1.8, 7.5], lymph: [1.0, 4.0],
    mono:  [0.2, 1.0], eosino: [0.0, 0.5], baso: [0.0, 0.1], plaq: [150, 400],
  };

  const hb    = v(vals.hemoglobine);
  const vgm   = v(vals.vgm);
  const tcmh  = v(vals.tcmh);
  const ccmh  = v(vals.ccmh);
  const rdw   = v(vals.rdw);
  const plaq  = v(vals.plaquettes);
  const gb    = v(vals.globules_blancs);
  const neut  = v(vals.neutrophiles_abs);
  const lymph = v(vals.lymphocytes_abs);
  const eosino = v(vals.eosinophiles_abs);
  const mono  = v(vals.monocytes_abs);
  const baso  = v(vals.basophiles_abs);
  const gr    = v(vals.globules_rouges);
  const ht    = v(vals.hematocrite);
  const refHb = REF.hb[s];

  if (hb !== null) {
    if (hb < refHb[0]) {
      const sev = hb < 7 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      const degre = hb < 7 ? 'sévère' : hb < 10 ? 'modérée' : 'légère';
      if (vgm !== null) {
        if (vgm < 80) {
          if (tcmh !== null && tcmh < 27 && ccmh !== null && ccmh < 32) {
            add('ANEMIE_MICRO_HYPO', 'Anémie hypochrome microcytaire',
              `Hb ${hb} g/dL (${degre}), VGM ${vgm} fL, TCMH ${tcmh} pg, CCMH ${ccmh} g/dL. Tableau évocateur d'une carence martiale. Bilan fer recommandé : fer sérique, ferritine, saturation transferrine. À distinguer d'une thalassémie mineure.`, sev);
          } else {
            add('ANEMIE_MICRO', 'Anémie microcytaire',
              `Hb ${hb} g/dL (${degre}), VGM ${vgm} fL. Carence en fer ou thalassémie à explorer. Compléter par fer sérique, ferritine, électrophorèse de l'Hb.`, sev);
          }
        } else if (vgm > 100) {
          add('ANEMIE_MACRO', 'Anémie macrocytaire',
            `Hb ${hb} g/dL (${degre}), VGM ${vgm} fL. Causes : carence B12 ou folates, hypothyroïdie, hépatopathie. Bilan : B12, folates, TSH, bilan hépatique.`, sev);
        } else {
          if (plaq !== null && plaq < 150 && gb !== null && gb < 4) {
            add('PANCYTOPENIE', 'Pancytopénie — aplasie médullaire possible',
              `Hb ${hb} g/dL, GB ${gb} G/L, plaquettes ${plaq} G/L. Atteinte des 3 lignées. Avis hématologique urgent, myélogramme indiqué.`, SEVERITE.CRITIQUE);
          } else {
            add('ANEMIE_NORMO', 'Anémie normocytaire normochrome',
              `Hb ${hb} g/dL (${degre}), VGM normal ${vgm} fL. Explorer : hémorragie aiguë, insuffisance rénale, inflammation, hémolyse. Compléter par réticulocytes, haptoglobine, bilirubine.`, sev);
          }
        }
      } else {
        add('ANEMIE', 'Anémie',
          `Hb ${hb} g/dL (${degre}). Saisir VGM, TCMH, CCMH pour préciser le type.`, sev);
      }
    } else if (hb > refHb[1]) {
      add('POLYGLOBULIE', 'Polyglobulie',
        `Hb ${hb} g/dL > norme (${refHb[0]}–${refHb[1]} g/dL). ${gr && gr > REF.gr[s][1] ? `GR ${gr} T/L élevés. ` : ''}${ht && ht > REF.ht[s][1] ? `Ht ${ht}% élevé. ` : ''}Causes : polyglobulie de Vaquez, hypoxie chronique, déshydratation. Dosage EPO + consultation hématologique.`, SEVERITE.ATTENTION);
    } else {
      add('HB_NORMALE', 'Hémoglobine normale',
        `Hb ${hb} g/dL — dans les valeurs de référence (${refHb[0]}–${refHb[1]} g/dL).`, SEVERITE.NORMAL);
    }
  }

  if (rdw !== null && rdw > 14.5 && (hb === null || entre(hb, refHb[0], refHb[1]))) {
    add('RDW_ELEVE', 'Anisocytose (RDW élevé)',
      `RDW ${rdw}% (norme : 11,5–14,5%). Peut précéder une anémie ferriprive ou s'observer dans les carences mixtes.`, SEVERITE.INFO);
  }

  if (gb !== null) {
    if (gb < 4.0) {
      add('LEUCOPENIE', 'Leucopénie', `GB ${gb} G/L (norme : 4–10 G/L). Causes : infection virale, médicaments, lupus, aplasie.`, gb < 2 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    } else if (gb > 10.0) {
      add('LEUCOCYTOSE', 'Hyperleucocytose', `GB ${gb} G/L (norme : 4–10 G/L). ${gb > 30 ? 'Majeure — évoquer une leucémie. Avis hématologique urgent. ' : 'Infection bactérienne, inflammation, corticothérapie.'}`, gb > 30 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    }
  }

  if (neut !== null) {
    if (neut < 1.8) add('NEUTROPENIE', 'Neutropénie', `Neutrophiles ${neut} G/L. ${neut < 0.5 ? 'Agranulocytose — risque infectieux vital. ' : ''}Causes : médicaments, infections virales, lupus.`, neut < 0.5 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    else if (neut > 7.5) add('NEUTROPHILIE', 'Neutrophilie', `Neutrophiles ${neut} G/L. Infection bactérienne, inflammation, corticothérapie.`, SEVERITE.ATTENTION);
  }

  if (lymph !== null) {
    if (lymph < 1.0) add('LYMPHOPENIE', 'Lymphopénie', `Lymphocytes ${lymph} G/L. Infection virale sévère (VIH, CMV), corticothérapie.`, SEVERITE.ATTENTION);
    else if (lymph > 4.0) add('LYMPHOCYTOSE', 'Lymphocytose', `Lymphocytes ${lymph} G/L. ${lymph > 10 ? 'LLC à envisager. Immunophénotypage recommandé. ' : 'Infection virale (MNI, CMV, coqueluche).'}`, lymph > 10 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (eosino !== null && eosino > 0.5) {
    add('EOSINOPHILIE', 'Éosinophilie', `Éosinophiles ${eosino} G/L. ${eosino > 1.5 ? 'Hyperéosinophilie — risque cardiaque. ' : ''}Fréquent en Afrique de l'Ouest : parasitoses (ascaridiase, bilharziose, filariose), allergie.`, eosino > 1.5 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (mono !== null && mono > 1.0) {
    add('MONOCYTOSE', 'Monocytose', `Monocytes ${mono} G/L. Infections chroniques (tuberculose, paludisme), maladies inflammatoires.`, SEVERITE.ATTENTION);
  }

  if (baso !== null && baso > 0.1) {
    add('BASOPHILIE', 'Basophilie', `Basophiles ${baso} G/L. Évoquer LMC si hyperleucocytose associée.`, SEVERITE.ATTENTION);
  }

  if (plaq !== null) {
    if (plaq < 150) {
      const sev = plaq < 50 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('THROMBOPENIE', 'Thrombopénie', `Plaquettes ${plaq} G/L. ${plaq < 20 ? 'Risque hémorragique spontané — hospitalisation urgente. ' : plaq < 50 ? 'Contre-indication aux gestes invasifs. ' : ''}Causes : PTI, paludisme, dengue, VIH, CIVD.`, sev);
    } else if (plaq > 400) {
      add('THROMBOCYTOSE', 'Thrombocytose', `Plaquettes ${plaq} G/L. ${plaq > 1000 ? 'Thrombocytémie essentielle — avis hématologique. ' : 'Thrombocytose réactionnelle : carence en fer, infection, inflammation.'}`, SEVERITE.ATTENTION);
    }
  }

  if (commentaires.filter((c) => c.severite !== SEVERITE.NORMAL).length === 0 && commentaires.length > 0) {
    add('NFS_NORMALE', 'NFS dans les limites de la normale',
      'Tous les paramètres hématologiques sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if (commentaires.length === 0) {
    add('NFS_INCOMPLET', 'Données insuffisantes', "Saisir au moins l'hémoglobine.", SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilan rénal
// ─────────────────────────────────────────────────────────────────────────────
function interpreterRenal(vals, sexe) {
  const s = sexe === 'F' ? 'F' : 'H';
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const creat = v(vals.creatinine);    // µmol/L
  const uree  = v(vals.uree);          // mmol/L
  const au    = v(vals.acide_urique);  // µmol/L
  const dfg   = v(vals.dfg);           // mL/min/1.73m²

  const refCreat = s === 'F' ? [44, 97] : [53, 106];
  const refAU    = s === 'F' ? [143, 339] : [202, 416];

  let anomalie = false;

  if (creat !== null) {
    if (creat > refCreat[1]) {
      anomalie = true;
      const sev = creat > 300 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('CREAT_ELEVEE', 'Créatininémie élevée',
        `Créatinine ${creat} µmol/L (norme : ${refCreat[0]}–${refCreat[1]} µmol/L). ${creat > 300 ? 'Insuffisance rénale sévère. ' : ''}Causes : insuffisance rénale aiguë ou chronique, déshydratation, rhabdomyolyse. Bilan complémentaire : urée, ionogramme, échographie rénale.`, sev);
    } else if (creat < refCreat[0]) {
      add('CREAT_BASSE', 'Créatininémie basse',
        `Créatinine ${creat} µmol/L. Peut s'observer dans la dénutrition ou la cachexie.`, SEVERITE.INFO);
    }
  }

  if (uree !== null && uree > 7.5) {
    anomalie = true;
    add('UREE_ELEVEE', 'Urée sanguine élevée',
      `Urée ${uree} mmol/L (norme : 2,5–7,5 mmol/L). ${uree > 15 ? 'Urémie importante. ' : ''}Causes : insuffisance rénale, déshydratation, hypercatabolisme, régime hyperprotéiné.`, uree > 15 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (dfg !== null) {
    if (dfg < 15) {
      anomalie = true;
      add('IRC_SEVERE', 'Insuffisance rénale chronique stade 5 (terminale)',
        `DFG ${dfg} mL/min/1.73m² — dialyse ou transplantation à envisager.`, SEVERITE.CRITIQUE);
    } else if (dfg < 30) {
      anomalie = true;
      add('IRC_MODEREE', 'Insuffisance rénale chronique stade 3b–4',
        `DFG ${dfg} mL/min/1.73m². Surveillance néphrologue, adaptation des médicaments néphrotoxiques.`, SEVERITE.CRITIQUE);
    } else if (dfg < 60) {
      anomalie = true;
      add('IRC_LEGERE', 'Insuffisance rénale chronique stade 3a',
        `DFG ${dfg} mL/min/1.73m² (norme > 60). Suivi régulier, contrôle tension artérielle, éviter AINS.`, SEVERITE.ATTENTION);
    }
  }

  if (au !== null && au > refAU[1]) {
    anomalie = true;
    add('HYPERURICEMIE', 'Hyperuricémie',
      `Acide urique ${au} µmol/L (norme : ${refAU[0]}–${refAU[1]} µmol/L). Risque de goutte. Régime pauvre en purines (viandes rouges, abats, alcool). Traitement hypouricémiant si crises récidivantes.`, SEVERITE.ATTENTION);
  }

  if (!anomalie && [creat, uree, dfg].some((x) => x !== null)) {
    add('RENAL_NORMAL', 'Bilan rénal normal',
      'Les paramètres rénaux sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if ([creat, uree, dfg, au].every((x) => x === null)) {
    add('RENAL_INCOMPLET', 'Données insuffisantes', 'Saisir au moins la créatinine.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilan glycémique
// ─────────────────────────────────────────────────────────────────────────────
function interpreterGlycemie(vals) {
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const gj   = v(vals.glycemie_jeun);           // mmol/L
  const gpp  = v(vals.glycemie_postprandiale);  // mmol/L
  const hba1c = v(vals.hba1c);                  // %

  let anomalie = false;

  if (gj !== null) {
    if (gj >= 7.0) {
      anomalie = true;
      add('DIABETE_GJ', 'Diabète probable (glycémie à jeun)',
        `Glycémie à jeun ${gj} mmol/L ≥ 7,0 mmol/L. Critère diagnostique de diabète si confirmé par un 2e dosage. Consultation diabétologue recommandée.`, gj >= 11 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    } else if (gj >= 5.6) {
      anomalie = true;
      add('PREDIABETE_GJ', 'Prédiabète (glycémie à jeun)',
        `Glycémie à jeun ${gj} mmol/L (5,6–6,9 mmol/L = zone prédiabétique). Mesures hygiéno-diététiques : réduction sucres rapides, activité physique régulière. Contrôle dans 3–6 mois.`, SEVERITE.INFO);
    } else if (gj < 3.9) {
      anomalie = true;
      add('HYPOGLYCEMIE', 'Hypoglycémie',
        `Glycémie à jeun ${gj} mmol/L < 3,9 mmol/L. ${gj < 2.8 ? 'Hypoglycémie sévère — risque de coma. ' : ''}Causes : jeûne prolongé, insulinome, médicaments hypoglycémiants.`, gj < 2.8 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    }
  }

  if (gpp !== null && gpp >= 11.1) {
    anomalie = true;
    add('DIABETE_GPP', 'Diabète probable (glycémie postprandiale)',
      `Glycémie postprandiale ${gpp} mmol/L ≥ 11,1 mmol/L (2h après repas). Critère diagnostique de diabète si confirmé.`, SEVERITE.ATTENTION);
  }

  if (hba1c !== null) {
    if (hba1c >= 6.5) {
      anomalie = true;
      add('HBA1C_DIABETE', 'HbA1c — diabète',
        `HbA1c ${hba1c}% ≥ 6,5%. Reflet de la glycémie moyenne sur 3 mois. Équilibration du diabète insuffisante si déjà traité. Objectif thérapeutique habituel : < 7%.`, hba1c >= 9 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    } else if (hba1c >= 5.7) {
      anomalie = true;
      add('HBA1C_PREDIABETE', 'HbA1c — prédiabète',
        `HbA1c ${hba1c}% (5,7–6,4%). Zone prédiabétique. Prévention par modification du mode de vie.`, SEVERITE.INFO);
    }
  }

  if (!anomalie && [gj, gpp, hba1c].some((x) => x !== null)) {
    add('GLYCEMIE_NORMALE', 'Bilan glycémique normal',
      'Les paramètres glycémiques sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if ([gj, gpp, hba1c].every((x) => x === null)) {
    add('GLYCEMIE_INCOMPLET', 'Données insuffisantes', 'Saisir au moins la glycémie à jeun.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilan lipidique
// ─────────────────────────────────────────────────────────────────────────────
function interpreterLipidique(vals, sexe) {
  const s = sexe === 'F' ? 'F' : 'H';
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const ct   = v(vals.cholesterol_total); // mmol/L
  const ldl  = v(vals.ldl);              // mmol/L
  const hdl  = v(vals.hdl);              // mmol/L
  const tg   = v(vals.triglycerides);    // mmol/L

  const hdlMin = s === 'F' ? 1.3 : 1.0;
  let anomalie = false;

  if (ct !== null && ct >= 5.2) {
    anomalie = true;
    add('HYPERCHOL', 'Hypercholestérolémie',
      `Cholestérol total ${ct} mmol/L (cible < 5,2 mmol/L). ${ct >= 6.2 ? 'Hypercholestérolémie importante. ' : ''}Régime : réduire graisses saturées et trans, augmenter fibres. Si LDL élevé : évaluer risque cardiovasculaire pour décision thérapeutique.`, ct >= 6.2 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (ldl !== null && ldl > 3.4) {
    anomalie = true;
    add('LDL_ELEVE', 'LDL-cholestérol élevé',
      `LDL ${ldl} mmol/L (cible < 3,4 mmol/L). Le LDL est le principal facteur de risque cardiovasculaire modifiable. Objectif individualisé selon risque global (SCORE). Statines à envisager si risque élevé.`, ldl > 5.0 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (hdl !== null && hdl < hdlMin) {
    anomalie = true;
    add('HDL_BAS', 'HDL-cholestérol bas',
      `HDL ${hdl} mmol/L (cible > ${hdlMin} mmol/L). HDL bas = facteur de risque cardiovasculaire. Activité physique régulière, arrêt tabac, traitement médicamenteux si nécessaire.`, SEVERITE.ATTENTION);
  }

  if (tg !== null && tg > 1.7) {
    anomalie = true;
    add('HYPERTG', 'Hypertriglycéridémie',
      `Triglycérides ${tg} mmol/L (norme < 1,7 mmol/L). ${tg > 5.6 ? 'Risque de pancréatite aiguë. ' : ''}Causes : diabète, alcool, obésité, hypothyroïdie, médicaments. Régime : réduire sucres rapides et alcool.`, tg > 5.6 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (!anomalie && [ct, ldl, hdl, tg].some((x) => x !== null)) {
    add('LIPIDES_NORMAUX', 'Bilan lipidique normal',
      'Les paramètres lipidiques sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if ([ct, ldl, hdl, tg].every((x) => x === null)) {
    add('LIPIDES_INCOMPLET', 'Données insuffisantes', 'Saisir au moins le cholestérol total.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ionogramme
// ─────────────────────────────────────────────────────────────────────────────
function interpreterIonogramme(vals) {
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const na   = v(vals.sodium);          // mmol/L  136–145
  const k    = v(vals.potassium);       // mmol/L  3,5–5,0
  const cl   = v(vals.chlore);          // mmol/L  98–107
  const ca   = v(vals.calcium);         // mmol/L  2,2–2,6
  const mg   = v(vals.magnesium);       // mmol/L  0,75–0,95
  const ph   = v(vals.phosphore);       // mmol/L  0,81–1,45
  const hco3 = v(vals.bicarbonates);    // mmol/L  22–29

  let anomalie = false;

  if (na !== null) {
    if (na < 136) { anomalie = true; add('HYPONATREMIE', 'Hyponatrémie', `Na ${na} mmol/L < 136. ${na < 125 ? 'Hyponatrémie sévère — risque neurologique (convulsions, coma). Correction urgente. ' : ''}Causes : hyperhydratation, insuffisance surrénale, SIADH, médicaments.`, na < 125 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
    else if (na > 145) { anomalie = true; add('HYPERNATREMIE', 'Hypernatrémie', `Na ${na} mmol/L > 145. Déshydratation, diabète insipide. Réhydratation progressive.`, na > 155 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
  }

  if (k !== null) {
    if (k < 3.5) { anomalie = true; add('HYPOKALIEMIE', 'Hypokaliémie', `K ${k} mmol/L < 3,5. ${k < 3.0 ? 'Risque de troubles du rythme cardiaque. ' : ''}Causes : diurétiques, vomissements, diarrhées. Supplémentation potassique.`, k < 3.0 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
    else if (k > 5.0) { anomalie = true; add('HYPERKALIEMIE', 'Hyperkaliémie', `K ${k} mmol/L > 5,0. ${k > 6.0 ? 'Risque vital de fibrillation ventriculaire. ECG urgent. ' : ''}Causes : insuffisance rénale, ACE inhibiteurs, lyse cellulaire.`, k > 6.0 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
  }

  if (ca !== null) {
    if (ca < 2.2) { anomalie = true; add('HYPOCALCEMIE', 'Hypocalcémie', `Ca ${ca} mmol/L < 2,2. ${ca < 1.8 ? 'Risque de tétanie, convulsions. ' : ''}Causes : hypoparathyroïdie, carence en vitamine D, malabsorption.`, ca < 1.8 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
    else if (ca > 2.6) { anomalie = true; add('HYPERCALCEMIE', 'Hypercalcémie', `Ca ${ca} mmol/L > 2,6. ${ca > 3.0 ? 'Hypercalcémie sévère — risque cardiaque et rénal. ' : ''}Causes : hyperparathyroïdie, hypervitaminose D, cancer.`, ca > 3.0 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
  }

  if (k !== null && entre(k, 3.5, 5.0) && na !== null && entre(na, 136, 145) && ca !== null && entre(ca, 2.2, 2.6)) {
    // principaux ions normaux
  }

  if (hco3 !== null) {
    if (hco3 < 22) { anomalie = true; add('ACIDOSE', 'Acidose métabolique (bicarbonates bas)', `HCO3 ${hco3} mmol/L < 22. Causes : acidocétose diabétique, insuffisance rénale, diarrhée sévère.`, hco3 < 15 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION); }
    else if (hco3 > 29) { anomalie = true; add('ALCALOSE', 'Alcalose métabolique (bicarbonates élevés)', `HCO3 ${hco3} mmol/L > 29. Causes : vomissements répétés, diurétiques, hyperaldostéronisme.`, SEVERITE.ATTENTION); }
  }

  const saisies = [na, k, cl, ca, mg, ph, hco3].filter((x) => x !== null).length;
  if (!anomalie && saisies > 0) {
    add('IONOGRAMME_NORMAL', 'Ionogramme normal',
      'Les électrolytes sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if (saisies === 0) {
    add('IONOGRAMME_INCOMPLET', 'Données insuffisantes', 'Saisir au moins le sodium et le potassium.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilan hépatique complet (CRP, transaminases, GGT, PAL, bilirubine, albumine)
// ─────────────────────────────────────────────────────────────────────────────
function interpreterHapatique(vals, sexe) {
  const s = sexe === 'F' ? 'F' : 'H';
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const crp   = v(vals.crp);
  const asat  = v(vals.asat);
  const alat  = v(vals.alat);
  const ggt   = v(vals.ggt);
  const pal   = v(vals.pal);
  const bilT  = v(vals.bilirubine_totale);
  const bilD  = v(vals.bilirubine_directe);
  const alb   = v(vals.albumine);
  let anomalie = false;

  if (crp !== null) {
    if (crp >= 100) {
      anomalie = true;
      add('CRP_SEVERE', 'CRP très élevée', `CRP ${crp} mg/L — inflammation sévère. Suspicion d'infection bactérienne grave ou maladie inflammatoire aiguë. Prise en charge urgente recommandée.`, SEVERITE.CRITIQUE);
    } else if (crp >= 30) {
      anomalie = true;
      add('CRP_ELEVEE', 'CRP nettement élevée', `CRP ${crp} mg/L (> 30). Inflammation importante. Causes : infection bactérienne, poussée inflammatoire, traumatisme récent.`, SEVERITE.ATTENTION);
    } else if (crp >= 6) {
      anomalie = true;
      add('CRP_MODEREE', 'CRP modérément élevée', `CRP ${crp} mg/L (norme < 6). Inflammation légère à modérée. Peut orienter vers une infection débutante ou une pathologie inflammatoire.`, SEVERITE.ATTENTION);
    }
  }

  if (asat !== null && asat > 40) {
    anomalie = true;
    add('ASAT_ELEVEE', 'ASAT (GOT) élevée', `ASAT ${asat} UI/L (norme 10–40). ${asat > 120 ? 'Cytolyse hépatique importante. ' : ''}Causes : hépatite virale ou médicamenteuse, stéatose, effort physique intense, infarctus.`, asat > 120 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (alat !== null && alat > 35) {
    anomalie = true;
    add('ALAT_ELEVEE', 'ALAT (TGP) élevée', `ALAT ${alat} UI/L (norme 10–35). L'ALAT est spécifique du foie. ${alat > 105 ? 'Cytolyse hépatique significative. ' : ''}Causes : hépatite virale, stéatose hépatique, toxicité médicamenteuse.`, alat > 105 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  const ggtMax = s === 'F' ? 35 : 50;
  if (ggt !== null && ggt > ggtMax) {
    anomalie = true;
    const ratio = Math.round(ggt / ggtMax);
    add('GGT_ELEVEE', 'GGT (Gamma-GT) élevée',
      `GGT ${ggt} UI/L (norme ${s === 'F' ? '< 35' : '< 50'} UI/L pour ${s === 'F' ? 'la femme' : "l'homme"})${ratio >= 3 ? ' — élévation importante' : ''}. Causes : stéatose hépatique, alcool, médicaments hépatotoxiques, cholestase. Marqueur sensible mais peu spécifique.`,
      ratio >= 5 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (pal !== null) {
    if (pal > 130) {
      anomalie = true;
      add('PAL_ELEVEE', 'Phosphatases alcalines (PAL) élevées',
        `PAL ${pal} UI/L (norme 40–130). ${pal > 3 * 130 ? 'Élévation majeure. ' : ''}Causes : cholestase (obstruction biliaire, cirrhose), maladie osseuse de Paget, métastases osseuses, grossesse.`,
        pal > 3 * 130 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    } else if (pal < 40) {
      add('PAL_BASSE', 'Phosphatases alcalines basses', `PAL ${pal} UI/L. Peut s'observer en cas de carence en zinc, hypothyroïdie, anémie pernicieuse.`, SEVERITE.INFO);
    }
  }

  if (bilT !== null) {
    if (bilT > 34) {
      anomalie = true;
      add('ICTERE', 'Ictère clinique (bilirubine totale)',
        `Bilirubine totale ${bilT} µmol/L > 34 (seuil d'ictère clinique). ${bilD !== null ? (bilD / bilT > 0.5 ? 'Prédominance directe (conjuguée) → ictère cholestatique (obstacle biliaire, hépatite). ' : 'Prédominance indirecte (libre) → ictère hémolytique ou Gilbert. ') : ''}Bilan étiologique recommandé.`,
        bilT > 100 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
    } else if (bilT > 17) {
      anomalie = true;
      add('BILIRUBINE_ELEVEE', 'Hyperbilirubinémie modérée',
        `Bilirubine totale ${bilT} µmol/L (norme < 17). Élévation infraclinique (ictère < 34 µmol/L). Peut orienter vers une hémolyse débutante ou une pathologie hépatique.`, SEVERITE.INFO);
    }
  }

  if (alb !== null) {
    if (alb < 30) {
      anomalie = true;
      add('HYPOALB_SEVERE', 'Hypoalbuminémie sévère',
        `Albumine ${alb} g/L (norme 35–50). Marqueur d'insuffisance hépatocellulaire grave, dénutrition sévère ou syndrome néphrotique. Risque d'ascite et d'œdèmes.`, SEVERITE.CRITIQUE);
    } else if (alb < 35) {
      anomalie = true;
      add('HYPOALB', 'Hypoalbuminémie',
        `Albumine ${alb} g/L (norme 35–50). Causes : insuffisance hépatique chronique, dénutrition, syndrome inflammatoire chronique, pertes rénales.`, SEVERITE.ATTENTION);
    }
  }

  const saisies = [crp, asat, alat, ggt, pal, bilT, alb].filter((x) => x !== null).length;
  if (!anomalie && saisies > 0) {
    add('HEPATIQUE_NORMAL', 'Bilan hépatique normal', 'Les paramètres hépatiques sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if (saisies === 0) {
    add('HEPATIQUE_INCOMPLET', 'Données insuffisantes', 'Saisir au moins CRP, ASAT, ALAT ou GGT.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilan thyroïdien (TSH, T3L, T4L)
// ─────────────────────────────────────────────────────────────────────────────
function interpreterThyroide(vals) {
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const tsh = v(vals.tsh);   // mUI/L — norme 0,4–4,0
  const ft3 = v(vals.ft3);   // pmol/L — norme 3,5–6,5
  const ft4 = v(vals.ft4);   // pmol/L — norme 10–26
  let anomalie = false;

  if (tsh !== null) {
    if (tsh < 0.1) {
      anomalie = true;
      const ft4Elev = ft4 !== null && ft4 > 26;
      const ft3Elev = ft3 !== null && ft3 > 6.5;
      add('HYPER_FRANCHE', 'Hyperthyroïdie franche',
        `TSH ${tsh} mUI/L < 0,1. ${ft4Elev || ft3Elev ? 'T3L/T4L élevées — hyperthyroïdie clinique confirmée. ' : ''}Causes : maladie de Basedow, nodule autonome, thyroïdite de De Quervain. Avis endocrinologique urgent.`,
        SEVERITE.CRITIQUE);
    } else if (tsh < 0.4) {
      anomalie = true;
      add('HYPER_FRUSTRE', 'Hyperthyroïdie fruste (TSH basse)',
        `TSH ${tsh} mUI/L (norme 0,4–4,0). ${ft4 !== null && entre(ft4, 10, 26) && ft3 !== null && entre(ft3, 3.5, 6.5) ? 'T3L/T4L normales — hyperthyroïdie subclinique. ' : ''}Contrôle à 3 mois recommandé. Peut évoluer vers une hyperthyroïdie franche ou normalisation.`,
        SEVERITE.ATTENTION);
    } else if (tsh > 10) {
      anomalie = true;
      const ft4Bas = ft4 !== null && ft4 < 10;
      add('HYPO_FRANCHE', 'Hypothyroïdie franche',
        `TSH ${tsh} mUI/L > 10. ${ft4Bas ? 'T4L basse — hypothyroïdie primaire confirmée. ' : ''}Causes : thyroïdite de Hashimoto, post-thyroïdectomie, carence iodée. Substitution par L-thyroxine nécessaire.`,
        SEVERITE.CRITIQUE);
    } else if (tsh > 4.0) {
      anomalie = true;
      add('HYPO_FRUSTRE', 'Hypothyroïdie fruste (TSH haute)',
        `TSH ${tsh} mUI/L (norme 0,4–4,0). ${ft4 !== null && entre(ft4, 10, 26) ? 'T4L normale — hypothyroïdie subclinique. ' : ''}Contrôle à 3 mois avec anticorps anti-TPO recommandé. Traitement à discuter si TSH > 10 ou symptômes.`,
        SEVERITE.ATTENTION);
    }
  }

  if (ft4 !== null && ft4 < 10 && (tsh === null || entre(tsh, 0.4, 4.0))) {
    anomalie = true;
    add('FT4_BASSE', 'T4 libre basse (euthyroïdie centrale ?)',
      `T4 libre ${ft4} pmol/L < 10. TSH normale ou non saisie. Évoquer une pathologie hypophysaire (hypothyroïdie centrale) si la TSH n'est pas élevée. Bilan hypophysaire recommandé.`,
      SEVERITE.ATTENTION);
  }

  if (ft3 !== null && ft3 > 6.5 && (tsh === null || tsh >= 0.4)) {
    anomalie = true;
    add('FT3_ELEVEE', 'T3 libre élevée',
      `T3 libre ${ft3} pmol/L > 6,5. En l'absence de TSH basse, vérifier une éventuelle thyroïdite subaiguë ou contexte de traitement (liothyronine).`,
      SEVERITE.ATTENTION);
  }

  const saisies = [tsh, ft3, ft4].filter((x) => x !== null).length;
  if (!anomalie && saisies > 0) {
    add('THYROIDE_NORMALE', 'Bilan thyroïdien normal',
      `Les paramètres thyroïdiens sont dans les valeurs de référence.${tsh !== null ? ` TSH ${tsh} mUI/L.` : ''}`, SEVERITE.NORMAL);
  } else if (saisies === 0) {
    add('THYROIDE_INCOMPLET', 'Données insuffisantes', 'Saisir au moins la TSH.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coagulation (TP, INR, TCA, fibrinogène)
// ─────────────────────────────────────────────────────────────────────────────
function interpreterCoagulation(vals) {
  const commentaires = [];
  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  const tp    = v(vals.tp);           // %      norme 70–100
  const inr   = v(vals.inr);          // ratio  norme 0,8–1,2
  const tca   = v(vals.tca);          // s      norme 25–38
  const fib   = v(vals.fibrinogene);  // g/L    norme 2,0–4,0
  let anomalie = false;

  if (tp !== null) {
    if (tp < 50) {
      anomalie = true;
      add('TP_SEVERE', 'TP très abaissé — coagulopathie sévère',
        `TP ${tp}% < 50%. Risque hémorragique majeur. Causes : insuffisance hépatocellulaire grave, CIVD, anticoagulants. Bilan urgence : fibrinogène, facteurs de coagulation, avis hématologique.`,
        SEVERITE.CRITIQUE);
    } else if (tp < 70) {
      anomalie = true;
      add('TP_ABAISSE', 'TP abaissé',
        `TP ${tp}% (norme 70–100%). Hypocoagulabilité. Causes : déficit en facteurs II, V, VII, X (voie extrinsèque), insuffisance hépatique, carence en vitamine K, anticoagulants.`,
        SEVERITE.ATTENTION);
    }
  }

  if (inr !== null && inr > 1.2) {
    anomalie = true;
    add('INR_ELEVE', inr > 3.0 ? 'INR très élevé — risque hémorragique' : 'INR élevé',
      `INR ${inr} (norme 0,8–1,2). ${inr > 3.0 ? 'Risque hémorragique important. ' : ''}${inr > 5 ? 'Antidote (vitamine K ou plasma frais congelé) à envisager. ' : ''}En l'absence de traitement anticoagulant : insuffisance hépatique, CIVD, carence en vitamine K.`,
      inr > 3.0 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (tca !== null && tca > 38) {
    anomalie = true;
    add('TCA_ALLONGE', tca > 60 ? 'TCA très allongé' : 'TCA allongé',
      `TCA ${tca} s (norme 25–38 s). ${tca > 60 ? 'Allongement majeur. ' : ''}Causes : déficit en facteurs VIII, IX, XI (voie intrinsèque), anticoagulants (héparines), CIVD, anticoagulant lupique. Ratio TCA patient/témoin > 1,5 : pathologique.`,
      tca > 60 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION);
  }

  if (fib !== null) {
    if (fib < 1.0) {
      anomalie = true;
      add('AFIBRINOGENEMIE', 'Fibrinogène très bas — CIVD probable',
        `Fibrinogène ${fib} g/L < 1,0. Risque hémorragique vital. Évoquer une CIVD (coagulation intravasculaire disséminée) : paludisme sévère, sepsis, hémorragie obstétricale. Avis réanimation urgent.`,
        SEVERITE.CRITIQUE);
    } else if (fib < 2.0) {
      anomalie = true;
      add('HYPOFIBRINOGENEMIE', 'Hypofibrinogénémie',
        `Fibrinogène ${fib} g/L (norme 2,0–4,0). Causes : CIVD, insuffisance hépatique sévère, déficit constitutionnel. Associer D-dimères pour CIVD.`,
        SEVERITE.ATTENTION);
    } else if (fib > 4.0) {
      anomalie = true;
      add('HYPERFIBRINOGENEMIE', 'Hyperfibrinogénémie',
        `Fibrinogène ${fib} g/L (norme 2,0–4,0). Protéine de l'inflammation aiguë. Causes : infection, cancer, grossesse. Facteur de risque cardiovasculaire si chronique.`,
        SEVERITE.INFO);
    }
  }

  const saisies = [tp, inr, tca, fib].filter((x) => x !== null).length;
  if (!anomalie && saisies > 0) {
    add('COAG_NORMALE', 'Bilan de coagulation normal',
      'Les paramètres de coagulation sont dans les valeurs de référence.', SEVERITE.NORMAL);
  } else if (saisies === 0) {
    add('COAG_INCOMPLET', 'Données insuffisantes', 'Saisir au moins le TP ou l\'INR.', SEVERITE.INFO);
  }

  return commentaires;
}

// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée principal
// ─────────────────────────────────────────────────────────────────────────────
export function interpreterPanels(valeurs_brutes, panels, sexe) {
  const resultats = {};
  for (const panel of panels) {
    const vals = valeurs_brutes[panel] || {};
    switch (panel) {
      case 'nfs':        resultats.nfs        = interpreterNFS(vals, sexe);       break;
      case 'renal':      resultats.renal      = interpreterRenal(vals, sexe);     break;
      case 'glycemie':   resultats.glycemie   = interpreterGlycemie(vals);        break;
      case 'lipidique':  resultats.lipidique  = interpreterLipidique(vals, sexe); break;
      case 'ionogramme': resultats.ionogramme = interpreterIonogramme(vals);      break;
      case 'hepatique':  resultats.hepatique  = interpreterHapatique(vals, sexe);  break;
      case 'thyroide':   resultats.thyroide   = interpreterThyroide(vals);         break;
      case 'coagulation':resultats.coagulation= interpreterCoagulation(vals);      break;
    }
  }
  return resultats;
}

// Valeurs normales pour affichage dans les formulaires
export const NORMALES_NFS = (sexe = 'H') => ({
  hemoglobine:      sexe === 'F' ? '12 – 16 g/dL'   : '13 – 17 g/dL',
  hematocrite:      sexe === 'F' ? '35 – 47 %'       : '40 – 54 %',
  globules_rouges:  sexe === 'F' ? '4,0 – 5,2 T/L'  : '4,5 – 5,9 T/L',
  vgm:              '80 – 100 fL', tcmh: '27 – 33 pg', ccmh: '32 – 36 g/dL', rdw: '11,5 – 14,5 %',
  globules_blancs:  '4 – 10 G/L', neutrophiles_abs: '1,8 – 7,5 G/L', neutrophiles_pct: '40 – 75 %',
  lymphocytes_abs:  '1,0 – 4,0 G/L', lymphocytes_pct: '20 – 40 %',
  monocytes_abs:    '0,2 – 1,0 G/L', monocytes_pct: '2 – 10 %',
  eosinophiles_abs: '0 – 0,5 G/L',   eosinophiles_pct: '0 – 5 %',
  basophiles_abs:   '0 – 0,1 G/L',   basophiles_pct: '0 – 1 %',
  plaquettes:       '150 – 400 G/L',
});

export const NORMALES_RENAL = (sexe = 'H') => ({
  creatinine:   sexe === 'F' ? '44 – 97 µmol/L' : '53 – 106 µmol/L',
  uree:         '2,5 – 7,5 mmol/L',
  acide_urique: sexe === 'F' ? '143 – 339 µmol/L' : '202 – 416 µmol/L',
  dfg:          '> 60 mL/min/1.73m²',
});

export const NORMALES_GLYCEMIE = () => ({
  glycemie_jeun:          '3,9 – 5,5 mmol/L',
  glycemie_postprandiale: '< 7,8 mmol/L (2h)',
  hba1c:                  '< 5,7 %',
});

export const NORMALES_LIPIDIQUE = (sexe = 'H') => ({
  cholesterol_total: '< 5,2 mmol/L',
  ldl:               '< 3,4 mmol/L',
  hdl:               sexe === 'F' ? '> 1,3 mmol/L' : '> 1,0 mmol/L',
  triglycerides:     '< 1,7 mmol/L',
});

export const NORMALES_HEPATIQUE = (sexe = 'H') => ({
  crp:               '< 6 mg/L',
  asat:              '10–40 UI/L',
  alat:              '10–35 UI/L',
  ggt:               sexe === 'F' ? '< 35 UI/L' : '< 50 UI/L',
  pal:               '40–130 UI/L',
  bilirubine_totale: '< 17 µmol/L',
  bilirubine_directe:'< 5 µmol/L',
  albumine:          '35–50 g/L',
});

export const NORMALES_THYROIDE = () => ({
  tsh: '0,4–4,0 mUI/L',
  ft3: '3,5–6,5 pmol/L',
  ft4: '10–26 pmol/L',
});

export const NORMALES_COAGULATION = () => ({
  tp:          '70–100 %',
  inr:         '0,8–1,2',
  tca:         '25–38 s',
  fibrinogene: '2,0–4,0 g/L',
});

export const NORMALES_IONOGRAMME = () => ({
  sodium:        '136 – 145 mmol/L',
  potassium:     '3,5 – 5,0 mmol/L',
  chlore:        '98 – 107 mmol/L',
  calcium:       '2,2 – 2,6 mmol/L',
  magnesium:     '0,75 – 0,95 mmol/L',
  phosphore:     '0,81 – 1,45 mmol/L',
  bicarbonates:  '22 – 29 mmol/L',
});
