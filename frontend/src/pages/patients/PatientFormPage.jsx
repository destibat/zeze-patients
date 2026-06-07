import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { usePatient, useCreerPatient, useModifierPatient } from '../../hooks/usePatients';
import AllergyTagInput from '../../components/patients/AllergyTagInput';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { ArrowLeft, Save, ChevronDown, Plus, Trash2, X } from 'lucide-react';

const FREQUENCES_SUIVI = [
  { val: 'mensuel',      label: 'Mensuel (1x/mois)'         },
  { val: 'trimestriel',  label: 'Trimestriel (1x/3 mois)'   },
  { val: 'semestriel',   label: 'Semestriel (1x/6 mois)'    },
  { val: 'annuel',       label: 'Annuel (1x/an)'             },
  { val: 'libre',        label: 'Sur besoin / Ponctuel'      },
];

// ── Éditeur maladies chroniques ───────────────────────────────────────────────
const EditeurMaladies = ({ value = [], onChange }) => {
  const [form, setForm] = useState({ nom: '', depuis: '', notes: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ajouter = () => {
    if (!form.nom.trim()) return;
    onChange([...value, { nom: form.nom.trim(), depuis: form.depuis.trim(), notes: form.notes.trim() }]);
    setForm({ nom: '', depuis: '', notes: '' });
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((m, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-fond-secondaire rounded-bouton border border-bordure">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-texte-principal">{m.nom}</p>
                {m.depuis && <p className="text-xs text-texte-secondaire">Depuis : {m.depuis}</p>}
                {m.notes  && <p className="text-xs text-texte-secondaire italic">{m.notes}</p>}
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="p-1 text-texte-secondaire hover:text-medical-critique rounded shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <input className="champ-input text-sm" placeholder="Nom de la maladie *"
            value={form.nom} onChange={(e) => set('nom', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), ajouter())} />
        </div>
        <input className="champ-input text-sm" placeholder="Depuis (ex: 2020)"
          value={form.depuis} onChange={(e) => set('depuis', e.target.value)} />
      </div>
      <div className="flex gap-2">
        <input className="champ-input text-sm flex-1" placeholder="Notes (optionnel)"
          value={form.notes} onChange={(e) => set('notes', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), ajouter())} />
        <button type="button" onClick={ajouter}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert/90">
          <Plus size={13} /> Ajouter
        </button>
      </div>
    </div>
  );
};

// ── Éditeur traitements en cours ──────────────────────────────────────────────
const FREQUENCES_TRAIT = ['1x/jour', '2x/jour', '3x/jour', '1x/semaine', 'Matin', 'Soir', 'Si besoin', 'Autre'];

const EditeurTraitements = ({ value = [], onChange }) => {
  const [form, setForm] = useState({ medicament: '', dosage: '', frequence: '', depuis: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ajouter = () => {
    if (!form.medicament.trim()) return;
    onChange([...value, {
      medicament: form.medicament.trim(),
      dosage:     form.dosage.trim(),
      frequence:  form.frequence.trim(),
      depuis:     form.depuis.trim(),
    }]);
    setForm({ medicament: '', dosage: '', frequence: '', depuis: '' });
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="divide-y divide-bordure border border-bordure rounded-bouton overflow-hidden">
          {value.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-fond-principal hover:bg-fond-secondaire">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-texte-principal">{t.medicament}</span>
                {t.dosage    && <span className="text-xs text-texte-secondaire ml-2">{t.dosage}</span>}
                {t.frequence && <span className="text-xs text-zeze-vert ml-2">{t.frequence}</span>}
                {t.depuis    && <span className="text-xs text-texte-secondaire ml-2">depuis {t.depuis}</span>}
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="p-1 text-texte-secondaire hover:text-medical-critique rounded shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2 sm:col-span-2">
          <input className="champ-input text-sm" placeholder="Médicament *"
            value={form.medicament} onChange={(e) => set('medicament', e.target.value)} />
        </div>
        <input className="champ-input text-sm" placeholder="Dosage (ex: 500mg)"
          value={form.dosage} onChange={(e) => set('dosage', e.target.value)} />
        <input className="champ-input text-sm" placeholder="Depuis (ex: 2023)"
          value={form.depuis} onChange={(e) => set('depuis', e.target.value)} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {FREQUENCES_TRAIT.map((f) => (
          <button key={f} type="button"
            onClick={() => set('frequence', f)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              form.frequence === f
                ? 'bg-zeze-vert text-white border-zeze-vert'
                : 'border-bordure text-texte-secondaire hover:border-zeze-vert hover:text-zeze-vert'
            }`}>
            {f}
          </button>
        ))}
      </div>
      <button type="button" onClick={ajouter}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert/90">
        <Plus size={13} /> Ajouter ce traitement
      </button>
    </div>
  );
};

const Section = ({ titre, children, defautOuverte = true }) => {
  const [ouverte, setOuverte] = useState(defautOuverte);
  return (
    <div className="carte">
      <button type="button" onClick={() => setOuverte(!ouverte)} className="flex items-center justify-between w-full">
        <h2 className="text-base font-titres font-semibold text-texte-principal">{titre}</h2>
        <ChevronDown size={18} className={`text-texte-secondaire transition-transform ${ouverte ? 'rotate-180' : ''}`} />
      </button>
      {ouverte && <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>}
    </div>
  );
};

const Champ = ({ label, obligatoire, erreur, children, colonne2 }) => (
  <div className={colonne2 ? 'sm:col-span-2' : ''}>
    <label className="block text-sm font-medium text-texte-principal mb-1">
      {label} {obligatoire && <span className="text-medical-critique">*</span>}
    </label>
    {children}
    {erreur && <p className="text-xs text-medical-critique mt-1">{erreur}</p>}
  </div>
);

const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const ANNEE_MIN = 1920;
const ANNEE_MAX = new Date().getFullYear();

// Sélecteur de date de naissance — 3 listes déroulantes
// Reçoit value / onChange de Controller (valeur interne : "YYYY-MM-DD" ou "")
const SelectDateNaissance = ({ value, onChange, erreur }) => {
  const parts = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-') : ['', '', ''];
  const [annee, setAnnee] = useState(parts[0]);
  const [mois,  setMois]  = useState(parts[1]);
  const [jour,  setJour]  = useState(parts[2]);

  const sync = (a, m, j) => {
    if (a && m && j) onChange(`${a}-${m}-${j}`);
    else onChange('');
  };

  const jourMax = annee && mois
    ? new Date(Number(annee), Number(mois), 0).getDate()
    : 31;
  const jours = Array.from({ length: jourMax }, (_, i) => String(i + 1).padStart(2, '0'));
  const annees = Array.from({ length: ANNEE_MAX - ANNEE_MIN + 1 }, (_, i) => String(ANNEE_MAX - i));

  const sel = `champ-input ${erreur ? 'border-medical-critique' : ''}`;

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={jour}
        onChange={(e) => { setJour(e.target.value); sync(annee, mois, e.target.value); }}
        className={sel}
      >
        <option value="">Jour</option>
        {jours.map((j) => <option key={j} value={j}>{j}</option>)}
      </select>
      <select
        value={mois}
        onChange={(e) => { setMois(e.target.value); sync(annee, e.target.value, jour); }}
        className={sel}
      >
        <option value="">Mois</option>
        {MOIS.map((m, i) => (
          <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      <select
        value={annee}
        onChange={(e) => { setAnnee(e.target.value); sync(e.target.value, mois, jour); }}
        className={sel}
      >
        <option value="">Année</option>
        {annees.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
};

const PatientFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const modeEdition = Boolean(id);
  const { data: patientExistant, isLoading } = usePatient(id);
  const creer = useCreerPatient();
  const modifier = useModifierPatient();
  const mutation = modeEdition ? modifier : creer;
  const erreurMutation = mutation.error?.response?.data?.message;

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: { allergies: [], pays: "Côte d'Ivoire" },
  });

  useEffect(() => {
    if (modeEdition && patientExistant) {
      reset({
        nom: patientExistant.nom,
        prenom: patientExistant.prenom,
        sexe: patientExistant.sexe,
        date_naissance: patientExistant.date_naissance,
        telephone: patientExistant.telephone,
        adresse: patientExistant.adresse || '',
        commune: patientExistant.commune || '',
        ville: patientExistant.ville || '',
        pays: patientExistant.pays || "Côte d'Ivoire",
        profession: patientExistant.profession || '',
        groupe_sanguin: patientExistant.groupe_sanguin || '',
        allergies: patientExistant.allergies || [],
        antecedents_personnels: patientExistant.antecedents_personnels || '',
        antecedents_familiaux: patientExistant.antecedents_familiaux || '',
        maladies_chroniques:   patientExistant.maladies_chroniques || [],
        traitements_en_cours:  patientExistant.traitements_en_cours || [],
        frequence_suivi:       patientExistant.frequence_suivi || '',
        contact_urgence_nom: patientExistant.contact_urgence_nom || '',
        contact_urgence_telephone: patientExistant.contact_urgence_telephone || '',
        contact_urgence_lien: patientExistant.contact_urgence_lien || '',
        numero_assurance: patientExistant.numero_assurance || '',
      });
    }
  }, [patientExistant, modeEdition, reset]);

  const soumettre = async (valeurs) => {
    try {
      if (modeEdition) {
        await modifier.mutateAsync({ id, ...valeurs });
        navigate(`/patients/${id}`);
      } else {
        const nouveau = await creer.mutateAsync(valeurs);
        navigate(`/patients/${nouveau.id}`);
      }
    } catch {}
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>;

  const cls = (err) => `champ-input ${err ? 'border-medical-critique' : ''}`;

  return (
    <div className="max-w-3xl space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')} className="p-2 text-texte-secondaire hover:text-zeze-vert rounded-bouton hover:bg-fond-secondaire">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-titres font-bold text-texte-principal">
          {modeEdition ? 'Modifier le dossier patient' : 'Nouveau patient'}
        </h1>
      </div>

      {erreurMutation && <Alert type="erreur" message={erreurMutation} />}

      <form onSubmit={handleSubmit(soumettre)} noValidate className="space-y-4">
        {/* Section 1 — Informations obligatoires */}
        <Section titre="Informations obligatoires">
          <Champ label="Prénom" obligatoire erreur={errors.prenom?.message}>
            <input className={cls(errors.prenom)} {...register('prenom', { required: 'Requis' })} />
          </Champ>
          <Champ label="Nom" obligatoire erreur={errors.nom?.message}>
            <input className={cls(errors.nom)} {...register('nom', { required: 'Requis' })} />
          </Champ>
          <Champ label="Sexe" obligatoire erreur={errors.sexe?.message}>
            <select className={cls(errors.sexe)} {...register('sexe', { required: 'Requis' })}>
              <option value="">— Choisir —</option>
              <option value="masculin">Masculin</option>
              <option value="feminin">Féminin</option>
              <option value="autre">Autre</option>
            </select>
          </Champ>
          <Champ label="Date de naissance" obligatoire erreur={errors.date_naissance?.message}>
            <Controller
              name="date_naissance"
              control={control}
              rules={{ required: 'Requis' }}
              render={({ field }) => (
                <SelectDateNaissance
                  value={field.value || ''}
                  onChange={field.onChange}
                  erreur={errors.date_naissance}
                />
              )}
            />
          </Champ>
          <Champ label="Téléphone" obligatoire erreur={errors.telephone?.message} colonne2>
            <input type="tel" placeholder="+225 07 00 00 00 00" className={cls(errors.telephone)} {...register('telephone', { required: 'Requis' })} />
          </Champ>
        </Section>

        {/* Section 2 — Adresse */}
        <Section titre="Adresse" defautOuverte={false}>
          <Champ label="Adresse" colonne2><input className="champ-input" {...register('adresse')} /></Champ>
          <Champ label="Commune"><input className="champ-input" {...register('commune')} /></Champ>
          <Champ label="Ville"><input className="champ-input" {...register('ville')} /></Champ>
          <Champ label="Pays"><input className="champ-input" {...register('pays')} /></Champ>
          <Champ label="Profession"><input className="champ-input" {...register('profession')} /></Champ>
        </Section>

        {/* Section 3 — Informations médicales */}
        <Section titre="Informations médicales" defautOuverte={false}>
          <Champ label="Groupe sanguin">
            <select className="champ-input" {...register('groupe_sanguin')}>
              <option value="">— Inconnu —</option>
              {GROUPES_SANGUINS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Champ>
          <div /> {/* espacement grille */}
          <Champ label="Allergies" colonne2>
            <Controller name="allergies" control={control} render={({ field }) => (
              <AllergyTagInput value={field.value} onChange={field.onChange} />
            )} />
          </Champ>
          <Champ label="Antécédents personnels" colonne2>
            <textarea rows={3} className="champ-input resize-none" {...register('antecedents_personnels')} />
          </Champ>
          <Champ label="Antécédents familiaux" colonne2>
            <textarea rows={3} className="champ-input resize-none" {...register('antecedents_familiaux')} />
          </Champ>
        </Section>

        {/* Section 3b — Suivi médical */}
        <Section titre="Suivi médical" defautOuverte={false}>
          {/* Fréquence de suivi */}
          <Champ label="Fréquence de suivi" colonne2>
            <select className="champ-input" {...register('frequence_suivi')}>
              <option value="">— Non définie —</option>
              {FREQUENCES_SUIVI.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Champ>

          {/* Maladies chroniques */}
          <Champ label="Maladies chroniques" colonne2>
            <Controller name="maladies_chroniques" control={control} render={({ field }) => (
              <EditeurMaladies value={field.value} onChange={field.onChange} />
            )} />
          </Champ>

          {/* Traitements en cours */}
          <Champ label="Traitements en cours" colonne2>
            <Controller name="traitements_en_cours" control={control} render={({ field }) => (
              <EditeurTraitements value={field.value} onChange={field.onChange} />
            )} />
          </Champ>
        </Section>

        {/* Section 4 — Contact d'urgence */}
        <Section titre="Contact d'urgence" defautOuverte={false}>
          <Champ label="Nom du contact"><input className="champ-input" {...register('contact_urgence_nom')} /></Champ>
          <Champ label="Téléphone"><input type="tel" className="champ-input" {...register('contact_urgence_telephone')} /></Champ>
          <Champ label="Lien de parenté"><input className="champ-input" placeholder="ex: Épouse, Mère..." {...register('contact_urgence_lien')} /></Champ>
        </Section>

        {/* Section 5 — Assurance */}
        <Section titre="Assurance / Mutuelle" defautOuverte={false}>
          <Champ label="Numéro d'assurance / mutuelle" colonne2>
            <input className="champ-input" {...register('numero_assurance')} />
          </Champ>
        </Section>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" variante="primaire" icone={Save} chargement={mutation.isPending}>
            Enregistrer le dossier
          </Button>
          <Button type="button" variante="fantome" onClick={() => navigate('/patients')}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PatientFormPage;
