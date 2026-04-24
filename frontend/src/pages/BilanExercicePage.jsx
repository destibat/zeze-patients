import { useParams, useNavigate } from 'react-router-dom';
import { useBilanExercice, useExercice } from '../hooks/useExercices';
import { AperçuBilan } from './ExercicesPage';
import Button from '../components/ui/Button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const BilanExercicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: exerciceData, isLoading: loadExercice } = useExercice(id);
  const { data: bilanData, isLoading: loadBilan } = useBilanExercice(id);

  const exercice = exerciceData?.exercice ?? exerciceData;
  const bilan = bilanData?.bilan ?? bilanData;

  const isLoading = loadExercice || loadBilan;

  return (
    <div className="max-w-3xl space-y-6 print:max-w-none print:space-y-4">
      {/* En-tête — masqué à l'impression */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variante="fantome" icone={ArrowLeft} onClick={() => navigate('/exercices')}>
            Exercices
          </Button>
          {exercice && (
            <h1 className="text-xl font-titres font-bold text-texte-principal">
              Bilan — {exercice.numero}
            </h1>
          )}
        </div>
        <Button variante="secondaire" icone={Printer} onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>

      {/* En-tête impression */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">
          Bilan exercice {exercice?.numero ?? ''}
        </h1>
        {exercice && (
          <p className="text-sm text-gray-600 mt-1">
            Du {fmtDate(exercice.date_ouverture)} au {exercice.date_cloture ? fmtDate(exercice.date_cloture) : 'aujourd\'hui'}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">Imprimé le {fmtDate(new Date())}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-texte-secondaire gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Chargement du bilan…</span>
        </div>
      )}

      {!isLoading && bilan && (
        <div className="carte">
          <AperçuBilan bilan={bilan} exercice={exercice} />
        </div>
      )}

      {!isLoading && !bilan && (
        <p className="text-sm text-texte-secondaire text-center py-10">Aucun bilan disponible.</p>
      )}
    </div>
  );
};

export default BilanExercicePage;
