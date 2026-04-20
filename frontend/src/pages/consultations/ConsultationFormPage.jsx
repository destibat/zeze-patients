import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { usePatient } from '../../hooks/usePatients';
import { useCreerConsultation } from '../../hooks/useConsultations';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';
import { useState } from 'react';

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

const Champ = ({ label, obligatoire, erreur, children, col2 }) => (
  <div className={col2 ? 'sm:col-span-2' : ''}>
    <label className="block text-sm font-medium text-texte-principal mb-1">
      {label} {obligatoire && <span className="text-medical-critique">*</span>}
    </label>
    {children}
    {erreur && <p className="text-xs text-medical-critique mt-1">{erreur}</p>}
  </div>
);

const ConsultationFormPage = () => {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(patientId);
  const creer = useCreerConsultation(patientId);
  const erreurMutation = creer.error?.response?.data?.message;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { date_consultation: new Date().toISOString().split('T')[0] },
  });

  const soumettre = async (valeurs) => {
    // Nettoyer les champs vides
    const data = Object.fromEntries(
      Object.entries(valeurs).map(([k, v]) => [k, v === '' ? null : v])
    );
    try {
      const resultat = await creer.mutateAsync(data);
      navigate(`/patients/${patientId}/consultations/${resultat.id}`);
    } catch {}
  };

  const cls = (err) => `champ-input ${err ? 'border-medical-critique' : ''}`;

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/patients/${patientId}`)} className="p-2 text-texte-secondaire hover:text-zeze-vert rounded-bouton hover:bg-fond-secondaire">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Nouvelle consultation</h1>
          {patient && <p className="text-sm text-texte-secondaire">{patient.prenom} {patient.nom} — {patient.numero_dossier}</p>}
        </div>
      </div>

      {erreurMutation && <Alert type="erreur" message={erreurMutation} />}

      <form onSubmit={handleSubmit(soumettre)} noValidate className="space-y-4">
        <Section titre="Informations générales">
          <Champ label="Date" obligatoire erreur={errors.date_consultation?.message}>
            <input type="date" className={cls(errors.date_consultation)} {...register('date_consultation', { required: 'Requis' })} />
          </Champ>
          <div />
          <Champ label="Motif de consultation" obligatoire erreur={errors.motif?.message} col2>
            <input className={cls(errors.motif)} placeholder="ex: Douleurs abdominales, suivi diabète..." {...register('motif', { required: 'Requis' })} />
          </Champ>
          <Champ label="Symptômes" col2>
            <textarea rows={3} className="champ-input resize-none" placeholder="Décrire les symptômes du patient..." {...register('symptomes')} />
          </Champ>
          <Champ label="Diagnostic" col2>
            <textarea rows={3} className="champ-input resize-none" placeholder="Diagnostic posé..." {...register('diagnostic')} />
          </Champ>
          <Champ label="Notes de traitement" col2>
            <textarea rows={2} className="champ-input resize-none" placeholder="Instructions, recommandations..." {...register('traitement_notes')} />
          </Champ>
        </Section>

        <Section titre="Constantes vitales" defautOuverte={false}>
          <Champ label="Tension systolique (mmHg)">
            <input type="number" min={0} max={300} className="champ-input" placeholder="ex: 120" {...register('tension_systolique', { valueAsNumber: true })} />
          </Champ>
          <Champ label="Tension diastolique (mmHg)">
            <input type="number" min={0} max={200} className="champ-input" placeholder="ex: 80" {...register('tension_diastolique', { valueAsNumber: true })} />
          </Champ>
          <Champ label="Fréquence cardiaque (bpm)">
            <input type="number" min={0} max={300} className="champ-input" placeholder="ex: 72" {...register('frequence_cardiaque', { valueAsNumber: true })} />
          </Champ>
          <Champ label="Température (°C)">
            <input type="number" min={30} max={45} step={0.1} className="champ-input" placeholder="ex: 37.2" {...register('temperature', { valueAsNumber: true })} />
          </Champ>
          <Champ label="Poids (kg)">
            <input type="number" min={0} max={500} step={0.1} className="champ-input" placeholder="ex: 70.5" {...register('poids', { valueAsNumber: true })} />
          </Champ>
          <Champ label="Taille (cm)">
            <input type="number" min={0} max={250} className="champ-input" placeholder="ex: 170" {...register('taille', { valueAsNumber: true })} />
          </Champ>
          <Champ label="Saturation O₂ (%)">
            <input type="number" min={0} max={100} className="champ-input" placeholder="ex: 98" {...register('saturation_o2', { valueAsNumber: true })} />
          </Champ>
        </Section>

        <div className="flex gap-3">
          <Button type="submit" variante="primaire" icone={Save} chargement={creer.isPending}>
            Enregistrer
          </Button>
          <Button type="button" variante="fantome" onClick={() => navigate(`/patients/${patientId}`)}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ConsultationFormPage;
