import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { usePatient, useCreerPatient, useModifierPatient } from '../../hooks/usePatients';
import AllergyTagInput from '../../components/patients/AllergyTagInput';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';

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
            <input type="date" className={cls(errors.date_naissance)} {...register('date_naissance', { required: 'Requis' })} />
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
