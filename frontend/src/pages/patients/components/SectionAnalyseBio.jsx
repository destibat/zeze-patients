import { useState, useMemo } from 'react';
import { useAnalysesBio, useCreerAnalyseBio, useSupprimerAnalyseBio } from '../../../hooks/useAnalysesBio';
import {
  interpreterPanels, couleurSeverite, iconesSeverite, SEVERITE,
  NORMALES_NFS, NORMALES_RENAL, NORMALES_GLYCEMIE, NORMALES_LIPIDIQUE, NORMALES_IONOGRAMME,
} from '../../../utils/interpretationBio';
import Button from '../../../components/ui/Button';
import Alert from '../../../components/ui/Alert';
import { Plus, Trash2, ChevronDown, ChevronUp, FlaskConical, Loader2 } from 'lucide-react';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ── Définitions des panels ────────────────────────────────────────────────────
const PANELS = [
  { id: 'nfs',        label: 'NFS',             couleur: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'renal',      label: 'Bilan rénal',      couleur: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'glycemie',   label: 'Bilan glycémique', couleur: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'lipidique',  label: 'Bilan lipidique',  couleur: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'ionogramme', label: 'Ionogramme',       couleur: 'bg-teal-100 text-teal-800 border-teal-200' },
];

const PanelBadge = ({ id }) => {
  const p = PANELS.find((x) => x.id === id);
  return p ? (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${p.couleur}`}>{p.label}</span>
  ) : null;
};

// ── Champ numérique ──────────────────────────────────────────────────────────
const Champ = ({ label, unite, normale, name, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-texte-principal mb-0.5">{label}</label>
    <div className="relative">
      <input type="number" step="any" min="0" name={name} value={value ?? ''} onChange={onChange}
        placeholder="—" className="champ-input pr-14 text-sm" />
      {unite && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-texte-secondaire pointer-events-none">
          {unite}
        </span>
      )}
    </div>
    {normale && <p className="text-xs text-texte-secondaire mt-0.5">Réf : {normale}</p>}
  </div>
);

// ── Formulaire NFS ────────────────────────────────────────────────────────────
const FormulaireNFS = ({ vals, sexe, onChange }) => {
  const N = NORMALES_NFS(sexe);
  const c = (name) => ({ name, value: vals[name] ?? '', onChange: (e) => onChange('nfs', name, e.target.value) });
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Série rouge</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Champ label="Hémoglobine" unite="g/dL" normale={N.hemoglobine} {...c('hemoglobine')} />
        <Champ label="Hématocrite" unite="%" normale={N.hematocrite} {...c('hematocrite')} />
        <Champ label="Globules rouges" unite="T/L" normale={N.globules_rouges} {...c('globules_rouges')} />
        <Champ label="VGM" unite="fL" normale={N.vgm} {...c('vgm')} />
        <Champ label="TCMH" unite="pg" normale={N.tcmh} {...c('tcmh')} />
        <Champ label="CCMH" unite="g/dL" normale={N.ccmh} {...c('ccmh')} />
        <Champ label="RDW" unite="%" normale={N.rdw} {...c('rdw')} />
      </div>
      <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Série blanche</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Champ label="Globules blancs" unite="G/L" normale={N.globules_blancs} {...c('globules_blancs')} />
        <Champ label="Neutrophiles %" unite="%" normale={N.neutrophiles_pct} {...c('neutrophiles_pct')} />
        <Champ label="Neutrophiles abs." unite="G/L" normale={N.neutrophiles_abs} {...c('neutrophiles_abs')} />
        <Champ label="Lymphocytes %" unite="%" normale={N.lymphocytes_pct} {...c('lymphocytes_pct')} />
        <Champ label="Lymphocytes abs." unite="G/L" normale={N.lymphocytes_abs} {...c('lymphocytes_abs')} />
        <Champ label="Monocytes %" unite="%" normale={N.monocytes_pct} {...c('monocytes_pct')} />
        <Champ label="Monocytes abs." unite="G/L" normale={N.monocytes_abs} {...c('monocytes_abs')} />
        <Champ label="Éosinophiles %" unite="%" normale={N.eosinophiles_pct} {...c('eosinophiles_pct')} />
        <Champ label="Éosinophiles abs." unite="G/L" normale={N.eosinophiles_abs} {...c('eosinophiles_abs')} />
        <Champ label="Basophiles %" unite="%" normale={N.basophiles_pct} {...c('basophiles_pct')} />
        <Champ label="Basophiles abs." unite="G/L" normale={N.basophiles_abs} {...c('basophiles_abs')} />
      </div>
      <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Plaquettes</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Champ label="Plaquettes" unite="G/L" normale={N.plaquettes} {...c('plaquettes')} />
      </div>
    </div>
  );
};

// ── Formulaire Rénal ──────────────────────────────────────────────────────────
const FormulaireRenal = ({ vals, sexe, onChange }) => {
  const N = NORMALES_RENAL(sexe);
  const c = (name) => ({ name, value: vals[name] ?? '', onChange: (e) => onChange('renal', name, e.target.value) });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Champ label="Créatinine" unite="µmol/L" normale={N.creatinine} {...c('creatinine')} />
      <Champ label="Urée" unite="mmol/L" normale={N.uree} {...c('uree')} />
      <Champ label="Acide urique" unite="µmol/L" normale={N.acide_urique} {...c('acide_urique')} />
      <Champ label="DFG estimé" unite="mL/min" normale={N.dfg} {...c('dfg')} />
    </div>
  );
};

// ── Formulaire Glycémie ───────────────────────────────────────────────────────
const FormulaireGlycemie = ({ vals, onChange }) => {
  const N = NORMALES_GLYCEMIE();
  const c = (name) => ({ name, value: vals[name] ?? '', onChange: (e) => onChange('glycemie', name, e.target.value) });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Champ label="Glycémie à jeun" unite="mmol/L" normale={N.glycemie_jeun} {...c('glycemie_jeun')} />
      <Champ label="Glycémie postprandiale" unite="mmol/L" normale={N.glycemie_postprandiale} {...c('glycemie_postprandiale')} />
      <Champ label="HbA1c" unite="%" normale={N.hba1c} {...c('hba1c')} />
    </div>
  );
};

// ── Formulaire Lipidique ──────────────────────────────────────────────────────
const FormulaireUpidique = ({ vals, sexe, onChange }) => {
  const N = NORMALES_LIPIDIQUE(sexe);
  const c = (name) => ({ name, value: vals[name] ?? '', onChange: (e) => onChange('lipidique', name, e.target.value) });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Champ label="Cholestérol total" unite="mmol/L" normale={N.cholesterol_total} {...c('cholesterol_total')} />
      <Champ label="LDL" unite="mmol/L" normale={N.ldl} {...c('ldl')} />
      <Champ label="HDL" unite="mmol/L" normale={N.hdl} {...c('hdl')} />
      <Champ label="Triglycérides" unite="mmol/L" normale={N.triglycerides} {...c('triglycerides')} />
    </div>
  );
};

// ── Formulaire Ionogramme ─────────────────────────────────────────────────────
const FormulaireIonogramme = ({ vals, onChange }) => {
  const N = NORMALES_IONOGRAMME();
  const c = (name) => ({ name, value: vals[name] ?? '', onChange: (e) => onChange('ionogramme', name, e.target.value) });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Champ label="Sodium" unite="mmol/L" normale={N.sodium} {...c('sodium')} />
      <Champ label="Potassium" unite="mmol/L" normale={N.potassium} {...c('potassium')} />
      <Champ label="Chlore" unite="mmol/L" normale={N.chlore} {...c('chlore')} />
      <Champ label="Calcium" unite="mmol/L" normale={N.calcium} {...c('calcium')} />
      <Champ label="Magnésium" unite="mmol/L" normale={N.magnesium} {...c('magnesium')} />
      <Champ label="Phosphore" unite="mmol/L" normale={N.phosphore} {...c('phosphore')} />
      <Champ label="Bicarbonates" unite="mmol/L" normale={N.bicarbonates} {...c('bicarbonates')} />
    </div>
  );
};

// ── Bloc d'interprétations d'un panel ────────────────────────────────────────
const BlocInterpretations = ({ items }) => (
  <div className="space-y-2 mt-3">
    {items.map((item) => (
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

// ── Formulaire de création ────────────────────────────────────────────────────
const VIDE = { nfs: {}, renal: {}, glycemie: {}, lipidique: {}, ionogramme: {} };

const FormulaireNouvelleAnalyse = ({ patientId, patient, onFermer }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sexe, setSexe] = useState(patient?.sexe || '');
  const [age, setAge] = useState(patient?.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance)) / (365.25 * 864e5))
    : '');
  const [panelsCoches, setPanelsCoches] = useState(['nfs']);
  const [valeurs, setValeurs] = useState(VIDE);
  const [conclusion, setConclusion] = useState('');
  const [erreur, setErreur] = useState('');

  const creer = useCreerAnalyseBio(patientId);

  const changerValeur = (panel, champ, val) =>
    setValeurs((prev) => ({ ...prev, [panel]: { ...prev[panel], [champ]: val } }));

  const togglePanel = (id) =>
    setPanelsCoches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const interpretations = useMemo(
    () => interpreterPanels(valeurs, panelsCoches, sexe),
    [valeurs, panelsCoches, sexe]
  );

  const nbAnomalies = Object.values(interpretations)
    .flat()
    .filter((x) => x.severite === SEVERITE.ATTENTION || x.severite === SEVERITE.CRITIQUE).length;

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!panelsCoches.length) { setErreur('Sélectionnez au moins un panel.'); return; }

    const valeursFiltrees = {};
    for (const panel of panelsCoches) valeursFiltrees[panel] = valeurs[panel] || {};

    try {
      await creer.mutateAsync({
        date_analyse: date,
        sexe_patient: sexe || null,
        age_patient: age ? parseInt(age) : null,
        panels_demandes: panelsCoches,
        valeurs_brutes: valeursFiltrees,
        source: 'manuelle',
        conclusion: conclusion.trim() || null,
      });
      onFermer();
    } catch {
      setErreur('Erreur lors de l\'enregistrement. Réessayez.');
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-6">
      {/* En-tête */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-0.5">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            required className="champ-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-0.5">Sexe</label>
          <select value={sexe} onChange={(e) => setSexe(e.target.value)} className="champ-input text-sm">
            <option value="">—</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-0.5">Âge (ans)</label>
          <input type="number" min="0" max="120" value={age}
            onChange={(e) => setAge(e.target.value)} placeholder="—" className="champ-input text-sm" />
        </div>
      </div>

      {/* Sélecteur de panels */}
      <div>
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">
          Panels à analyser
        </p>
        <div className="flex flex-wrap gap-2">
          {PANELS.map(({ id, label, couleur }) => (
            <button key={id} type="button" onClick={() => togglePanel(id)}
              className={`px-3 py-1.5 rounded-bouton text-sm font-medium border transition-all ${
                panelsCoches.includes(id)
                  ? couleur + ' shadow-sm'
                  : 'bg-white text-texte-secondaire border-bordure hover:border-gray-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaires par panel */}
      {panelsCoches.map((panelId) => {
        const panelDef = PANELS.find((p) => p.id === panelId);
        const interp = interpretations[panelId] || [];
        const nbCrit = interp.filter((x) => x.severite === SEVERITE.CRITIQUE).length;
        const nbAtt  = interp.filter((x) => x.severite === SEVERITE.ATTENTION).length;
        return (
          <div key={panelId} className="border border-bordure rounded-carte p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
                <PanelBadge id={panelId} />
              </h3>
              {(nbCrit > 0 || nbAtt > 0) && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  nbCrit > 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {nbCrit > 0 ? `${nbCrit} critique${nbCrit > 1 ? 's' : ''}` : `${nbAtt} anomalie${nbAtt > 1 ? 's' : ''}`}
                </span>
              )}
            </div>

            {panelId === 'nfs'        && <FormulaireNFS       vals={valeurs.nfs}        sexe={sexe} onChange={changerValeur} />}
            {panelId === 'renal'      && <FormulaireRenal     vals={valeurs.renal}       sexe={sexe} onChange={changerValeur} />}
            {panelId === 'glycemie'   && <FormulaireGlycemie  vals={valeurs.glycemie}    onChange={changerValeur} />}
            {panelId === 'lipidique'  && <FormulaireUpidique  vals={valeurs.lipidique}   sexe={sexe} onChange={changerValeur} />}
            {panelId === 'ionogramme' && <FormulaireIonogramme vals={valeurs.ionogramme} onChange={changerValeur} />}

            {interp.length > 0 && <BlocInterpretations items={interp} />}
          </div>
        );
      })}

      {/* Conclusion */}
      <div>
        <label className="block text-xs font-medium text-texte-principal mb-0.5">Conclusion (optionnel)</label>
        <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={3}
          placeholder="Synthèse ou remarques du médecin…" className="champ-input text-sm resize-none" />
      </div>

      {erreur && <Alert type="erreur" message={erreur} />}

      <div className="flex justify-between items-center pt-2 border-t border-bordure">
        <span className="text-xs text-texte-secondaire">
          {nbAnomalies > 0
            ? `${nbAnomalies} anomalie${nbAnomalies > 1 ? 's' : ''} détectée${nbAnomalies > 1 ? 's' : ''}`
            : 'Aucune anomalie détectée'}
        </span>
        <div className="flex gap-2">
          <Button type="button" variante="secondaire" onClick={onFermer}>Annuler</Button>
          <Button type="submit" chargement={creer.isPending}>Enregistrer</Button>
        </div>
      </div>
    </form>
  );
};

// ── Carte d'une analyse existante ─────────────────────────────────────────────
const CarteAnalyse = ({ analyse }) => {
  const [ouverte, setOuverte] = useState(false);
  const supprimer = useSupprimerAnalyseBio(analyse.patient_id);

  const interpretations = useMemo(
    () => interpreterPanels(analyse.valeurs_brutes || {}, analyse.panels_demandes || [], analyse.sexe_patient),
    [analyse]
  );

  const toutesInterp = Object.values(interpretations).flat();
  const nbCrit = toutesInterp.filter((x) => x.severite === SEVERITE.CRITIQUE).length;
  const nbAtt  = toutesInterp.filter((x) => x.severite === SEVERITE.ATTENTION).length;
  const nbNorm = toutesInterp.filter((x) => x.severite === SEVERITE.NORMAL).length;

  return (
    <div className="border border-bordure rounded-carte overflow-hidden">
      <button
        onClick={() => setOuverte(!ouverte)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-fond-secondaire transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-texte-principal">{fmtDate(analyse.date_analyse)}</span>
          <div className="flex gap-1 flex-wrap">
            {analyse.panels_demandes?.map((p) => <PanelBadge key={p} id={p} />)}
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
          {nbCrit === 0 && nbAtt === 0 && nbNorm > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Normal</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-texte-secondaire hidden sm:block">
            {analyse.auteur?.prenom} {analyse.auteur?.nom}
          </span>
          {ouverte ? <ChevronUp size={16} className="text-texte-secondaire" /> : <ChevronDown size={16} className="text-texte-secondaire" />}
        </div>
      </button>

      {ouverte && (
        <div className="px-4 pb-4 pt-2 space-y-4 bg-white border-t border-bordure">
          {analyse.panels_demandes?.map((panelId) => {
            const items = interpretations[panelId] || [];
            return (
              <div key={panelId}>
                <div className="flex items-center gap-2 mb-2">
                  <PanelBadge id={panelId} />
                </div>
                <BlocInterpretations items={items} />
              </div>
            );
          })}

          {analyse.conclusion && (
            <div className="bg-fond-secondaire rounded-bouton p-3">
              <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">Conclusion</p>
              <p className="text-sm text-texte-principal whitespace-pre-wrap">{analyse.conclusion}</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-texte-secondaire">
              {analyse.sexe_patient && `Sexe : ${analyse.sexe_patient === 'M' ? 'Masculin' : 'Féminin'}`}
              {analyse.age_patient  && ` · Âge : ${analyse.age_patient} ans`}
            </span>
            <Button
              variante="fantome"
              icone={Trash2}
              taille="petit"
              chargement={supprimer.isPending}
              onClick={() => {
                if (window.confirm('Supprimer cette analyse ?')) supprimer.mutate(analyse.id);
              }}
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

// ── Composant principal ───────────────────────────────────────────────────────
const SectionAnalyseBio = ({ patientId, patient }) => {
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const { data: analyses = [], isLoading } = useAnalysesBio(patientId);

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
        {!formulaireOuvert && (
          <Button variante="secondaire" icone={Plus} taille="petit" onClick={() => setFormulaireOuvert(true)}>
            Nouvelle analyse
          </Button>
        )}
      </div>

      {formulaireOuvert && (
        <div className="border border-zeze-vert/30 rounded-carte p-4 bg-green-50/30">
          <h3 className="text-sm font-semibold text-texte-principal mb-4">Nouvelle analyse biologique</h3>
          <FormulaireNouvelleAnalyse
            patientId={patientId}
            patient={patient}
            onFermer={() => setFormulaireOuvert(false)}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8 gap-2 text-texte-secondaire">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {!isLoading && analyses.length === 0 && !formulaireOuvert && (
        <p className="text-sm text-texte-secondaire text-center py-6">
          Aucune analyse biologique enregistrée.
        </p>
      )}

      <div className="space-y-2">
        {analyses.map((a) => <CarteAnalyse key={a.id} analyse={a} />)}
      </div>
    </div>
  );
};

export default SectionAnalyseBio;
