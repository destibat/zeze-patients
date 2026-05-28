'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// ── Référentiels par panel ────────────────────────────────────────────────────
const PARAMS_NFS = {
  hemoglobine:      { label: 'Hémoglobine',      unite: 'g/dL',  ref: (s) => s === 'F' ? '12–16' : '13–17' },
  hematocrite:      { label: 'Hématocrite',       unite: '%',     ref: (s) => s === 'F' ? '35–47' : '40–54' },
  globules_rouges:  { label: 'Globules rouges',   unite: 'T/L',   ref: (s) => s === 'F' ? '4,0–5,2' : '4,5–5,9' },
  vgm:              { label: 'VGM',               unite: 'fL',    ref: () => '80–100' },
  tcmh:             { label: 'TCMH',              unite: 'pg',    ref: () => '27–33' },
  ccmh:             { label: 'CCMH',              unite: 'g/dL',  ref: () => '32–36' },
  rdw:              { label: 'RDW',               unite: '%',     ref: () => '11,5–14,5' },
  globules_blancs:  { label: 'Globules blancs',   unite: 'G/L',   ref: () => '4–10' },
  neutrophiles_abs: { label: 'Neutrophiles (abs)', unite: 'G/L',  ref: () => '1,8–7,5' },
  neutrophiles_pct: { label: 'Neutrophiles (%)',   unite: '%',    ref: () => '40–75' },
  lymphocytes_abs:  { label: 'Lymphocytes (abs)',  unite: 'G/L',  ref: () => '1,0–4,0' },
  lymphocytes_pct:  { label: 'Lymphocytes (%)',    unite: '%',    ref: () => '20–40' },
  monocytes_abs:    { label: 'Monocytes (abs)',    unite: 'G/L',  ref: () => '0,2–1,0' },
  monocytes_pct:    { label: 'Monocytes (%)',      unite: '%',    ref: () => '2–10' },
  eosinophiles_abs: { label: 'Éosinophiles (abs)', unite: 'G/L',  ref: () => '0–0,5' },
  eosinophiles_pct: { label: 'Éosinophiles (%)',   unite: '%',    ref: () => '0–5' },
  basophiles_abs:   { label: 'Basophiles (abs)',   unite: 'G/L',  ref: () => '0–0,1' },
  basophiles_pct:   { label: 'Basophiles (%)',     unite: '%',    ref: () => '0–1' },
  plaquettes:       { label: 'Plaquettes',         unite: 'G/L',  ref: () => '150–400' },
};

const PARAMS_RENAL = {
  // Créatinine — méthode enzymatique standardisée (HAS 2011)
  creatinine:   { label: 'Créatinine',   unite: 'µmol/L',        ref: (s) => s === 'F' ? '44–80' : '62–106' },
  uree:         { label: 'Urée',         unite: 'mmol/L',        ref: () => '2,5–7,5' },
  acide_urique: { label: 'Acide urique', unite: 'µmol/L',        ref: (s) => s === 'F' ? '155–350' : '210–420' },
  dfg:          { label: 'DFG estimé',   unite: 'mL/min/1.73m²', ref: () => '> 60' },
};

const PARAMS_GLYCEMIE = {
  // Norme OMS/HAS : normale 0,70–1,10 g/L = 3,9–6,1 mmol/L
  // Prédiabète : 1,10–1,25 g/L | Diabète : ≥ 1,26 g/L confirmé 2 fois
  glycemie_jeun:          { label: 'Glycémie à jeun',          unite: 'mmol/L', ref: () => '3,9–6,1' },
  // Postprandiale (2h) : normale < 1,40 g/L (< 7,8 mmol/L) | Diabète ≥ 2,00 g/L
  glycemie_postprandiale: { label: 'Glycémie postprandiale (2h)', unite: 'mmol/L', ref: () => '< 7,8' },
  // HbA1c : normale < 5,7 % | Prédiabète 5,7–6,4 % | Diabète ≥ 6,5 %
  hba1c:                  { label: 'HbA1c',                    unite: '%',      ref: () => '< 5,7' },
};

const PARAMS_LIPIDIQUE = {
  // Cholestérol total : souhaitable < 5,2 mmol/L (< 2,0 g/L) — VIDAL/HAS
  cholesterol_total: { label: 'Cholestérol total', unite: 'mmol/L', ref: () => '< 5,2' },
  // LDL : référence populationnelle < 4,1 mmol/L (< 1,60 g/L) — NB : < 3,4 est un objectif thérapeutique
  ldl:               { label: 'LDL-cholestérol',   unite: 'mmol/L', ref: () => '< 4,1' },
  hdl:               { label: 'HDL-cholestérol',   unite: 'mmol/L', ref: (s) => s === 'F' ? '> 1,3' : '> 1,0' },
  triglycerides:     { label: 'Triglycérides',      unite: 'mmol/L', ref: () => '< 1,7' },
};

const PARAMS_HEPATIQUE = {
  crp:  { label: 'CRP (Protéine C-réactive)', unite: 'mg/L', ref: () => '< 6' },
  asat: { label: 'ASAT (GOT)',                unite: 'UI/L', ref: () => '10–40' },
  alat: { label: 'ALAT (TGP)',                unite: 'UI/L', ref: () => '10–35' },
};

const PARAMS_IONOGRAMME = {
  sodium:       { label: 'Sodium',       unite: 'mmol/L', ref: () => '136–145' },
  potassium:    { label: 'Potassium',    unite: 'mmol/L', ref: () => '3,5–5,0' },
  chlore:       { label: 'Chlore',       unite: 'mmol/L', ref: () => '96–106' },
  calcium:      { label: 'Calcium',      unite: 'mmol/L', ref: () => '2,20–2,60' },
  magnesium:    { label: 'Magnésium',    unite: 'mmol/L', ref: () => '0,75–1,00' },
  phosphore:    { label: 'Phosphore',    unite: 'mmol/L', ref: () => '0,80–1,45' },
  bicarbonates: { label: 'Bicarbonates', unite: 'mmol/L', ref: () => '22–29' },
};

const PANELS_META = {
  nfs:        { label: 'NFS — Numération Formule Sanguine', params: PARAMS_NFS },
  renal:      { label: 'Bilan rénal',                       params: PARAMS_RENAL },
  glycemie:   { label: 'Bilan glycémique',                  params: PARAMS_GLYCEMIE },
  lipidique:  { label: 'Bilan lipidique',                   params: PARAMS_LIPIDIQUE },
  ionogramme: { label: 'Ionogramme',                        params: PARAMS_IONOGRAMME },
  hepatique:  { label: 'Bilan hépatique',                   params: PARAMS_HEPATIQUE },
};

// ── Prompt système ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Rôle : Tu es un médecin biologiste expérimenté, spécialiste en hématologie, biochimie et interprétation clinique des examens médicaux. Tu es aussi médecin généraliste pouvant interpréter tout type d'examen qu'un patient te soumet. Tu adoptes une approche rigoureuse, pédagogique et claire, similaire à celle d'un médecin traitant expliquant les résultats à son patient.

🔍 Mission : À partir des résultats d'analyses médicales fournis (NFS, biochimie, sérologie, ou tout autre type d'examen), produire un rapport structuré en 7 sections numérotées.

---

📊 1. Analyse détaillée des paramètres

Pour chaque panel ou groupe de valeurs présent, affiche un sous-titre en gras (ex: **NFS — Numération Formule Sanguine**) puis un tableau Markdown OBLIGATOIRE avec ces 4 colonnes exactes :

| Paramètre | Résultat | Normes | Statut |
|-----------|----------|--------|--------|
| nom du paramètre | valeur + unité | intervalle de référence | statut |

Le Statut doit être l'une de ces valeurs exactes : **Normal** / **↑ Augmenté** / **↓ Diminué** / **↑ Limite haute** / **↓ Limite basse**

---

⚠️ 2. Identification des anomalies
Lister toutes les anomalies détectées.
Expliquer simplement chaque anomalie (cause possible, signification biologique).

🧠 3. Interprétation médicale
- Faire des liens entre les anomalies
- **Sous-titres en gras** pour chaque thème (ex: **Liens entre les anomalies**, **Hypothèses diagnostiques**)
- Proposer des hypothèses diagnostiques probables — mentionner les maladies ou troubles possibles (sans affirmer de diagnostic définitif)

📋 4. Synthèse globale
Résumer l'état général du patient. Commence par :
**ÉTAT GÉNÉRAL : [NORMAL / À SURVEILLER / PRÉOCCUPANT] — [phrase courte]**
Puis donner une lecture cohérente et clinique des résultats en 3-5 phrases.

💬 5. Explication simplifiée pour le patient
Reformuler les résultats dans un langage clair et compréhensible, sans jargon médical. Préciser :
- Ce qui va bien
- Ce qui mérite attention
- Le niveau de gravité (rassurant / modéré / sérieux)

🩺 6. Recommandations
Proposer, avec **titres en gras** :
**Examens complémentaires éventuels**
**Conseils hygiéno-diététiques**
**Nécessité ou non de consulter rapidement**

⚖️ 7. Précaution médicale obligatoire
Cette analyse a une valeur informative et pédagogique. Elle ne remplace pas une consultation médicale réelle et doit être validée par un médecin qualifié.

---
IMPORTANT : Le tableau Markdown de la section 1 est OBLIGATOIRE pour chaque groupe de valeurs. Utilise uniquement des tirets simples pour les listes (- item).`;

// ── Construction du message utilisateur ───────────────────────────────────────
const construireMessage = (analyse, texte_brut) => {
  const sexe = analyse.sexe_patient;
  const sexeLabel = sexe === 'F' ? 'Féminin' : sexe === 'M' ? 'Masculin' : 'Non renseigné';
  const ageLabel  = analyse.age_patient ? `${analyse.age_patient} ans` : 'Non renseigné';

  const panels  = Array.isArray(analyse.panels_demandes) ? analyse.panels_demandes
    : JSON.parse(analyse.panels_demandes || '[]');
  const valeurs = (analyse.valeurs_brutes && typeof analyse.valeurs_brutes === 'object')
    ? analyse.valeurs_brutes
    : JSON.parse(analyse.valeurs_brutes || '{}');

  let msg = `Voici les résultats d'analyses médicales d'un patient :

Informations patient :
- Sexe : ${sexeLabel}
- Âge : ${ageLabel}
- Date d'analyse : ${analyse.date_analyse || 'Non renseignée'}

`;

  // Vérifie s'il y a des valeurs structurées dans les panels connus
  const aValeursConnues = panels.some((panelId) => {
    const meta = PANELS_META[panelId];
    if (!meta) return false;
    const vPanel = valeurs[panelId] || {};
    return Object.values(vPanel).some((v) => v !== null && v !== undefined);
  });

  if (aValeursConnues) {
    msg += 'Résultats biologiques structurés :\n';
    for (const panelId of panels) {
      const meta = PANELS_META[panelId];
      if (!meta) continue;
      msg += `\n=== ${meta.label} ===\n`;
      const vPanel = valeurs[panelId] || {};
      let aucune = true;
      for (const [cle, param] of Object.entries(meta.params)) {
        const val = vPanel[cle];
        if (val === null || val === undefined) continue;
        aucune = false;
        msg += `- ${param.label} : ${val} ${param.unite}  [Référence : ${param.ref(sexe)} ${param.unite}]\n`;
      }
      if (aucune) msg += '(Aucune valeur renseignée pour ce panel)\n';
    }
  }

  if (texte_brut) {
    // Contexte clinique complet : ECG, OMI, diagnostics, comptes-rendus, etc.
    msg += `\n\n=== Contexte clinique et autres examens (ECG, imagerie, symptômes, etc.) ===\n${texte_brut}\n`;
  } else if (!aValeursConnues) {
    msg += 'Aucune valeur biologique structurée disponible. Analyse les éléments cliniques fournis si présents.\n';
  }

  msg += '\nMerci de fournir une analyse complète et structurée selon les 7 sections demandées, en tenant compte de tous les éléments fournis (valeurs biologiques ET contexte clinique).';
  return msg;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB avant encodage base64

// ── Construction du contenu message (texte + images visibles) ────────────────
// Les PDFs sont traités via texte_brut (extraction préalable) — trop lourds en base64
const construireContenuMessage = (analyse, texte_brut, fichiers) => {
  const contenu = [{ type: 'text', text: construireMessage(analyse, texte_brut) }];

  if (fichiers && fichiers.length > 0) {
    for (const f of fichiers) {
      const mime = f.mimetype === 'image/jpg' ? 'image/jpeg' : f.mimetype;
      if (
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)
        && f.buffer.length <= MAX_IMAGE_BYTES
      ) {
        contenu.push({
          type: 'image',
          source: { type: 'base64', media_type: mime, data: f.buffer.toString('base64') },
        });
      }
    }
  }

  return contenu;
};

// ── Appel Claude ──────────────────────────────────────────────────────────────
const analyserBilanAvecIA = async (analyse, { texte_brut, fichiers } = {}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée — ajoutez-la dans le fichier .env');

  const client = new Anthropic({ apiKey });

  const contenu = construireContenuMessage(analyse, texte_brut, fichiers);

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: contenu }],
  });

  const texte     = response.content[0]?.text || '';
  const tokensIn  = response.usage?.input_tokens  || 0;
  const tokensOut = response.usage?.output_tokens || 0;
  // Tarif claude-sonnet-4-6 : $3/MTok input, $15/MTok output
  const cout = (tokensIn * 3 + tokensOut * 15) / 1_000_000;

  return {
    texte,
    modele:         response.model || MODEL,
    tokens_input:   tokensIn,
    tokens_output:  tokensOut,
    cout_estime_usd: parseFloat(cout.toFixed(6)),
  };
};

module.exports = { analyserBilanAvecIA };
