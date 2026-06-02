import { AlertTriangle } from 'lucide-react';
import { useAbonnement } from '../hooks/useAbonnement';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

const AbonnementBloqueBanner = () => {
  const { data } = useAbonnement();
  if (!data || data.actif) return null;

  const expired = data.expire_le && new Date(data.expire_le) < new Date();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium">
        {expired
          ? `Abonnement expiré le ${fmtDate(data.expire_le)}. Les modifications sont désactivées. Contactez ZEZEPAGNON pour renouveler.`
          : 'Abonnement suspendu. Les modifications sont désactivées. Contactez ZEZEPAGNON pour réactiver votre accès.'}
      </p>
    </div>
  );
};

export default AbonnementBloqueBanner;
