import { useState, useMemo, useRef, useEffect, Component } from 'react';
import { useAnalysesBio, useExtraireAnalyseBio, useCreerAnalyseBio, useCreerEtAnalyserIA, useModifierAnalyseBio, useSupprimerAnalyseBio, useAnalyserAvecIA, useValiderAnalyseBio, useTelechargePdfAnalyse, useTelechargeDocxAnalyse } from '../../../hooks/useAnalysesBio';
import { interpreterPanels, couleurSeverite, iconesSeverite, SEVERITE } from '../../../utils/interpretationBio';
import { useAuth } from '../../../contexts/AuthContext';
import { useAbonnement } from '../../../hooks/useAbonnement';
import Button from '../../../components/ui/Button';
import { Plus, Trash2, ChevronDown, ChevronUp, FlaskConical, Upload, FileText, Image, Loader2, CheckCircle2, X, Sparkles, RefreshCw, Download, Pencil, Check, ShieldCheck, TrendingUp } from 'lucide-react';

// ── ErrorBoundary — empêche un crash d'une carte de vider toute la page ───────
class CarteErreur extends Component {
  constructor(props) { super(props); this.state = { erreur: false }; }
  static getDerivedStateFromError() { return { erreur: true }; }
  render() {
    if (this.state.erreur) {
      return (
        <div className="border border-red-200 rounded-carte px-4 py-3 bg-red-50 text-sm text-red-700">
          Erreur d&apos;affichage — donnée invalide.
        </div>
      );
    }
    return this.props.children;
  }
}

// Normalise les champs JSON qui peuvent revenir en string depuis MariaDB
const parseJSON = (val, fallback) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
  return val;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ── Labels des panels ─────────────────────────────────────────────────────────
const PANEL_INFO = {
  nfs:        { label: 'NFS',              couleur: 'bg-red-100 text-red-800 border-red-200' },
  renal:      { label: 'Bilan rénal',      couleur: 'bg-blue-100 text-blue-800 border-blue-200' },
  glycemie:   { label: 'Bilan glycémique', couleur: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  lipidique:  { label: 'Bilan lipidique',  couleur: 'bg-purple-100 text-purple-800 border-purple-200' },
  ionogramme: { label: 'Ionogramme',       couleur: 'bg-teal-100 text-teal-800 border-teal-200' },
  hepatique:  { label: 'Bilan hépatique',  couleur: 'bg-orange-100 text-orange-800 border-orange-200' },
  thyroide:   { label: 'Bilan thyroïdien', couleur: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  coagulation:{ label: 'Coagulation',      couleur: 'bg-rose-100 text-rose-800 border-rose-200' },
};

// ── Paramètres biologiques (labels + unités + normes) ─────────────────────────
const PARAMS_META = {
  nfs: {
    label: 'NFS — Numération Formule Sanguine',
    params: {
      hemoglobine:      { label: 'Hémoglobine',        unite: 'g/dL',          ref: (s) => s === 'F' ? '12–16'   : '13–17' },
      hematocrite:      { label: 'Hématocrite',         unite: '%',             ref: (s) => s === 'F' ? '35–47'   : '40–54' },
      globules_rouges:  { label: 'Globules rouges',     unite: 'T/L',           ref: (s) => s === 'F' ? '4,0–5,2' : '4,5–5,9' },
      vgm:              { label: 'VGM',                 unite: 'fL',            ref: () => '80–100' },
      tcmh:             { label: 'TCMH',                unite: 'pg',            ref: () => '27–33' },
      ccmh:             { label: 'CCMH',                unite: 'g/dL',          ref: () => '32–36' },
      rdw:              { label: 'RDW',                 unite: '%',             ref: () => '11,5–14,5' },
      globules_blancs:  { label: 'Globules blancs',     unite: 'G/L',           ref: () => '4–10' },
      neutrophiles_abs: { label: 'Neutrophiles (abs)',  unite: 'G/L',           ref: () => '1,8–7,5' },
      neutrophiles_pct: { label: 'Neutrophiles (%)',    unite: '%',             ref: () => '40–75' },
      lymphocytes_abs:  { label: 'Lymphocytes (abs)',   unite: 'G/L',           ref: () => '1,0–4,0' },
      lymphocytes_pct:  { label: 'Lymphocytes (%)',     unite: '%',             ref: () => '20–40' },
      monocytes_abs:    { label: 'Monocytes (abs)',     unite: 'G/L',           ref: () => '0,2–1,0' },
      monocytes_pct:    { label: 'Monocytes (%)',       unite: '%',             ref: () => '2–10' },
      eosinophiles_abs: { label: 'Éosinophiles (abs)',  unite: 'G/L',           ref: () => '0–0,5' },
      eosinophiles_pct: { label: 'Éosinophiles (%)',    unite: '%',             ref: () => '0–5' },
      basophiles_abs:   { label: 'Basophiles (abs)',    unite: 'G/L',           ref: () => '0–0,1' },
      basophiles_pct:   { label: 'Basophiles (%)',      unite: '%',             ref: () => '0–1' },
      plaquettes:       { label: 'Plaquettes',          unite: 'G/L',           ref: () => '150–400' },
    },
  },
  renal: {
    label: 'Bilan rénal',
    params: {
      // Créatinine — méthode enzymatique standardisée (HAS 2011)
      creatinine:   { label: 'Créatinine',   unite: 'µmol/L',        ref: (s) => s === 'F' ? '44–80'   : '62–106' },
      uree:         { label: 'Urée',         unite: 'mmol/L',        ref: () => '2,5–7,5' },
      acide_urique: { label: 'Acide urique', unite: 'µmol/L',        ref: (s) => s === 'F' ? '155–350' : '210–420' },
      dfg:          { label: 'DFG estimé',   unite: 'mL/min/1.73m²', ref: () => '> 60' },
    },
  },
  glycemie: {
    label: 'Bilan glycémique',
    params: {
      // Norme OMS/HAS : glycémie à jeun normale 0,70–1,10 g/L = 3,9–6,1 mmol/L
      // Prédiabète : 1,10–1,25 g/L | Diabète : ≥ 1,26 g/L (2 mesures)
      // Détection unité : valeur < 3 → g/L, sinon mmol/L
      glycemie_jeun: {
        label: 'Glycémie à jeun',
        unite: (v) => {
          const n = parseFloat(String(v ?? 0).replace(',', '.'));
          return (n > 0 && n < 3) ? 'g/L' : 'mmol/L';
        },
        ref: (s, v) => {
          const n = parseFloat(String(v ?? 0).replace(',', '.'));
          return (n > 0 && n < 3) ? '0,70–1,10' : '3,9–6,1';
        },
      },
      // Postprandiale (2h) : normale < 1,40 g/L (< 7,8 mmol/L) | Diabète ≥ 2,00 g/L
      glycemie_postprandiale: {
        label: 'Glycémie postprandiale (2h)',
        unite: (v) => {
          const n = parseFloat(String(v ?? 0).replace(',', '.'));
          return (n > 0 && n < 3) ? 'g/L' : 'mmol/L';
        },
        ref: (s, v) => {
          const n = parseFloat(String(v ?? 0).replace(',', '.'));
          return (n > 0 && n < 3) ? '< 1,40' : '< 7,8';
        },
      },
      // HbA1c : normale < 5,7 % | Prédiabète 5,7–6,4 % | Diabète ≥ 6,5 %
      hba1c: { label: 'HbA1c', unite: '%', ref: () => '< 5,7' },
    },
  },
  lipidique: {
    label: 'Bilan lipidique',
    params: {
      // Cholestérol total : souhaitable < 5,2 mmol/L (< 2,0 g/L) — VIDAL/HAS
      cholesterol_total: { label: 'Cholestérol total', unite: 'mmol/L', ref: () => '< 5,2' },
      // LDL : valeur de référence populationnelle < 4,1 mmol/L (< 1,60 g/L)
      // NB : < 3,4 est un objectif thérapeutique (risque CV modéré), pas une norme
      ldl:               { label: 'LDL-cholestérol',   unite: 'mmol/L', ref: () => '< 4,1' },
      // HDL : risque CV si F < 1,3 mmol/L ou H < 1,0 mmol/L (> 0,50 g/L F / > 0,40 g/L H)
      hdl:               { label: 'HDL-cholestérol',   unite: 'mmol/L', ref: (s) => s === 'F' ? '> 1,3' : '> 1,0' },
      triglycerides:     { label: 'Triglycérides',      unite: 'mmol/L', ref: () => '< 1,7' },
    },
  },
  ionogramme: {
    label: 'Ionogramme',
    params: {
      sodium:       { label: 'Sodium',       unite: 'mmol/L', ref: () => '136–145' },
      potassium:    { label: 'Potassium',    unite: 'mmol/L', ref: () => '3,5–5,0' },
      chlore:       { label: 'Chlore',       unite: 'mmol/L', ref: () => '96–106' },
      calcium:      { label: 'Calcium',      unite: 'mmol/L', ref: () => '2,20–2,60' },
      magnesium:    { label: 'Magnésium',    unite: 'mmol/L', ref: () => '0,75–1,00' },
      phosphore:    { label: 'Phosphore',    unite: 'mmol/L', ref: () => '0,80–1,45' },
      bicarbonates: { label: 'Bicarbonates', unite: 'mmol/L', ref: () => '22–29' },
    },
  },
  hepatique: {
    label: 'Bilan hépatique',
    params: {
      crp:               { label: 'CRP (Protéine C-réactive)', unite: 'mg/L',   ref: () => '< 6' },
      asat:              { label: 'ASAT (GOT)',                 unite: 'UI/L',   ref: () => '10–40' },
      alat:              { label: 'ALAT (TGP)',                 unite: 'UI/L',   ref: () => '10–35' },
      ggt:               { label: 'GGT (Gamma-GT)',             unite: 'UI/L',   ref: (s) => s === 'F' ? '< 35' : '< 50' },
      pal:               { label: 'PAL (Phosphatases alcalines)', unite: 'UI/L', ref: () => '40–130' },
      bilirubine_totale: { label: 'Bilirubine totale',          unite: 'µmol/L', ref: () => '< 17' },
      bilirubine_directe:{ label: 'Bilirubine directe',         unite: 'µmol/L', ref: () => '< 5' },
      albumine:          { label: 'Albumine',                   unite: 'g/L',    ref: () => '35–50' },
    },
  },
  thyroide: {
    label: 'Bilan thyroïdien',
    params: {
      tsh: { label: 'TSH (Thyréostimuline)', unite: 'mUI/L',  ref: () => '0,4–4,0' },
      ft3: { label: 'T3 libre (FT3)',        unite: 'pmol/L', ref: () => '3,5–6,5' },
      ft4: { label: 'T4 libre (FT4)',        unite: 'pmol/L', ref: () => '10–26' },
    },
  },
  coagulation: {
    label: 'Coagulation',
    params: {
      tp:          { label: 'TP (Taux de Prothrombine)', unite: '%',   ref: () => '70–100' },
      inr:         { label: 'INR',                        unite: '',    ref: () => '0,8–1,2' },
      tca:         { label: 'TCA',                        unite: 's',   ref: () => '25–38' },
      fibrinogene: { label: 'Fibrinogène',                unite: 'g/L', ref: () => '2,0–4,0' },
    },
  },
};

// Calcul statut par rapport à la norme
const calculerStatutBio = (valeur, refStr) => {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const num = parseFloat(String(valeur).replace(',', '.'));
  if (isNaN(num)) return null;
  const clean = refStr.replace(/\s*\([^)]+\)/, '').trim();
  if (clean.includes('–')) {
    const [a, b] = clean.split('–').map(s => parseFloat(s.replace(',', '.')));
    if (isNaN(a) || isNaN(b)) return null;
    if (num < a) return { label: '↓ Diminué',  classe: 'bg-blue-100 text-blue-800' };
    if (num > b) return { label: '↑ Augmenté', classe: 'bg-red-100 text-red-800' };
    return           { label: '✓ Normal',      classe: 'bg-green-100 text-green-800' };
  }
  const lt = clean.match(/^<\s*([\d,]+)/);
  if (lt) {
    const s = parseFloat(lt[1].replace(',', '.'));
    if (num < s * 0.95) return { label: '✓ Normal',      classe: 'bg-green-100 text-green-800' };
    if (num < s)        return { label: '↑ Limite',       classe: 'bg-orange-100 text-orange-800' };
    return                     { label: '↑ Augmenté',     classe: 'bg-red-100 text-red-800' };
  }
  const gt = clean.match(/^>\s*([\d,]+)/);
  if (gt) {
    const s = parseFloat(gt[1].replace(',', '.'));
    if (num > s * 1.05) return { label: '✓ Normal',      classe: 'bg-green-100 text-green-800' };
    if (num > s)        return { label: '↓ Limite',       classe: 'bg-orange-100 text-orange-800' };
    return                     { label: '↓ Diminué',      classe: 'bg-blue-100 text-blue-800' };
  }
  return null;
};

// ── Tableau des valeurs par panel ─────────────────────────────────────────────
const TableauPanel = ({ panelId, valeurs, sexe }) => {
  const meta = PARAMS_META[panelId];
  if (!meta) return null;
  const v = valeurs[panelId] || {};
  const lignes = Object.entries(meta.params)
    .map(([cle, param]) => ({ cle, param, val: v[cle] }))
    .filter(({ val }) => val !== null && val !== undefined && val !== '');
  if (!lignes.length) return null;

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <div className="bg-[#0D5C38] text-white text-xs font-semibold px-3 py-2">
        {meta.label}
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#CFD8DC] text-[#37474F]">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Paramètre</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Résultat</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Normes</th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-28">Statut</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(({ cle, param, val }, i) => {
            const refStr = typeof param.ref === 'function' ? param.ref(sexe, val) : param.ref;
            const uniteStr = typeof param.unite === 'function' ? param.unite(val) : param.unite;
            const statut = calculerStatutBio(val, refStr);
            return (
              <tr key={cle} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-200 px-3 py-1.5 text-gray-800">{param.label}</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-semibold text-gray-900">
                  {val} <span className="font-normal text-gray-500">{uniteStr}</span>
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-right text-gray-500">
                  {refStr} {uniteStr}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-center">
                  {statut ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statut.classe}`}>
                      {statut.label}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PanelBadge = ({ id }) => {
  const p = PANEL_INFO[id];
  return p ? (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${p.couleur}`}>{p.label}</span>
  ) : null;
};

// ── Interprétations d'un panel ────────────────────────────────────────────────
const BlocInterpretations = ({ items }) => (
  <div className="space-y-2">
    {(items || []).map((item) => (
      <div key={item.code} className={`border rounded-bouton p-3 ${couleurSeverite(item.severite)}`}>
        <div className="flex items-start gap-2">
          <span className="font-bold text-base flex-shrink-0">{iconesSeverite[item.severite]}</span>
          <div>
            <p className="font-semibold text-sm">{item.titre}</p>
            <p className="text-sm mt-0.5 leading-relaxed">{item.texte}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ── Barre de progression ──────────────────────────────────────────────────────
const BarreProgression = ({ pct, etape }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-xs text-texte-secondaire">
      <span className="flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin" />
        {etape}
      </span>
      <span>{pct}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-zeze-vert rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);

// ── Rendu du texte IA ─────────────────────────────────────────────────────────
const RenderTexteIA = ({ texte }) => {
  if (!texte) return null;
  const lignes = texte.split('\n');
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lignes.map((ligne, i) => {
        if (!ligne.trim()) return <div key={i} className="h-2" />;
        // Titres de section (commencent par emoji ou chiffre+point)
        if (/^[📊⚠️🧠📋💬🩺⚖️✍️]/.test(ligne) || /^\d+\.\s/.test(ligne)) {
          return <p key={i} className="font-semibold text-texte-principal mt-3 mb-1">{ligne}</p>;
        }
        // Rendu bold **texte**
        const parts = ligne.split(/(\*\*[^*]+\*\*)/);
        return (
          <p key={i} className="text-texte-principal">
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : p
            )}
          </p>
        );
      })}
    </div>
  );
};

// ── Zone d'upload ─────────────────────────────────────────────────────────────
const TYPES_ACCEPTES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const BanniereIADesactivee = ({ raison }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-bouton text-xs text-gray-500">
    <Sparkles size={13} className="flex-shrink-0 text-gray-400" />
    {raison === 'quota'
      ? 'Quota IA mensuel atteint. Contactez ZEZEPAGNON pour augmenter votre quota.'
      : 'L\'accès à l\'analyse IA n\'est pas activé pour votre compte. Contactez l\'administrateur.'}
  </div>
);

const ZoneUpload = ({ patientId, onTermine, onAnnuler }) => {
  const { utilisateur } = useAuth();
  const { data: abonnement } = useAbonnement();
  const peutIAUser = utilisateur?.peut_utiliser_ia !== false;
  const quotaDepasse = abonnement && !abonnement.peut_utiliser_ia && peutIAUser;
  const peutIA = peutIAUser && abonnement?.peut_utiliser_ia !== false;
  const [fichiers, setFichiers] = useState([]);
  const [survol, setSurvol] = useState(false);
  const [extraction, setExtraction] = useState(null); // null = étape 1, objet = étape 2
  const [pct, setPct] = useState(0);
  const [etapeMsg, setEtapeMsg] = useState('');
  const [erreur, setErreur] = useState('');
  const inputRef = useRef(null);
  const timersRef = useRef([]);

  const extraire  = useExtraireAnalyseBio(patientId);
  const creer     = useCreerAnalyseBio(patientId);
  const creerIA   = useCreerEtAnalyserIA(patientId);

  const nettoyer = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  useEffect(() => () => nettoyer(), []);

  const enExtraction = extraire.isPending;
  const enSauvegarde = creer.isPending || creerIA.isPending;
  const enCours      = enExtraction || enSauvegarde;

  const ajouterFichiers = (nouveaux) => {
    if (enCours) return;
    const liste = Array.from(nouveaux);
    const invalides = liste.filter((f) => !TYPES_ACCEPTES.includes(f.type));
    if (invalides.length) { setErreur('Format non supporté. Utilisez PDF, PNG ou JPEG.'); return; }
    const tropGrands = liste.filter((f) => f.size > 15 * 1024 * 1024);
    if (tropGrands.length) { setErreur('Un fichier dépasse 15 Mo.'); return; }
    setErreur('');
    setExtraction(null);
    setFichiers((prev) => {
      const noms = new Set(prev.map((f) => f.name));
      return [...prev, ...liste.filter((f) => !noms.has(f.name))];
    });
  };

  const retirerFichier = (nom) => {
    setFichiers((prev) => prev.filter((f) => f.name !== nom));
    setExtraction(null);
  };

  const lancerExtraction = async () => {
    if (!fichiers.length || enCours) return;
    setErreur('');
    nettoyer();
    const etapes = [
      { pct: 15, msg: 'Envoi des fichiers…',     delai: 100 },
      { pct: 35, msg: 'Lecture des documents…',   delai: 800 },
      { pct: 60, msg: 'Extraction du texte…',     delai: 2500 },
      { pct: 80, msg: 'Analyse des valeurs…',     delai: 5000 },
    ];
    etapes.forEach(({ pct: p, msg, delai }) => {
      timersRef.current.push(setTimeout(() => { setPct(p); setEtapeMsg(msg); }, delai));
    });
    try {
      const result = await extraire.mutateAsync(fichiers);
      nettoyer(); setPct(100); setEtapeMsg('Extraction terminée !');
      setTimeout(() => { setExtraction(result); setPct(0); setEtapeMsg(''); }, 500);
    } catch (err) {
      nettoyer(); setPct(0); setEtapeMsg('');
      setErreur(err?.response?.data?.message || "Erreur lors de l'extraction. Vérifiez les fichiers et réessayez.");
    }
  };

  const doSauvegarder = async (avecIA) => {
    setErreur('');
    nettoyer();
    if (avecIA) {
      const etapes = [
        { pct: 10, msg: 'Enregistrement de l\'analyse…', delai: 100 },
        { pct: 25, msg: 'Envoi des documents à l\'IA…',  delai: 1500 },
        { pct: 45, msg: 'Analyse médicale en cours…',    delai: 6000 },
        { pct: 65, msg: 'Interprétation clinique…',      delai: 20000 },
        { pct: 82, msg: 'Génération du rapport…',        delai: 45000 },
      ];
      etapes.forEach(({ pct: p, msg, delai }) => {
        timersRef.current.push(setTimeout(() => { setPct(p); setEtapeMsg(msg); }, delai));
      });
    }

    const metaDonnees = {
      date_analyse:    extraction.meta.date_analyse,
      sexe_patient:    extraction.meta.sexe_patient,
      age_patient:     extraction.meta.age_patient,
      panels_demandes: extraction.panels.length ? extraction.panels : ['nfs'],
      valeurs_brutes:  extraction.valeurs,
      source:          extraction.meta.source,
      texte_brut:      extraction.texte_brut || null,
    };

    try {
      if (avecIA) {
        // Envoie les fichiers originaux directement à Claude (ECG visible en images/PDFs)
        const form = new FormData();
        Object.entries(metaDonnees).forEach(([k, v]) => {
          if (v !== null && v !== undefined) {
            form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
          }
        });
        fichiers.forEach((f) => form.append('fichiers', f));
        await creerIA.mutateAsync(form);
      } else {
        await creer.mutateAsync(metaDonnees);
      }
      nettoyer();
      onTermine();
    } catch (err) {
      nettoyer(); setPct(0); setEtapeMsg('');
      setErreur(err?.response?.data?.message || (avecIA ? "Erreur lors de l'analyse IA." : "Erreur lors de l'enregistrement."));
    }
  };

  const aFichiers = fichiers.length > 0;

  // ── Chargement analyse IA ──────────────────────────────────────────────
  if (creerIA.isPending) {
    return (
      <div className="space-y-3 py-2">
        <BarreProgression pct={pct} etape={etapeMsg || 'Analyse IA en cours…'} />
      </div>
    );
  }

  // ── Étape 2 : prévisualisation des données extraites ───────────────────
  if (extraction) {
    return (
      <div className="space-y-4">
        <div className={`rounded-carte p-3 border ${extraction.a_donnees ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {extraction.a_donnees
              ? <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
              : <span className="text-orange-500 text-base flex-shrink-0 leading-none">⚠</span>
            }
            <p className={`text-sm font-medium ${extraction.a_donnees ? 'text-green-800' : 'text-orange-800'}`}>
              {extraction.a_donnees
                ? `${extraction.nb_valeurs} valeur${extraction.nb_valeurs > 1 ? 's' : ''} extraite${extraction.nb_valeurs > 1 ? 's' : ''}`
                : 'Aucune donnée biologique extraite'
              }
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {extraction.panels.map((p) => <PanelBadge key={p} id={p} />)}
          </div>
          {!extraction.a_donnees && (
            <p className="text-xs text-orange-700 mt-1.5">
              Aucune valeur biologique reconnue. L&apos;IA analysera le document tel quel.
            </p>
          )}
        </div>

        {erreur && <p className="text-sm text-medical-critique">{erreur}</p>}

        {creer.isPending && (
          <div className="flex items-center gap-2 text-sm text-texte-secondaire py-1">
            <Loader2 size={14} className="animate-spin" /> Enregistrement…
          </div>
        )}

        {!creer.isPending && (
          <div className="flex flex-wrap justify-between items-center gap-2">
            <Button
              variante="secondaire"
              taille="petit"
              icone={X}
              onClick={() => { setExtraction(null); setErreur(''); }}
              disabled={enSauvegarde}
            >
              Modifier les fichiers
            </Button>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                variante="secondaire"
                icone={FlaskConical}
                onClick={() => doSauvegarder(false)}
                disabled={enSauvegarde}
                chargement={creer.isPending}
              >
                Analyse locale
              </Button>
              {peutIA ? (
                <Button
                  icone={Sparkles}
                  onClick={() => doSauvegarder(true)}
                  disabled={enSauvegarde}
                  chargement={creerIA.isPending}
                >
                  Analyser avec l&apos;IA
                </Button>
              ) : (
                <BanniereIADesactivee raison={quotaDepasse ? 'quota' : 'permission'} />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Étape 1 : dépôt de fichiers ────────────────────────────────────────
  return (
    <div className="space-y-4">
      {!enExtraction && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouterFichiers(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-carte p-6 text-center cursor-pointer transition-all ${
              survol ? 'border-zeze-vert bg-green-50'
                     : aFichiers ? 'border-zeze-vert/40 bg-green-50/30'
                     : 'border-bordure hover:border-gray-400 hover:bg-fond-secondaire'
            }`}
          >
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" multiple
              onChange={(e) => ajouterFichiers(e.target.files)} />
            <Upload size={28} className={`mx-auto mb-2 ${aFichiers ? 'text-zeze-vert' : 'text-texte-secondaire'}`} />
            {aFichiers ? (
              <p className="text-xs text-zeze-vert font-medium">Cliquez ou déposez pour ajouter d&apos;autres fichiers</p>
            ) : (
              <div>
                <p className="text-sm font-medium text-texte-principal">Déposez vos fichiers ici</p>
                <p className="text-xs text-texte-secondaire mt-1">ou cliquez pour sélectionner</p>
                <p className="text-xs text-texte-secondaire mt-0.5">PDF, PNG, JPEG · 15 Mo max · plusieurs fichiers</p>
              </div>
            )}
          </div>

          {aFichiers && (
            <div className="space-y-1.5">
              {fichiers.map((f) => (
                <div key={f.name} className="flex items-center gap-2 px-3 py-2 bg-fond-secondaire rounded-bouton">
                  {f.type === 'application/pdf'
                    ? <FileText size={14} className="text-zeze-vert flex-shrink-0" />
                    : <Image size={14} className="text-zeze-vert flex-shrink-0" />}
                  <span className="flex-1 truncate text-texte-principal text-xs">{f.name}</span>
                  <span className="text-xs text-texte-secondaire flex-shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); retirerFichier(f.name); }}
                    className="text-texte-secondaire hover:text-medical-critique flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {enExtraction && <BarreProgression pct={pct} etape={etapeMsg || 'Extraction en cours…'} />}
      {erreur && <p className="text-sm text-medical-critique">{erreur}</p>}

      {!enExtraction && (
        <div className="flex justify-between items-center">
          <Button variante="secondaire" onClick={onAnnuler}>Annuler</Button>
          <Button
            icone={FlaskConical}
            onClick={lancerExtraction}
            disabled={!aFichiers}
            chargement={extraire.isPending}
          >
            {`Extraire${fichiers.length > 1 ? ` (${fichiers.length} fichiers)` : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Saisie manuelle ───────────────────────────────────────────────────────────
const ORDRE_PANELS = ['nfs', 'renal', 'glycemie', 'lipidique', 'ionogramme', 'hepatique', 'thyroide', 'coagulation'];

const FormulaireManuel = ({ patientId, patient, onTermine, onAnnuler }) => {
  const creer = useCreerAnalyseBio(patientId);
  const [meta, setMeta] = useState({
    date_analyse: new Date().toISOString().slice(0, 10),
    sexe_patient: patient?.sexe || 'M',
    age_patient:  '',
    contexte_clinique: '',
  });
  const [panelsActifs, setPanelsActifs] = useState([]);
  const [valeurs, setValeurs] = useState({});
  const [erreur, setErreur] = useState('');

  const togglePanel = (id) =>
    setPanelsActifs((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const setVal = (panelId, key, val) =>
    setValeurs((prev) => ({ ...prev, [panelId]: { ...(prev[panelId] || {}), [key]: val } }));

  const handleSauvegarder = async () => {
    if (panelsActifs.length === 0) { setErreur('Sélectionnez au moins un panel.'); return; }
    setErreur('');
    try {
      await creer.mutateAsync({
        date_analyse:    meta.date_analyse,
        sexe_patient:    meta.sexe_patient,
        age_patient:     meta.age_patient ? parseInt(meta.age_patient) : null,
        panels_demandes: panelsActifs,
        valeurs_brutes:  valeurs,
        source:          'manuelle',
        contexte_clinique: meta.contexte_clinique || null,
      });
      onTermine();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Métadonnées */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-texte-secondaire mb-1">Date</label>
          <input type="date" value={meta.date_analyse}
            onChange={(e) => setMeta((p) => ({ ...p, date_analyse: e.target.value }))}
            className="champ-input text-xs" />
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-secondaire mb-1">Sexe</label>
          <select value={meta.sexe_patient}
            onChange={(e) => setMeta((p) => ({ ...p, sexe_patient: e.target.value }))}
            className="champ-input text-xs">
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-secondaire mb-1">Âge</label>
          <input type="number" min={0} max={120} value={meta.age_patient}
            onChange={(e) => setMeta((p) => ({ ...p, age_patient: e.target.value }))}
            className="champ-input text-xs" placeholder="ans" />
        </div>
      </div>

      {/* Sélection des panels */}
      <div>
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">
          Panels à renseigner
        </p>
        <div className="flex flex-wrap gap-2">
          {ORDRE_PANELS.map((id) => {
            const actif = panelsActifs.includes(id);
            const info  = PANEL_INFO[id];
            return (
              <button key={id} type="button" onClick={() => togglePanel(id)}
                className={`px-3 py-1.5 text-xs rounded-bouton border transition-colors font-medium ${
                  actif ? 'bg-zeze-vert text-white border-zeze-vert' : 'border-bordure text-texte-secondaire hover:border-zeze-vert hover:text-zeze-vert'
                }`}>
                {info?.label || id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Champs par panel */}
      {panelsActifs.map((panelId) => {
        const meta_panel = PARAMS_META[panelId];
        if (!meta_panel) return null;
        return (
          <div key={panelId} className="border border-bordure rounded-carte overflow-hidden">
            <div className="bg-[#0D5C38] text-white text-xs font-semibold px-3 py-2">
              {meta_panel.label}
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(meta_panel.params).map(([key, param]) => {
                const refStr = typeof param.ref === 'function' ? param.ref(meta.sexe_patient) : param.ref;
                const uniteStr = typeof param.unite === 'function'
                  ? param.unite(valeurs[panelId]?.[key])
                  : param.unite;
                return (
                  <div key={key}>
                    <label className="block text-xs text-texte-secondaire mb-0.5">
                      {param.label}
                      {uniteStr && <span className="ml-1 text-gray-400">({uniteStr})</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={valeurs[panelId]?.[key] ?? ''}
                      onChange={(e) => setVal(panelId, key, e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder={refStr}
                      className="champ-input text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Contexte clinique */}
      {panelsActifs.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-texte-secondaire mb-1">
            Contexte clinique (optionnel)
          </label>
          <textarea rows={2} value={meta.contexte_clinique}
            onChange={(e) => setMeta((p) => ({ ...p, contexte_clinique: e.target.value }))}
            className="w-full text-xs border border-bordure rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primaire"
            placeholder="Symptômes, antécédents, traitement en cours…" />
        </div>
      )}

      {erreur && <p className="text-sm text-medical-critique">{erreur}</p>}

      <div className="flex gap-2 flex-wrap">
        <Button variante="primaire" icone={FlaskConical} chargement={creer.isPending} onClick={handleSauvegarder}
          disabled={panelsActifs.length === 0}>
          Enregistrer l'analyse
        </Button>
        <Button variante="fantome" icone={X} disabled={creer.isPending} onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </div>
  );
};

// ── Graphique évolution temporelle ────────────────────────────────────────────
const GraphiqueEvolution = ({ analyses }) => {
  const [paramCle, setParamCle] = useState('');

  // Construire la liste de tous les paramètres présents dans ≥ 2 analyses
  const paramsDisponibles = useMemo(() => {
    const compteur = {};
    analyses.forEach((a) => {
      const valeurs = parseJSON(a.valeurs_brutes, {});
      const panels  = parseJSON(a.panels_demandes, []);
      panels.forEach((panelId) => {
        const panelMeta = PARAMS_META[panelId];
        if (!panelMeta) return;
        Object.keys(panelMeta.params).forEach((key) => {
          const val = valeurs[panelId]?.[key];
          if (val !== null && val !== undefined && val !== '') {
            const cle = `${panelId}.${key}`;
            compteur[cle] = (compteur[cle] || 0) + 1;
          }
        });
      });
    });
    return Object.entries(compteur)
      .filter(([, n]) => n >= 2)
      .map(([cle]) => {
        const [panelId, key] = cle.split('.');
        const param = PARAMS_META[panelId]?.params?.[key];
        return { cle, panelId, key, label: param?.label || key };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [analyses]);

  if (paramsDisponibles.length === 0) {
    return (
      <p className="text-xs text-texte-secondaire italic py-4 text-center">
        Enregistrez au moins 2 analyses avec un paramètre commun pour voir son évolution.
      </p>
    );
  }

  const paramActuel = paramCle || paramsDisponibles[0]?.cle || '';
  const [panelId, key] = paramActuel.split('.');
  const panelMeta = PARAMS_META[panelId];
  const paramMeta = panelMeta?.params?.[key];

  // Extraire les points (date, valeur) triés chronologiquement
  const points = analyses
    .map((a) => {
      const valeurs = parseJSON(a.valeurs_brutes, {});
      const val = valeurs[panelId]?.[key];
      if (val === null || val === undefined || val === '') return null;
      return { date: a.date_analyse, valeur: parseFloat(val), sexe: a.sexe_patient };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (points.length < 2) {
    return (
      <div className="space-y-3">
        <select value={paramActuel} onChange={(e) => setParamCle(e.target.value)}
          className="champ-input text-xs max-w-xs">
          {paramsDisponibles.map(({ cle, label }) => (
            <option key={cle} value={cle}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-texte-secondaire italic">
          Pas assez de valeurs pour ce paramètre.
        </p>
      </div>
    );
  }

  // Calcul des bornes de référence (pour la ligne de norme)
  const refStr = paramMeta ? (typeof paramMeta.ref === 'function' ? paramMeta.ref(points[0]?.sexe || 'M') : paramMeta.ref) : '';
  let refMin = null, refMax = null;
  if (refStr.includes('–')) {
    const parts = refStr.split('–').map((s) => parseFloat(s.replace(',', '.')));
    if (!isNaN(parts[0]) && !isNaN(parts[1])) { refMin = parts[0]; refMax = parts[1]; }
  } else {
    const lt = refStr.match(/^<\s*([\d,]+)/);
    if (lt) { refMin = 0; refMax = parseFloat(lt[1].replace(',', '.')); }
    const gt = refStr.match(/^>\s*([\d,]+)/);
    if (gt) { refMin = parseFloat(gt[1].replace(',', '.')); }
  }

  // Dimensions SVG
  const W = 400, H = 140, PL = 50, PR = 10, PT = 10, PB = 30;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const vals = points.map((p) => p.valeur);
  const allVals = refMin !== null && refMax !== null ? [...vals, refMin, refMax] : vals;
  const vMin = Math.min(...allVals) * 0.85;
  const vMax = Math.max(...allVals) * 1.15;
  const vRange = vMax - vMin || 1;

  const toX = (i) => PL + (i / (points.length - 1)) * innerW;
  const toY = (val) => PT + innerH - ((val - vMin) / vRange) * innerH;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.valeur).toFixed(1)}`).join(' ');

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';
  const estHorsNorme = (val) => {
    if (refMin !== null && refMax !== null) return val < refMin || val > refMax;
    if (refMax !== null) return val > refMax;
    if (refMin !== null) return val < refMin;
    return false;
  };

  return (
    <div className="space-y-3">
      <select value={paramActuel} onChange={(e) => setParamCle(e.target.value)}
        className="champ-input text-xs max-w-xs">
        {paramsDisponibles.map(({ cle, label }) => (
          <option key={cle} value={cle}>{label}</option>
        ))}
      </select>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg" style={{ minWidth: 280 }}>
          {/* Zone normale */}
          {refMin !== null && refMax !== null && (
            <rect
              x={PL} y={toY(refMax)}
              width={innerW} height={toY(refMin) - toY(refMax)}
              fill="#dcfce7" opacity={0.6}
            />
          )}
          {/* Lignes de norme */}
          {refMin !== null && (
            <line x1={PL} x2={PL + innerW} y1={toY(refMin)} y2={toY(refMin)}
              stroke="#16a34a" strokeWidth={0.8} strokeDasharray="4,3" />
          )}
          {refMax !== null && (
            <line x1={PL} x2={PL + innerW} y1={toY(refMax)} y2={toY(refMax)}
              stroke="#16a34a" strokeWidth={0.8} strokeDasharray="4,3" />
          )}
          {/* Courbe */}
          <path d={pathD} fill="none" stroke="#0D5C38" strokeWidth={1.8} strokeLinejoin="round" />
          {/* Points */}
          {points.map((p, i) => {
            const hors = estHorsNorme(p.valeur);
            return (
              <g key={i}>
                <circle cx={toX(i)} cy={toY(p.valeur)} r={4}
                  fill={hors ? '#dc2626' : '#0D5C38'} stroke="white" strokeWidth={1.5} />
                <text x={toX(i)} y={toY(p.valeur) - 7} textAnchor="middle"
                  fontSize={8} fill={hors ? '#dc2626' : '#374151'} fontWeight="600">
                  {p.valeur}
                </text>
                <text x={toX(i)} y={H - 5} textAnchor="middle" fontSize={7.5} fill="#6b7280">
                  {fmtDate(p.date)}
                </text>
              </g>
            );
          })}
          {/* Axe Y labels */}
          {[vMin, (vMin + vMax) / 2, vMax].map((val, i) => (
            <text key={i} x={PL - 4} y={toY(val) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
              {val.toFixed(1)}
            </text>
          ))}
        </svg>
      </div>
      <p className="text-xs text-texte-secondaire">
        {paramMeta?.label} — {paramMeta?.unite ? `unité : ${typeof paramMeta.unite === 'string' ? paramMeta.unite : ''}` : ''} Norme : {refStr}
        {points.length} mesure{points.length > 1 ? 's' : ''}
      </p>
    </div>
  );
};

// ── Carte d'une analyse sauvegardée ───────────────────────────────────────────
const CarteAnalyseInterne = ({ analyse }) => {
  const { utilisateur } = useAuth();
  const { data: abonnement } = useAbonnement();
  const peutIA = utilisateur?.peut_utiliser_ia !== false && abonnement?.peut_utiliser_ia !== false;
  const [ouverte, setOuverte] = useState(false);
  const [editConclusion, setEditConclusion] = useState(false);
  const [texteConclusion, setTexteConclusion] = useState('');
  const supprimer  = useSupprimerAnalyseBio(analyse.patient_id);
  const modifier   = useModifierAnalyseBio(analyse.patient_id);
  const analyserIA = useAnalyserAvecIA(analyse.patient_id);
  const valider    = useValiderAnalyseBio(analyse.patient_id);
  const telechargerPdf  = useTelechargePdfAnalyse(analyse.patient_id);
  const telechargerDocx = useTelechargeDocxAnalyse(analyse.patient_id);

  const ouvrirEditionConclusion = () => {
    setTexteConclusion(analyse.conclusion || '');
    setEditConclusion(true);
  };

  const sauvegarderConclusion = async () => {
    try {
      await modifier.mutateAsync({ analyseId: analyse.id, data: { conclusion: texteConclusion.trim() || null } });
      setEditConclusion(false);
    } catch { /* affiché via modifier.isError */ }
  };

  const panels = useMemo(() => parseJSON(analyse.panels_demandes, []), [analyse.panels_demandes]);
  const valeurs = useMemo(() => parseJSON(analyse.valeurs_brutes, {}), [analyse.valeurs_brutes]);

  const interpretations = useMemo(() => {
    try {
      return interpreterPanels(valeurs, panels, analyse.sexe_patient);
    } catch {
      return {};
    }
  }, [valeurs, panels, analyse.sexe_patient]);

  const toutesInterp = Object.values(interpretations).flat();
  const nbCrit = toutesInterp.filter((x) => x.severite === SEVERITE.CRITIQUE).length;
  const nbAtt  = toutesInterp.filter((x) => x.severite === SEVERITE.ATTENTION).length;
  const estNormal = nbCrit === 0 && nbAtt === 0 && toutesInterp.some((x) => x.severite === SEVERITE.NORMAL);

  const sourceLabel = { manuelle: 'Saisie', upload_pdf: 'PDF', upload_image: 'Image' };

  return (
    <div className="border border-bordure rounded-carte overflow-hidden">
      <button
        onClick={() => setOuverte(!ouverte)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-fond-secondaire transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-texte-principal">{fmtDate(analyse.date_analyse)}</span>
          <div className="flex gap-1 flex-wrap">
            {panels.map((p) => <PanelBadge key={p} id={p} />)}
          </div>
          {nbCrit > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {nbCrit} critique{nbCrit > 1 ? 's' : ''}
            </span>
          )}
          {nbAtt > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {nbAtt} anomalie{nbAtt > 1 ? 's' : ''}
            </span>
          )}
          {estNormal && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Normal
            </span>
          )}
          {analyse.analyse_ia_texte && (
            analyse.valide_par_medecin
              ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <ShieldCheck size={10} />
                  Validée
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Non validée
                </span>
              )
          )}
          <span className="text-xs text-texte-secondaire">{sourceLabel[analyse.source] || ''}</span>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <span className="text-xs text-texte-secondaire hidden sm:block">
            {analyse.auteur?.prenom} {analyse.auteur?.nom}
          </span>
          {ouverte ? <ChevronUp size={16} className="text-texte-secondaire" /> : <ChevronDown size={16} className="text-texte-secondaire" />}
        </div>
      </button>

      {ouverte && (
        <div className="px-4 pb-4 pt-3 space-y-4 bg-white border-t border-bordure">
          {/* Tableaux des valeurs brutes */}
          {panels.map((panelId) => (
            <TableauPanel
              key={panelId}
              panelId={panelId}
              valeurs={valeurs}
              sexe={analyse.sexe_patient}
            />
          ))}

          {/* Interprétations cliniques */}
          {panels.some((p) => (interpretations[p] || []).length > 0) && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">
                Interprétation clinique
              </p>
              {panels.map((panelId) => {
                const items = interpretations[panelId] || [];
                return items.length > 0 ? (
                  <BlocInterpretations key={panelId} items={items} />
                ) : null;
              })}
            </div>
          )}

          {/* Conclusion générale — éditable */}
          <div className="bg-fond-secondaire rounded-bouton p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Conclusion générale</p>
              {!editConclusion && (
                <button
                  onClick={ouvrirEditionConclusion}
                  className="text-texte-secondaire hover:text-texte-principal transition-colors"
                  title="Modifier la conclusion"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
            {editConclusion ? (
              <div className="space-y-2">
                <textarea
                  value={texteConclusion}
                  onChange={(e) => setTexteConclusion(e.target.value)}
                  className="w-full text-sm border border-bordure rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primaire"
                  rows={3}
                  placeholder="Ex : Anémie hypochrome microcytaire isolée, prédiabète de type 2..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={sauvegarderConclusion}
                    disabled={modifier.isPending}
                    className="flex items-center gap-1 text-xs bg-primaire text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
                  >
                    <Check size={11} />
                    {modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setEditConclusion(false)}
                    className="text-xs text-texte-secondaire hover:text-texte-principal px-2 py-1"
                  >
                    Annuler
                  </button>
                </div>
                {modifier.isError && (
                  <p className="text-xs text-rouge">Erreur lors de l'enregistrement.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-texte-principal whitespace-pre-wrap">
                {analyse.conclusion || (
                  <span className="italic text-texte-secondaire">
                    Aucune conclusion — cliquez sur le crayon pour en ajouter une.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Analyse IA */}
          <div className="border border-purple-200 rounded-carte overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 bg-purple-50">
              <span className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                <Sparkles size={12} />
                Analyse IA — Médecin biologiste
              </span>
              {peutIA && (
                <div className="flex items-center gap-2">
                  {abonnement && abonnement.quota_ia_mensuel > 0 && (
                    <span className="text-xs text-purple-400">
                      {abonnement.nb_analyses_ce_mois}/{abonnement.quota_ia_mensuel} ce mois
                    </span>
                  )}
                  <Button
                    variante="fantome"
                    icone={analyse.analyse_ia_texte ? RefreshCw : Sparkles}
                    taille="petit"
                    chargement={analyserIA.isPending}
                    onClick={() => analyserIA.mutate(analyse.id)}
                    disabled={analyserIA.isPending}
                    className="text-purple-700 hover:bg-purple-100 text-xs"
                  >
                    {analyserIA.isPending ? 'Analyse en cours…' : analyse.analyse_ia_texte ? 'Ré-analyser' : "Lancer l'analyse IA"}
                  </Button>
                </div>
              )}
            </div>

            {analyserIA.isPending && (
              <div className="px-4 py-5 flex items-center gap-3 text-purple-700 bg-purple-50/40">
                <Loader2 size={16} className="animate-spin flex-shrink-0" />
                <span className="text-sm">L&apos;IA analyse les résultats… (30–60 secondes)</span>
              </div>
            )}

            {analyserIA.isError && !analyserIA.isPending && (
              <div className="px-4 py-3 text-sm text-red-700 bg-red-50">
                Erreur : {analyserIA.error?.response?.data?.message || 'Impossible de contacter l\'IA. Vérifiez la clé API.'}
              </div>
            )}

            {analyse.analyse_ia_texte && !analyserIA.isPending && (
              <div className="px-4 py-3 bg-white space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-texte-principal">
                      Interprétation médicale disponible
                    </p>
                    <p className="text-xs text-texte-secondaire mt-0.5">
                      {analyse.analyse_ia_modele || 'IA'}
                      {analyse.cout_estime_usd
                        ? ` · Coût estimé : $${parseFloat(analyse.cout_estime_usd).toFixed(4)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variante="secondaire"
                      icone={FileText}
                      taille="petit"
                      chargement={telechargerDocx.isPending}
                      onClick={() => telechargerDocx.mutate(analyse.id)}
                      disabled={telechargerDocx.isPending}
                    >
                      Word
                    </Button>
                    <Button
                      variante="primaire"
                      icone={Download}
                      taille="petit"
                      chargement={telechargerPdf.isPending}
                      onClick={() => telechargerPdf.mutate(analyse.id)}
                      disabled={telechargerPdf.isPending}
                    >
                      PDF
                    </Button>
                  </div>
                </div>

                {/* Validation médecin */}
                {analyse.valide_par_medecin ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-bouton text-xs text-emerald-800">
                    <ShieldCheck size={13} className="text-emerald-600 flex-shrink-0" />
                    <span>
                      Validée par le médecin le{' '}
                      {fmtDate(analyse.date_validation)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-bouton">
                    <p className="text-xs text-orange-800">
                      L&apos;interprétation IA n&apos;a pas encore été validée par un médecin.
                    </p>
                    <Button
                      variante="secondaire"
                      icone={ShieldCheck}
                      taille="petit"
                      chargement={valider.isPending}
                      onClick={() => valider.mutate(analyse.id)}
                      disabled={valider.isPending}
                      className="flex-shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      Valider
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-bordure">
            <span className="text-xs text-texte-secondaire">
              {analyse.sexe_patient && `${analyse.sexe_patient === 'M' ? 'Masculin' : 'Féminin'}`}
              {analyse.age_patient  && ` · ${analyse.age_patient} ans`}
            </span>
            <Button
              variante="fantome"
              icone={Trash2}
              taille="petit"
              chargement={supprimer.isPending}
              onClick={() => { if (window.confirm('Supprimer cette analyse ?')) supprimer.mutate(analyse.id); }}
              className="text-medical-critique hover:bg-red-50"
            >
              Supprimer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const CarteAnalyse = (props) => (
  <CarteErreur>
    <CarteAnalyseInterne {...props} />
  </CarteErreur>
);

// ── Composant principal ───────────────────────────────────────────────────────
import React from 'react';

// mode: null | 'upload' | 'manuel' | 'evolution'
const SectionAnalyseBio = ({ patientId, patient }) => {
  const [mode, setMode] = useState(null);
  const { data: analyses = [], isLoading } = useAnalysesBio(patientId);

  const retourListe = () => setMode(null);

  return (
    <div className="carte space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
          <FlaskConical size={15} className="text-zeze-vert" />
          Analyses biologiques
          {analyses.length > 0 && (
            <span className="text-xs font-normal text-texte-secondaire">({analyses.length})</span>
          )}
        </h2>
        {mode === null && (
          <div className="flex gap-2 flex-wrap">
            <Button variante="secondaire" icone={Upload} taille="petit" onClick={() => setMode('upload')}>
              Charger fichier
            </Button>
            <Button variante="secondaire" icone={Pencil} taille="petit" onClick={() => setMode('manuel')}>
              Saisie manuelle
            </Button>
            {analyses.length >= 2 && (
              <Button variante="fantome" icone={TrendingUp} taille="petit" onClick={() => setMode('evolution')}>
                Évolution
              </Button>
            )}
          </div>
        )}
        {mode !== null && (
          <Button variante="fantome" icone={X} taille="petit" onClick={retourListe}>
            Retour
          </Button>
        )}
      </div>

      {/* Zone d'upload fichier */}
      {mode === 'upload' && (
        <div className="border border-zeze-vert/30 rounded-carte p-4 bg-green-50/20">
          <p className="text-sm font-medium text-texte-principal mb-4 flex items-center gap-2">
            <Upload size={14} className="text-zeze-vert" />
            Charger un résultat d&apos;analyse
          </p>
          <ZoneUpload
            patientId={patientId}
            onTermine={retourListe}
            onAnnuler={retourListe}
          />
        </div>
      )}

      {/* Saisie manuelle */}
      {mode === 'manuel' && (
        <div className="border border-zeze-vert/30 rounded-carte p-4 bg-green-50/20">
          <p className="text-sm font-medium text-texte-principal mb-4 flex items-center gap-2">
            <Pencil size={14} className="text-zeze-vert" />
            Saisie manuelle des valeurs
          </p>
          <FormulaireManuel
            patientId={patientId}
            patient={patient}
            onTermine={retourListe}
            onAnnuler={retourListe}
          />
        </div>
      )}

      {/* Graphique d'évolution */}
      {mode === 'evolution' && (
        <div className="border border-bordure rounded-carte p-4">
          <p className="text-sm font-medium text-texte-principal mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-zeze-vert" />
            Évolution temporelle d&apos;un paramètre
          </p>
          <GraphiqueEvolution analyses={analyses} />
        </div>
      )}

      {/* Liste des analyses */}
      {mode === null && isLoading && (
        <div className="flex items-center justify-center py-8 gap-2 text-texte-secondaire">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {mode === null && !isLoading && analyses.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <FlaskConical size={28} className="mx-auto text-texte-secondaire/40" />
          <p className="text-sm text-texte-secondaire">Aucune analyse biologique enregistrée.</p>
          <p className="text-xs text-texte-secondaire">
            Chargez un fichier de résultats ou saisissez les valeurs manuellement.
          </p>
        </div>
      )}

      {mode === null && (
        <div className="space-y-2">
          {analyses.map((a) => <CarteAnalyse key={a.id} analyse={a} />)}
        </div>
      )}
    </div>
  );
};

export default SectionAnalyseBio;
