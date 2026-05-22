import { useState, useMemo, useRef, useEffect, Component } from 'react';
import { useAnalysesBio, useExtraireAnalyseBio, useSupprimerAnalyseBio, useAnalyserAvecIA, useTelechargePdfAnalyse } from '../../../hooks/useAnalysesBio';
import { interpreterPanels, couleurSeverite, iconesSeverite, SEVERITE } from '../../../utils/interpretationBio';
import Button from '../../../components/ui/Button';
import { Plus, Trash2, ChevronDown, ChevronUp, FlaskConical, Upload, FileText, Image, Loader2, CheckCircle2, X, Sparkles, RefreshCw, Download } from 'lucide-react';

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
  nfs:        { label: 'NFS',             couleur: 'bg-red-100 text-red-800 border-red-200' },
  renal:      { label: 'Bilan rénal',      couleur: 'bg-blue-100 text-blue-800 border-blue-200' },
  glycemie:   { label: 'Bilan glycémique', couleur: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  lipidique:  { label: 'Bilan lipidique',  couleur: 'bg-purple-100 text-purple-800 border-purple-200' },
  ionogramme: { label: 'Ionogramme',       couleur: 'bg-teal-100 text-teal-800 border-teal-200' },
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
      creatinine:   { label: 'Créatinine',   unite: 'µmol/L',        ref: (s) => s === 'F' ? '44–97'   : '53–106' },
      uree:         { label: 'Urée',         unite: 'mmol/L',        ref: () => '2,5–7,5' },
      acide_urique: { label: 'Acide urique', unite: 'µmol/L',        ref: (s) => s === 'F' ? '143–339' : '202–416' },
      dfg:          { label: 'DFG estimé',   unite: 'mL/min/1.73m²', ref: () => '> 60' },
    },
  },
  glycemie: {
    label: 'Bilan glycémique',
    params: {
      glycemie_jeun:          { label: 'Glycémie à jeun',        unite: 'mmol/L', ref: () => '3,9–5,5' },
      glycemie_postprandiale: { label: 'Glycémie postprandiale', unite: 'mmol/L', ref: () => '< 7,8' },
      hba1c:                  { label: 'HbA1c',                  unite: '%',      ref: () => '< 5,7' },
    },
  },
  lipidique: {
    label: 'Bilan lipidique',
    params: {
      cholesterol_total: { label: 'Cholestérol total', unite: 'mmol/L', ref: () => '< 5,2' },
      ldl:               { label: 'LDL-cholestérol',   unite: 'mmol/L', ref: () => '< 3,4' },
      hdl:               { label: 'HDL-cholestérol',   unite: 'mmol/L', ref: (s) => s === 'F' ? '> 1,3' : '> 1,0' },
      triglycerides:     { label: 'Triglycérides',      unite: 'mmol/L', ref: () => '< 1,7' },
    },
  },
  ionogramme: {
    label: 'Ionogramme',
    params: {
      sodium:       { label: 'Sodium',       unite: 'mmol/L', ref: () => '136–145' },
      potassium:    { label: 'Potassium',    unite: 'mmol/L', ref: () => '3,5–5,0' },
      chlore:       { label: 'Chlore',       unite: 'mmol/L', ref: () => '98–107' },
      calcium:      { label: 'Calcium',      unite: 'mmol/L', ref: () => '2,2–2,6' },
      magnesium:    { label: 'Magnésium',    unite: 'mmol/L', ref: () => '0,75–0,95' },
      phosphore:    { label: 'Phosphore',    unite: 'mmol/L', ref: () => '0,81–1,45' },
      bicarbonates: { label: 'Bicarbonates', unite: 'mmol/L', ref: () => '22–29' },
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
            const refStr = param.ref(sexe);
            const statut = calculerStatutBio(val, refStr);
            return (
              <tr key={cle} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-200 px-3 py-1.5 text-gray-800">{param.label}</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-semibold text-gray-900">
                  {val} <span className="font-normal text-gray-500">{param.unite}</span>
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-right text-gray-500">
                  {refStr} {param.unite}
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

const ZoneUpload = ({ patientId, onTermine, onAnnuler }) => {
  const [fichiers, setFichiers] = useState([]);
  const [survol, setSurvol] = useState(false);
  const [pct, setPct] = useState(0);
  const [etape, setEtape] = useState('');
  const [erreur, setErreur] = useState('');
  const inputRef = useRef(null);
  const timersRef = useRef([]);

  const extraire = useExtraireAnalyseBio(patientId);
  const enAnalyse = extraire.isPending;

  const nettoyer = () => timersRef.current.forEach(clearTimeout);

  useEffect(() => () => nettoyer(), []);

  const ajouterFichiers = (nouveaux) => {
    const liste = Array.from(nouveaux);
    const invalides = liste.filter((f) => !TYPES_ACCEPTES.includes(f.type));
    if (invalides.length) { setErreur('Format non supporté. Utilisez PDF, PNG ou JPEG.'); return; }
    const tropGrands = liste.filter((f) => f.size > 15 * 1024 * 1024);
    if (tropGrands.length) { setErreur('Un fichier dépasse 15 Mo.'); return; }
    setErreur('');
    setFichiers((prev) => {
      const noms = new Set(prev.map((f) => f.name));
      return [...prev, ...liste.filter((f) => !noms.has(f.name))];
    });
  };

  const retirerFichier = (nom) => setFichiers((prev) => prev.filter((f) => f.name !== nom));

  const lancerAnalyse = async () => {
    if (!fichiers.length) return;
    setErreur('');

    const etapes = [
      { pct: 10, msg: 'Envoi des fichiers…',       delai: 100 },
      { pct: 30, msg: 'Lecture des documents…',     delai: 800 },
      { pct: 55, msg: 'Extraction du texte…',       delai: 2500 },
      { pct: 75, msg: 'Analyse des valeurs…',       delai: 5000 },
      { pct: 88, msg: 'Interprétation en cours…',   delai: 8000 },
    ];
    etapes.forEach(({ pct: p, msg, delai }) => {
      const t = setTimeout(() => { setPct(p); setEtape(msg); }, delai);
      timersRef.current.push(t);
    });

    try {
      const resultat = await extraire.mutateAsync(fichiers);
      nettoyer();
      setPct(100);
      setEtape('Analyse terminée !');
      setTimeout(() => onTermine(resultat.analyse), 600);
    } catch {
      nettoyer();
      setPct(0);
      setEtape('');
      setErreur("Erreur lors de l'analyse. Vérifiez que les fichiers sont lisibles et réessayez.");
    }
  };

  const aFichiers = fichiers.length > 0;

  return (
    <div className="space-y-4">
      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouterFichiers(e.dataTransfer.files); }}
        onClick={() => !enAnalyse && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-carte p-6 text-center cursor-pointer transition-all ${
          survol
            ? 'border-zeze-vert bg-green-50'
            : aFichiers
            ? 'border-zeze-vert/40 bg-green-50/30'
            : 'border-bordure hover:border-gray-400 hover:bg-fond-secondaire'
        } ${enAnalyse ? 'pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          onChange={(e) => ajouterFichiers(e.target.files)}
        />
        <Upload size={28} className={`mx-auto mb-2 ${aFichiers ? 'text-zeze-vert' : 'text-texte-secondaire'}`} />
        {aFichiers ? (
          <p className="text-xs text-zeze-vert font-medium">Cliquez ou déposez pour ajouter d&apos;autres fichiers</p>
        ) : (
          <div>
            <p className="text-sm font-medium text-texte-principal">Déposez vos fichiers ici</p>
            <p className="text-xs text-texte-secondaire mt-1">ou cliquez pour sélectionner</p>
            <p className="text-xs text-texte-secondaire mt-0.5">PDF, PNG, JPEG · 15 Mo max · plusieurs fichiers acceptés</p>
          </div>
        )}
      </div>

      {/* Liste des fichiers sélectionnés */}
      {aFichiers && !enAnalyse && (
        <div className="space-y-1.5">
          {fichiers.map((f) => (
            <div key={f.name} className="flex items-center gap-2 px-3 py-2 bg-fond-secondaire rounded-bouton">
              {f.type === 'application/pdf'
                ? <FileText size={14} className="text-zeze-vert flex-shrink-0" />
                : <Image size={14} className="text-zeze-vert flex-shrink-0" />}
              <span className="flex-1 truncate text-texte-principal text-xs">{f.name}</span>
              <span className="text-xs text-texte-secondaire flex-shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); retirerFichier(f.name); }}
                className="text-texte-secondaire hover:text-medical-critique flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Barre de progression */}
      {enAnalyse && <BarreProgression pct={pct} etape={etape} />}
      {pct === 100 && !enAnalyse && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} /> Analyse terminée, enregistrement…
        </div>
      )}

      {/* Erreur */}
      {erreur && <p className="text-sm text-medical-critique">{erreur}</p>}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button variante="secondaire" onClick={onAnnuler} disabled={enAnalyse}>
          Annuler
        </Button>
        <Button
          icone={FlaskConical}
          onClick={lancerAnalyse}
          disabled={!aFichiers || enAnalyse}
          chargement={enAnalyse}
        >
          {enAnalyse ? 'Analyse en cours…' : `Lancer l'analyse${fichiers.length > 1 ? ` (${fichiers.length} fichiers)` : ''}`}
        </Button>
      </div>
    </div>
  );
};

// ── Carte d'une analyse sauvegardée ───────────────────────────────────────────
const CarteAnalyseInterne = ({ analyse }) => {
  const [ouverte, setOuverte] = useState(false);
  const supprimer = useSupprimerAnalyseBio(analyse.patient_id);
  const analyserIA = useAnalyserAvecIA(analyse.patient_id);
  const telechargerPdf = useTelechargePdfAnalyse(analyse.patient_id);

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

          {analyse.conclusion && (
            <div className="bg-fond-secondaire rounded-bouton p-3">
              <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">Conclusion</p>
              <p className="text-sm text-texte-principal whitespace-pre-wrap">{analyse.conclusion}</p>
            </div>
          )}

          {/* Analyse IA */}
          <div className="border border-purple-200 rounded-carte overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-purple-50">
              <span className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                <Sparkles size={12} />
                Analyse IA — Médecin biologiste
              </span>
              <Button
                variante="fantome"
                icone={analyse.analyse_ia_texte ? RefreshCw : Sparkles}
                taille="petit"
                chargement={analyserIA.isPending}
                onClick={() => analyserIA.mutate(analyse.id)}
                disabled={analyserIA.isPending}
                className="text-purple-700 hover:bg-purple-100 text-xs"
              >
                {analyserIA.isPending
                  ? 'Analyse en cours…'
                  : analyse.analyse_ia_texte ? 'Ré-analyser' : 'Lancer l\'analyse IA'}
              </Button>
            </div>

            {analyserIA.isPending && (
              <div className="px-4 py-6 flex items-center gap-3 text-purple-700 bg-purple-50/50">
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
              <div className="px-4 py-4 bg-white">
                <RenderTexteIA texte={analyse.analyse_ia_texte} />
                {analyse.analyse_ia_modele && (
                  <p className="mt-3 text-xs text-texte-secondaire border-t border-bordure pt-2">
                    Modèle : {analyse.analyse_ia_modele}
                    {analyse.cout_estime_usd ? ` · Coût estimé : $${parseFloat(analyse.cout_estime_usd).toFixed(4)}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-bordure">
            <span className="text-xs text-texte-secondaire">
              {analyse.sexe_patient && `${analyse.sexe_patient === 'M' ? 'Masculin' : 'Féminin'}`}
              {analyse.age_patient  && ` · ${analyse.age_patient} ans`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variante="fantome"
                icone={Download}
                taille="petit"
                chargement={telechargerPdf.isPending}
                onClick={() => telechargerPdf.mutate(analyse.id)}
                disabled={telechargerPdf.isPending}
                className="text-bleu-primaire hover:bg-blue-50"
              >
                Rapport PDF
              </Button>
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

const SectionAnalyseBio = ({ patientId, patient }) => {
  const [modeUpload, setModeUpload] = useState(false);
  const { data: analyses = [], isLoading } = useAnalysesBio(patientId);

  const handleTermine = () => setModeUpload(false);

  return (
    <div className="carte space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
          <FlaskConical size={15} className="text-zeze-vert" />
          Analyses biologiques
          {analyses.length > 0 && (
            <span className="text-xs font-normal text-texte-secondaire">({analyses.length})</span>
          )}
        </h2>
        {!modeUpload && (
          <Button variante="secondaire" icone={Plus} taille="petit" onClick={() => setModeUpload(true)}>
            Nouvelle analyse
          </Button>
        )}
      </div>

      {/* Zone d'upload */}
      {modeUpload && (
        <div className="border border-zeze-vert/30 rounded-carte p-4 bg-green-50/20">
          <p className="text-sm font-medium text-texte-principal mb-4 flex items-center gap-2">
            <Upload size={14} className="text-zeze-vert" />
            Charger un résultat d&apos;analyse
          </p>
          <ZoneUpload
            patientId={patientId}
            onTermine={handleTermine}
            onAnnuler={() => setModeUpload(false)}
          />
        </div>
      )}

      {/* Liste des analyses */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 gap-2 text-texte-secondaire">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {!isLoading && analyses.length === 0 && !modeUpload && (
        <div className="text-center py-10 space-y-2">
          <FlaskConical size={28} className="mx-auto text-texte-secondaire/40" />
          <p className="text-sm text-texte-secondaire">Aucune analyse biologique enregistrée.</p>
          <p className="text-xs text-texte-secondaire">
            Chargez un fichier de résultats (PDF ou image) pour démarrer.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {analyses.map((a) => <CarteAnalyse key={a.id} analyse={a} />)}
      </div>
    </div>
  );
};

export default SectionAnalyseBio;
