import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useExerciceActuel } from '../../hooks/useExercices';
import { BookOpen, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

const formatMontant = (n) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1).replace('.', ',') + ' M FCFA'
    : new Intl.NumberFormat('fr-FR').format(n ?? 0) + ' FCFA';

const BandeauExercice = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();

  // Visible uniquement pour admin et stockiste
  if (!['administrateur', 'stockiste'].includes(utilisateur?.role)) return null;

  const { data, isLoading } = useExerciceActuel();

  if (isLoading) return null;

  const exercice = data?.exercice;

  // Aucun exercice ouvert — bandeau d'alerte
  if (!exercice) {
    return (
      <div
        className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-orange-100 transition-colors"
        onClick={() => navigate('/exercices')}
      >
        <AlertTriangle size={15} className="text-orange-500 flex-shrink-0" />
        <p className="text-sm text-orange-700 flex-1">
          <span className="font-semibold">Aucun exercice ouvert.</span>
          {' '}Aucune vente ni facture ne peut être enregistrée.
        </p>
        <span className="text-xs text-orange-600 underline whitespace-nowrap">Ouvrir un exercice →</span>
      </div>
    );
  }

  const isRouvert = exercice.statut === 'rouvert';

  return (
    <div
      className={`border-b px-4 py-1.5 flex items-center gap-4 cursor-pointer transition-colors ${
        isRouvert
          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          : 'bg-zeze-vert/5 border-zeze-vert/20 hover:bg-zeze-vert/10'
      }`}
      onClick={() => navigate('/exercices')}
      title="Cliquer pour gérer les exercices"
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <BookOpen size={14} className={isRouvert ? 'text-amber-600' : 'text-zeze-vert'} />
        <span className={`text-sm font-semibold ${isRouvert ? 'text-amber-700' : 'text-zeze-vert-fonce'}`}>
          {exercice.numero}
        </span>
        {isRouvert && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 font-medium">
            Rouvert
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-texte-secondaire flex-shrink-0">
        <Clock size={11} />
        <span>
          {new Date(exercice.date_ouverture).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          {data.duree_jours > 0 && ` — ${data.duree_jours}j`}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs flex-shrink-0">
        <TrendingUp size={11} className="text-zeze-vert" />
        <span className="font-medium text-texte-principal">
          {formatMontant(data.ca_accumule)}
        </span>
        {data.ca_factures > 0 && data.ca_delegues > 0 && (
          <span className="text-texte-secondaire hidden sm:inline">
            (fact. {formatMontant(data.ca_factures)} + dél. {formatMontant(data.ca_delegues)})
          </span>
        )}
      </div>

      <span className="ml-auto text-xs text-texte-secondaire hidden md:block">Gérer →</span>
    </div>
  );
};

export default BandeauExercice;
