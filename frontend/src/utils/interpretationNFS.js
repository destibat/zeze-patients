/**
 * Moteur d'interprétation hématologique — NFS (Numération Formule Sanguine)
 * Génère des commentaires de type laboratoire d'analyses.
 */

// Niveaux de sévérité
export const SEVERITE = {
  NORMAL: 'normal',
  INFO: 'info',
  ATTENTION: 'attention',
  CRITIQUE: 'critique',
};

// Valeurs de référence (adulte)
const REF = {
  hb: { H: [13.0, 17.0], F: [12.0, 16.0], unite: 'g/dL' },
  ht: { H: [40, 54], F: [35, 47], unite: '%' },
  gr: { H: [4.5, 5.9], F: [4.0, 5.2], unite: 'T/L' },
  vgm: { commun: [80, 100], unite: 'fL' },
  tcmh: { commun: [27, 33], unite: 'pg' },
  ccmh: { commun: [32, 36], unite: 'g/dL' },
  rdw: { commun: [11.5, 14.5], unite: '%' },
  gb: { commun: [4.0, 10.0], unite: 'G/L' },
  neut: { commun: [1.8, 7.5], unite: 'G/L' },
  lymph: { commun: [1.0, 4.0], unite: 'G/L' },
  mono: { commun: [0.2, 1.0], unite: 'G/L' },
  eosino: { commun: [0.0, 0.5], unite: 'G/L' },
  baso: { commun: [0.0, 0.1], unite: 'G/L' },
  plaq: { commun: [150, 400], unite: 'G/L' },
};

const v = (val) => (val !== null && val !== undefined && val !== '' ? parseFloat(val) : null);
const entre = (x, min, max) => x >= min && x <= max;

/**
 * Génère la liste d'interprétations à partir des valeurs saisies.
 * @param {object} vals   — valeurs numériques du formulaire
 * @param {string} sexe   — 'M' | 'F'
 * @returns {Array<{code, titre, texte, severite}>}
 */
export function interpreter(vals, sexe) {
  const s = sexe === 'F' ? 'F' : 'H';
  const commentaires = [];

  const add = (code, titre, texte, severite = SEVERITE.ATTENTION) =>
    commentaires.push({ code, titre, texte, severite });

  // ── Hémoglobine ──────────────────────────────────────────────────────────
  const hb = v(vals.hemoglobine);
  const vgm = v(vals.vgm);
  const tcmh = v(vals.tcmh);
  const ccmh = v(vals.ccmh);
  const rdw = v(vals.rdw);
  const plaq = v(vals.plaquettes);
  const gb = v(vals.globules_blancs);
  const neut = v(vals.neutrophiles_abs);
  const lymph = v(vals.lymphocytes_abs);
  const eosino = v(vals.eosinophiles_abs);
  const mono = v(vals.monocytes_abs);
  const baso = v(vals.basophiles_abs);
  const gr = v(vals.globules_rouges);
  const ht = v(vals.hematocrite);

  const refHb = REF.hb[s];

  if (hb !== null) {
    if (hb < refHb[0]) {
      // === ANÉMIE ===
      const sev = hb < 7 ? SEVERITE.CRITIQUE : hb < 10 ? SEVERITE.ATTENTION : SEVERITE.ATTENTION;
      const degre = hb < 7 ? 'sévère' : hb < 10 ? 'modérée' : 'légère';

      if (vgm !== null) {
        if (vgm < 80) {
          // Microcytaire
          if (tcmh !== null && tcmh < 27 && ccmh !== null && ccmh < 32) {
            add('ANEMIE_MICRO_HYPO', 'Anémie hypochrome microcytaire',
              `Hémoglobine à ${hb} g/dL (${degre}), VGM à ${vgm} fL, TCMH à ${tcmh} pg, CCMH à ${ccmh} g/dL. `
              + 'Tableau évocateur d\'une carence martiale (manque de fer). '
              + 'Bilan complémentaire recommandé : fer sérique, ferritine, coefficient de saturation de la transferrine. '
              + 'À distinguer d\'une thalassémie mineure (GR souvent élevés, électrophorèse de l\'Hb si suspicion).',
              sev);
          } else if (tcmh !== null && entre(tcmh, 27, 33)) {
            add('ANEMIE_MICRO_NORMO', 'Anémie microcytaire normochrome',
              `Hémoglobine à ${hb} g/dL (${degre}), VGM à ${vgm} fL avec TCMH normale. `
              + 'Évoquer une thalassémie mineure ou une anémie des maladies chroniques en début d\'évolution. '
              + 'Électrophorèse de l\'hémoglobine conseillée.',
              sev);
          } else {
            add('ANEMIE_MICRO', 'Anémie microcytaire',
              `Hémoglobine à ${hb} g/dL (${degre}), VGM à ${vgm} fL. `
              + 'Orientation : carence en fer (la plus fréquente) ou thalassémie. '
              + 'Compléter par fer sérique, ferritine, électrophorèse de l\'Hb.',
              sev);
          }
        } else if (vgm > 100) {
          // Macrocytaire
          add('ANEMIE_MACRO', 'Anémie macrocytaire',
            `Hémoglobine à ${hb} g/dL (${degre}), VGM à ${vgm} fL (macrocytose). `
            + 'Causes principales : carence en vitamine B12 ou en folates (acide folique), hypothyroïdie, hépatopathie chronique, alcoolisme. '
            + 'Bilan : vitamine B12, folates sériques et érythrocytaires, TSH, bilan hépatique. '
            + (rdw !== null && rdw > 14.5
              ? 'L\'élévation du RDW confirme une anisocytose marquée, compatible avec une carence en B12 ou folates. '
              : ''),
            sev);
        } else {
          // Normocytaire
          if (plaq !== null && plaq < 150 && gb !== null && gb < 4) {
            add('ANEMIE_APLASIE', 'Pancytopénie — aplasie médullaire possible',
              `Hémoglobine à ${hb} g/dL, GB à ${gb} G/L, plaquettes à ${plaq} G/L. `
              + 'Atteinte des trois lignées (pancytopénie). Évoquer une aplasie médullaire, une leucémie ou une infiltration médullaire. '
              + 'Avis hématologique urgent recommandé. Myélogramme indiqué.',
              SEVERITE.CRITIQUE);
          } else {
            add('ANEMIE_NORMO', 'Anémie normocytaire normochrome',
              `Hémoglobine à ${hb} g/dL (${degre}), VGM normal à ${vgm} fL. `
              + 'Étiologies à explorer : hémorragie aiguë récente, insuffisance rénale chronique (déficit en EPO), '
              + 'anémie inflammatoire ou des maladies chroniques (LED, polyarthrite, cancer), hémolyse. '
              + 'Compléter par réticulocytes, haptoglobine, bilirubine libre, LDH.',
              sev);
          }
        }
      } else {
        add('ANEMIE_NOS', 'Anémie',
          `Hémoglobine à ${hb} g/dL (${degre}). `
          + 'Saisir le VGM, le TCMH et le CCMH pour préciser le type morphologique (micro-, normo- ou macrocytaire).',
          sev);
      }
    } else if (hb > refHb[1]) {
      // Polyglobulie
      add('POLYGLOBULIE', 'Polyglobulie',
        `Hémoglobine à ${hb} g/dL, supérieure à la normale (${refHb[0]}–${refHb[1]} g/dL). `
        + (gr !== null && gr > REF.gr[s][1] ? `Globules rouges à ${gr} T/L (élevés). ` : '')
        + (ht !== null && ht > REF.ht[s][1] ? `Hématocrite à ${ht}% (élevé). ` : '')
        + 'Causes à rechercher : polyglobulie de Vaquez (maladie myéloproliférative), polyglobulie secondaire (hypoxie chronique, BPCO, cardiopathie), déshydratation. '
        + 'Dosage de l\'EPO et consultation hématologique recommandée.',
        SEVERITE.ATTENTION);
    } else {
      add('HB_NORMALE', 'Hémoglobine normale',
        `Hémoglobine à ${hb} g/dL — dans les valeurs de référence (${refHb[0]}–${refHb[1]} g/dL).`,
        SEVERITE.NORMAL);
    }
  }

  // ── RDW élevé isolé ───────────────────────────────────────────────────────
  if (rdw !== null && rdw > 14.5 && (hb === null || entre(hb, refHb[0], refHb[1]))) {
    add('RDW_ELEVE', 'Anisocytose (RDW élevé)',
      `RDW à ${rdw}% (normale : 11,5–14,5%). Hétérogénéité de taille des globules rouges. `
      + 'Peut précéder une anémie ferriprive ou s\'observer dans les carences mixtes (fer + B12/folates).',
      SEVERITE.INFO);
  }

  // ── Globules blancs ───────────────────────────────────────────────────────
  if (gb !== null) {
    if (gb < 4.0) {
      const sev = gb < 2.0 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('LEUCOPENIE', 'Leucopénie',
        `Globules blancs à ${gb} G/L (normale : 4–10 G/L). `
        + (gb < 2.0 ? 'Leucopénie sévère — risque infectieux majeur. ' : '')
        + 'Causes : infection virale (EBV, CMV, VIH), prise médicamenteuse (chimiothérapie, certains antibiotiques), '
        + 'lupus, aplasie médullaire. Bilan viral et immunologique conseillé.',
        sev);
    } else if (gb > 10.0) {
      const sev = gb > 30 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('LEUCOCYTOSE', 'Hyperleucocytose',
        `Globules blancs à ${gb} G/L (normale : 4–10 G/L). `
        + (gb > 30 ? 'Hyperleucocytose majeure — évoquer une leucémie. Avis hématologique urgent. ' : '')
        + 'Causes habituelles : infection bactérienne aiguë, inflammation, stress, corticothérapie. '
        + 'La formule leucocytaire précisera la lignée impliquée.',
        sev);
    }
  }

  // ── Neutrophiles ──────────────────────────────────────────────────────────
  if (neut !== null) {
    if (neut < 1.8) {
      const sev = neut < 0.5 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('NEUTROPENIE', 'Neutropénie',
        `Neutrophiles à ${neut} G/L (normale : 1,8–7,5 G/L). `
        + (neut < 0.5 ? 'Neutropénie profonde (agranulocytose) — risque infectieux vital. Hospitalisation à envisager. ' : '')
        + 'Causes : médicaments (antibiotiques, antithyroïdiens, AINS), infections virales, lupus, aplasie. '
        + 'Prévention des infections bactériennes en priorité.',
        sev);
    } else if (neut > 7.5) {
      add('NEUTROPHILIE', 'Neutrophilie',
        `Neutrophiles à ${neut} G/L (normale : 1,8–7,5 G/L). `
        + 'Orientation principale : infection bactérienne aiguë, inflammation, nécrose tissulaire, corticothérapie, tabagisme. '
        + 'La présence de formes jeunes (myélocytes, métamyélocytes) oriente vers une réaction leucémique ou une leucémie myéloïde.',
        SEVERITE.ATTENTION);
    }
  }

  // ── Lymphocytes ───────────────────────────────────────────────────────────
  if (lymph !== null) {
    if (lymph < 1.0) {
      add('LYMPHOPENIE', 'Lymphopénie',
        `Lymphocytes à ${lymph} G/L (normale : 1–4 G/L). `
        + 'Évoquer : infection virale sévère (VIH, CMV), corticothérapie, chimiothérapie, syndrome de Cushing. '
        + 'Sérologie VIH recommandée si facteur de risque.',
        SEVERITE.ATTENTION);
    } else if (lymph > 4.0) {
      const sev = lymph > 10 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('LYMPHOCYTOSE', 'Lymphocytose',
        `Lymphocytes à ${lymph} G/L (normale : 1–4 G/L). `
        + (lymph > 10
          ? 'Lymphocytose importante — évoquer une leucémie lymphoïde chronique (LLC). Immunophénotypage recommandé. '
          : 'Causes habituelles : infection virale (mononucléose, cytomégalovirus, coqueluche), LLC débutante. '),
        sev);
    }
  }

  // ── Éosinophiles ─────────────────────────────────────────────────────────
  if (eosino !== null && eosino > 0.5) {
    const sev = eosino > 1.5 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
    add('EOSINOPHILIE', 'Éosinophilie',
      `Éosinophiles à ${eosino} G/L (normale : < 0,5 G/L). `
      + (eosino > 1.5
        ? 'Hyperéosinophilie importante — évoquer un syndrome hyperéosinophilique (risque cardiaque). '
        : '')
      + 'Causes fréquentes en Afrique de l\'Ouest : parasitoses intestinales (ascaridiase, ankylostomose, bilharziose, filariose), '
      + 'allergie (asthme, rhinite, eczéma), médicaments. '
      + 'Bilan parasitologique des selles, sérologies parasitaires (filariose, toxocarose) recommandés.',
      sev);
  }

  // ── Monocytes ────────────────────────────────────────────────────────────
  if (mono !== null && mono > 1.0) {
    add('MONOCYTOSE', 'Monocytose',
      `Monocytes à ${mono} G/L (normale : 0,2–1 G/L). `
      + 'Causes : infections chroniques (tuberculose, paludisme, endocardite, brucellose), maladies inflammatoires chroniques, '
      + 'leucémies myélomonocytaires. Bilan infectieux orienté selon le contexte clinique.',
      SEVERITE.ATTENTION);
  }

  // ── Basophiles ────────────────────────────────────────────────────────────
  if (baso !== null && baso > 0.1) {
    add('BASOPHILIE', 'Basophilie',
      `Basophiles à ${baso} G/L (normale : < 0,1 G/L). `
      + 'Évoquer : leucémie myéloïde chronique (LMC) si associée à une hyperleucocytose, hypothyroïdie, allergie. '
      + 'Recherche du chromosome Philadelphie (t9;22) recommandée si LMC suspectée.',
      SEVERITE.ATTENTION);
  }

  // ── Plaquettes ────────────────────────────────────────────────────────────
  if (plaq !== null) {
    if (plaq < 150) {
      const sev = plaq < 50 ? SEVERITE.CRITIQUE : SEVERITE.ATTENTION;
      add('THROMBOPENIE', 'Thrombopénie',
        `Plaquettes à ${plaq} G/L (normale : 150–400 G/L). `
        + (plaq < 20
          ? 'Thrombopénie sévère — risque hémorragique spontané élevé (hémorragie cérébrale, digestive). Hospitalisation urgente. '
          : plaq < 50
          ? 'Thrombopénie importante — contre-indication aux gestes invasifs. Précautions hémorragiques strictes. '
          : 'Thrombopénie modérée — surveiller signes hémorragiques (pétéchies, épistaxis, gingivorragies). ')
        + 'Causes : purpura thrombopénique immunologique (PTI), paludisme, dengue, VIH, '
        + 'coagulation intravasculaire disséminée (CIVD), médicaments (héparine, aspirine), hypersplénisme.',
        sev);
    } else if (plaq > 400) {
      add('THROMBOCYTOSE', 'Thrombocytose',
        `Plaquettes à ${plaq} G/L (normale : 150–400 G/L). `
        + (plaq > 1000
          ? 'Thrombocytose majeure (> 1 000 G/L) — évoquer une thrombocytémie essentielle. Risque thrombotique élevé. Avis hématologique. '
          : 'Thrombocytose réactionnelle la plus fréquente : carence en fer, infection aiguë, inflammation, splénectomie. ')
        + 'Si persistante, envisager une thrombocytémie essentielle (maladie myéloproliférative).',
        SEVERITE.ATTENTION);
    }
  }

  // ── Si tout est normal ────────────────────────────────────────────────────
  if (commentaires.filter((c) => c.severite !== SEVERITE.NORMAL).length === 0 && commentaires.length > 0) {
    add('NFS_NORMALE', 'NFS dans les limites de la normale',
      'L\'ensemble des paramètres hématologiques analysés se situe dans les valeurs de référence. '
      + 'Pas d\'anomalie de la lignée rouge, blanche ou plaquettaire détectée.',
      SEVERITE.NORMAL);
  } else if (commentaires.length === 0) {
    add('INCOMPLET', 'Données insuffisantes',
      'Veuillez saisir au moins l\'hémoglobine pour obtenir une interprétation.',
      SEVERITE.INFO);
  }

  return commentaires;
}

/** Couleur Tailwind selon sévérité */
export const couleurSeverite = (sev) => ({
  [SEVERITE.NORMAL]: 'bg-green-50 border-green-200 text-green-800',
  [SEVERITE.INFO]: 'bg-blue-50 border-blue-200 text-blue-800',
  [SEVERITE.ATTENTION]: 'bg-orange-50 border-orange-200 text-orange-800',
  [SEVERITE.CRITIQUE]: 'bg-red-50 border-red-300 text-red-900',
})[sev] || 'bg-gray-50 border-gray-200 text-gray-700';

export const iconesSeverite = {
  [SEVERITE.NORMAL]: '✓',
  [SEVERITE.INFO]: 'ℹ',
  [SEVERITE.ATTENTION]: '⚠',
  [SEVERITE.CRITIQUE]: '✕',
};

/** Valeurs normales pour affichage dans le tableau */
export const NORMALES = (sexe = 'H') => ({
  hemoglobine:    sexe === 'F' ? '12 – 16 g/dL' : '13 – 17 g/dL',
  hematocrite:    sexe === 'F' ? '35 – 47 %' : '40 – 54 %',
  globules_rouges: sexe === 'F' ? '4,0 – 5,2 T/L' : '4,5 – 5,9 T/L',
  vgm:            '80 – 100 fL',
  tcmh:           '27 – 33 pg',
  ccmh:           '32 – 36 g/dL',
  rdw:            '11,5 – 14,5 %',
  globules_blancs: '4 – 10 G/L',
  neutrophiles_abs: '1,8 – 7,5 G/L',
  neutrophiles_pct: '40 – 75 %',
  lymphocytes_abs: '1,0 – 4,0 G/L',
  lymphocytes_pct: '20 – 40 %',
  monocytes_abs:  '0,2 – 1,0 G/L',
  monocytes_pct:  '2 – 10 %',
  eosinophiles_abs: '0 – 0,5 G/L',
  eosinophiles_pct: '0 – 5 %',
  basophiles_abs: '0 – 0,1 G/L',
  basophiles_pct: '0 – 1 %',
  plaquettes:     '150 – 400 G/L',
});
