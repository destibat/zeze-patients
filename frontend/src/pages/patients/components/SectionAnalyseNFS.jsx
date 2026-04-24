import { useState, useRef } from 'react';
import { useAnalysesNFS, useCreerAnalyseNFS, useSupprimerAnalyseNFS, useExtraireNFS } from '../../../hooks/useAnalysesNFS';
import { interpreter, couleurSeverite, iconesSeverite, NORMALES, SEVERITE } from '../../../utils/interpretationNFS';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import { Plus, Trash2, ChevronDown, ChevronUp, FlaskConical, Loader2, Upload, FileText, X } from 'lucide-react';

// ── Champ numérique avec valeurs normales ─────────────────────────────────
const ChampNFS = ({ label, unite, normale, name, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-texte-principal mb-0.5">{label}</label>
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        name={name}
        value={value}
        onChange={onChange}
        placeholder="—"
        className="champ-input pr-14 text-sm"
      />
      {unite && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-texte-secondaire pointer-events-none">
          {unite}
        </span>
      )}
    </div>
    {normale && <p className="text-xs text-texte-secondaire mt-0.5">Réf : {normale}</p>}
  </div>
);

// ── Carte d'interprétation ────────────────────────────────────────────────
const CarteInterpretation = ({ item }) => (
  <div className={`border rounded-bouton p-3 ${couleurSeverite(item.severite)}`}>
    <div className="flex items-start gap-2">
      <span className="font-bold text-base flex-shrink-0">{iconesSeverite[item.severite]}</span>
      <div>
        <p className="font-semibold text-sm">{item.titre}</p>
        <p className="text-sm mt-0.5 leading-relaxed">{item.texte}</p>
      </div>
    </div>
  </div>
);

// ── Zone d'upload pour extraction automatique ─────────────────────────────
const ZoneUploadNFS = ({ patientId, onValeurs }) => {
  const [survol, setSurvol] = useState(false);
  const [fichier, setFichier] = useState(null);
  const [erreur, setErreur] = useState('');
  const inputRef = useRef(null);
  const extraire = useExtraireNFS(patientId);

  const typesAcceptes = ['application/pdf', 'image/png', 'image/jpeg'];

  const traiterFichier = (f) => {
    if (!f) return;
    if (!typesAcceptes.includes(f.type)) {
      setErreur('Format non supporté. Utilisez PDF, PNG ou JPEG.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErreur('Fichier trop volumineux (max 10 Mo).');
      return;
    }
    setErreur('');
    setFichier(f);
  };

  const lancer = async () => {
    if (!fichier) return;
    try {
      const res = await extraire.mutateAsync(fichier);
      onValeurs(res.valeurs || {});
      setFichier(null);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'extraction.');
    }
  };

  return (
    <div className="mb-5">
      <div
        className={`border-2 border-dashed rounded-bouton p-4 text-center cursor-pointer transition-colors ${survol ? 'border-zeze-vert bg-zeze-vert/5' : 'border-bordure hover:border-zeze-vert/50'}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); traiterFichier(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => traiterFichier(e.target.files[0])} />
        {fichier ? (
          <div className="flex items-center justify-center gap-2 text-sm text-zeze-vert">
            <FileText size={16} />
            <span className="font-medium">{fichier.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); setFichier(null); }}
              className="text-texte-secondaire hover:text-medical-critique">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-texte-secondaire">
            <Upload size={20} className="opacity-60" />
            <p className="text-xs">Déposez un fichier NFS (PDF, PNG, JPEG) pour extraction automatique</p>
          </div>
        )}
      </div>
      {erreur && <p className="text-xs text-medical-critique mt-1">{erreur}</p>}
      {fichier && (
        <Button
          variante="secondaire"
          icone={extraire.isPending ? Loader2 : Upload}
          chargement={extraire.isPending}
          onClick={lancer}
          className="mt-2 w-full"
        >
          Extraire les valeurs
        </Button>
      )}
    </div>
  );
};

// ── Formulaire de saisie ──────────────────────────────────────────────────
const FormulaireNFS = ({ patientId, patient, onAnnuler, onSucces }) => {
  const sexePatient = patient?.sexe === 'feminin' ? 'F' : 'M';
  const agePatient = patient?.age || '';

  const [vals, setVals] = useState({
    date_analyse: new Date().toISOString().split('T')[0],
    sexe_patient: sexePatient,
    age_patient: agePatient,
    hemoglobine: '', hematocrite: '', globules_rouges: '',
    vgm: '', tcmh: '', ccmh: '', rdw: '',
    globules_blancs: '',
    neutrophiles_pct: '', neutrophiles_abs: '',
    lymphocytes_pct: '', lymphocytes_abs: '',
    monocytes_pct: '', monocytes_abs: '',
    eosinophiles_pct: '', eosinophiles_abs: '',
    basophiles_pct: '', basophiles_abs: '',
    plaquettes: '',
    conclusion: '',
  });

  const [messageExtraction, setMessageExtraction] = useState('');
  const [interpretations, setInterpretations] = useState([]);
  const [analyseeFaite, setAnalyseeFaite] = useState(false);
  const creer = useCreerAnalyseNFS(patientId);

  const appliquerValeurs = (valeurs) => {
    setVals((v) => ({
      ...v,
      ...Object.fromEntries(
        Object.entries(valeurs).filter(([, val]) => val !== null && val !== undefined).map(([k, val]) => [k, String(val)])
      ),
    }));
    const nb = Object.values(valeurs).filter((v) => v !== null && v !== undefined).length;
    setMessageExtraction(`${nb} valeur(s) extraite(s) automatiquement. Vérifiez avant d'enregistrer.`);
    setTimeout(() => setMessageExtraction(''), 8000);
  };

  const handleChange = (e) => {
    setVals((v) => ({ ...v, [e.target.name]: e.target.value }));
    setAnalyseeFaite(false);
  };

  const analyser = () => {
    const results = interpreter(vals, vals.sexe_patient);
    setInterpretations(results);
    setAnalyseeFaite(true);
    // Pré-remplir la conclusion avec les titres des anomalies
    const anomalies = results
      .filter((r) => r.severite !== SEVERITE.NORMAL && r.severite !== SEVERITE.INFO && r.code !== 'INCOMPLET')
      .map((r) => r.titre)
      .join(', ');
    if (anomalies && !vals.conclusion) {
      setVals((v) => ({ ...v, conclusion: anomalies }));
    }
  };

  const sauvegarder = async () => {
    if (!analyseeFaite) { analyser(); return; }
    try {
      await creer.mutateAsync({ ...vals, interpretations });
      onSucces('Analyse NFS enregistrée.');
    } catch (e) {
      alert(e?.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    }
  };

  const normales = NORMALES(vals.sexe_patient);

  return (
    <div className="space-y-6">
      {/* Upload extraction automatique */}
      <ZoneUploadNFS patientId={patientId} onValeurs={appliquerValeurs} />
      {messageExtraction && (
        <div className="bg-blue-50 border border-blue-200 rounded-bouton p-3 text-xs text-blue-700">
          {messageExtraction}
        </div>
      )}

      {/* En-tête formulaire */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-0.5">Date de l'analyse</label>
          <input type="date" name="date_analyse" value={vals.date_analyse} onChange={handleChange} className="champ-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-0.5">Sexe</label>
          <select name="sexe_patient" value={vals.sexe_patient} onChange={handleChange} className="champ-input text-sm">
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-0.5">Âge (ans)</label>
          <input type="number" name="age_patient" value={vals.age_patient} onChange={handleChange} className="champ-input text-sm" min="0" />
        </div>
      </div>

      {/* Série rouge */}
      <div>
        <h3 className="text-sm font-semibold text-texte-principal mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Série rouge
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ChampNFS label="Hémoglobine" unite="g/dL" normale={normales.hemoglobine} name="hemoglobine" value={vals.hemoglobine} onChange={handleChange} />
          <ChampNFS label="Hématocrite" unite="%" normale={normales.hematocrite} name="hematocrite" value={vals.hematocrite} onChange={handleChange} />
          <ChampNFS label="Globules rouges" unite="T/L" normale={normales.globules_rouges} name="globules_rouges" value={vals.globules_rouges} onChange={handleChange} />
          <ChampNFS label="VGM" unite="fL" normale={normales.vgm} name="vgm" value={vals.vgm} onChange={handleChange} />
          <ChampNFS label="TCMH" unite="pg" normale={normales.tcmh} name="tcmh" value={vals.tcmh} onChange={handleChange} />
          <ChampNFS label="CCMH" unite="g/dL" normale={normales.ccmh} name="ccmh" value={vals.ccmh} onChange={handleChange} />
          <ChampNFS label="RDW" unite="%" normale={normales.rdw} name="rdw" value={vals.rdw} onChange={handleChange} />
        </div>
      </div>

      {/* Série blanche */}
      <div>
        <h3 className="text-sm font-semibold text-texte-principal mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Série blanche
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <ChampNFS label="Globules blancs" unite="G/L" normale={normales.globules_blancs} name="globules_blancs" value={vals.globules_blancs} onChange={handleChange} />
        </div>
        <p className="text-xs text-texte-secondaire mb-2 font-medium uppercase tracking-wide">Formule leucocytaire</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Neutrophiles', pct: 'neutrophiles_pct', abs: 'neutrophiles_abs', normPct: normales.neutrophiles_pct, normAbs: normales.neutrophiles_abs },
            { label: 'Lymphocytes', pct: 'lymphocytes_pct', abs: 'lymphocytes_abs', normPct: normales.lymphocytes_pct, normAbs: normales.lymphocytes_abs },
            { label: 'Monocytes', pct: 'monocytes_pct', abs: 'monocytes_abs', normPct: normales.monocytes_pct, normAbs: normales.monocytes_abs },
            { label: 'Éosinophiles', pct: 'eosinophiles_pct', abs: 'eosinophiles_abs', normPct: normales.eosinophiles_pct, normAbs: normales.eosinophiles_abs },
            { label: 'Basophiles', pct: 'basophiles_pct', abs: 'basophiles_abs', normPct: normales.basophiles_pct, normAbs: normales.basophiles_abs },
          ].map(({ label, pct, abs, normPct, normAbs }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs font-medium text-texte-principal">{label}</p>
              <input type="number" step="0.01" min="0" name={pct} value={vals[pct]} onChange={handleChange}
                placeholder="%" className="champ-input text-xs" title={`${label} % — Réf : ${normPct}`} />
              <input type="number" step="0.01" min="0" name={abs} value={vals[abs]} onChange={handleChange}
                placeholder="G/L" className="champ-input text-xs" title={`${label} G/L — Réf : ${normAbs}`} />
              <p className="text-xs text-texte-secondaire">{normAbs}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plaquettes */}
      <div>
        <h3 className="text-sm font-semibold text-texte-principal mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Plaquettes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ChampNFS label="Plaquettes" unite="G/L" normale={normales.plaquettes} name="plaquettes" value={vals.plaquettes} onChange={handleChange} />
        </div>
      </div>

      {/* Bouton Interpréter */}
      <button
        type="button"
        onClick={analyser}
        className="w-full py-2.5 border-2 border-dashed border-zeze-vert text-zeze-vert text-sm font-medium rounded-bouton hover:bg-zeze-vert hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <FlaskConical size={16} /> Interpréter les résultats
      </button>

      {/* Résultats d'interprétation */}
      {analyseeFaite && interpretations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-texte-principal">Interprétation automatique</h3>
          {interpretations.map((item, i) => <CarteInterpretation key={i} item={item} />)}
        </div>
      )}

      {/* Conclusion libre */}
      <div>
        <label className="block text-sm font-medium text-texte-principal mb-1">Conclusion / Remarques</label>
        <textarea
          name="conclusion"
          value={vals.conclusion}
          onChange={handleChange}
          rows={3}
          className="champ-input text-sm resize-none"
          placeholder="Conclusion clinique, conduite à tenir, examens complémentaires suggérés…"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variante="fantome" onClick={onAnnuler}>Annuler</Button>
        <Button variante="primaire" icone={FlaskConical} chargement={creer.isPending} onClick={sauvegarder}>
          {analyseeFaite ? 'Enregistrer l\'analyse' : 'Interpréter d\'abord'}
        </Button>
      </div>
    </div>
  );
};

// ── Carte d'analyse existante ─────────────────────────────────────────────
const CarteAnalyse = ({ analyse, onSupprimer }) => {
  const [ouverte, setOuverte] = useState(false);
  const interps = Array.isArray(analyse.interpretations) ? analyse.interpretations : [];
  const anomalies = interps.filter((i) => i.severite !== SEVERITE.NORMAL && i.severite !== SEVERITE.INFO);

  return (
    <div className="border border-bordure rounded-carte overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-fond-secondaire/50 transition-colors text-left"
        onClick={() => setOuverte((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <FlaskConical size={16} className="text-zeze-vert flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-texte-principal">
              NFS du {new Date(analyse.date_analyse).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-texte-secondaire">
              {analyse.auteur ? `${analyse.auteur.prenom} ${analyse.auteur.nom}` : ''}
              {anomalies.length > 0 && (
                <span className="ml-2 font-medium text-orange-600">
                  {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} détectée{anomalies.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSupprimer(analyse); }}
            className="p-1 text-texte-secondaire hover:text-medical-critique rounded"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
          {ouverte ? <ChevronUp size={16} className="text-texte-secondaire" /> : <ChevronDown size={16} className="text-texte-secondaire" />}
        </div>
      </button>

      {ouverte && (
        <div className="border-t border-bordure p-4 space-y-4 bg-fond-secondaire/30">
          {/* Valeurs numériques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Hb', analyse.hemoglobine, 'g/dL'],
              ['Ht', analyse.hematocrite, '%'],
              ['GR', analyse.globules_rouges, 'T/L'],
              ['VGM', analyse.vgm, 'fL'],
              ['TCMH', analyse.tcmh, 'pg'],
              ['CCMH', analyse.ccmh, 'g/dL'],
              ['RDW', analyse.rdw, '%'],
              ['GB', analyse.globules_blancs, 'G/L'],
              ['Neutrophiles', analyse.neutrophiles_abs, 'G/L'],
              ['Lymphocytes', analyse.lymphocytes_abs, 'G/L'],
              ['Monocytes', analyse.monocytes_abs, 'G/L'],
              ['Éosinophiles', analyse.eosinophiles_abs, 'G/L'],
              ['Plaquettes', analyse.plaquettes, 'G/L'],
            ].filter(([, val]) => val !== null && val !== undefined).map(([label, val, unite]) => (
              <div key={label}>
                <p className="text-xs text-texte-secondaire">{label}</p>
                <p className="font-medium">{parseFloat(val).toFixed(val < 10 ? 2 : 0)} <span className="text-xs font-normal text-texte-secondaire">{unite}</span></p>
              </div>
            ))}
          </div>

          {/* Interprétations */}
          {interps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Interprétation</p>
              {interps.map((item, i) => <CarteInterpretation key={i} item={item} />)}
            </div>
          )}

          {/* Conclusion */}
          {analyse.conclusion && (
            <div>
              <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">Conclusion</p>
              <p className="text-sm text-texte-principal whitespace-pre-wrap">{analyse.conclusion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────
const SectionAnalyseNFS = ({ patientId, patient }) => {
  const [modeCreation, setModeCreation] = useState(false);
  const [succes, setSucces] = useState('');
  const { data: analyses = [], isLoading } = useAnalysesNFS(patientId);
  const supprimer = useSupprimerAnalyseNFS(patientId);

  const handleSucces = (msg) => {
    setSucces(msg);
    setModeCreation(false);
    setTimeout(() => setSucces(''), 4000);
  };

  const handleSupprimer = async (analyse) => {
    if (!window.confirm(`Supprimer cette analyse du ${new Date(analyse.date_analyse).toLocaleDateString('fr-FR')} ?`)) return;
    await supprimer.mutateAsync(analyse.id);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-texte-secondaire" /></div>;

  return (
    <div className="space-y-4">
      {succes && <Alert type="succes" message={succes} />}

      {!modeCreation && (
        <div className="flex justify-end">
          <Button variante="primaire" icone={Plus} onClick={() => setModeCreation(true)}>
            Nouvelle analyse NFS
          </Button>
        </div>
      )}

      {modeCreation && (
        <div className="carte">
          <h3 className="text-base font-semibold text-texte-principal mb-4 flex items-center gap-2">
            <FlaskConical size={16} className="text-zeze-vert" /> Nouvelle NFS
          </h3>
          <FormulaireNFS
            patientId={patientId}
            patient={patient}
            onAnnuler={() => setModeCreation(false)}
            onSucces={handleSucces}
          />
        </div>
      )}

      {analyses.length === 0 && !modeCreation ? (
        <div className="text-center py-10 text-texte-secondaire">
          <FlaskConical size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm italic">Aucune analyse NFS enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {analyses.map((a) => (
            <CarteAnalyse key={a.id} analyse={a} onSupprimer={handleSupprimer} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionAnalyseNFS;
