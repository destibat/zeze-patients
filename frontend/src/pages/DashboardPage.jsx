import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Users, Stethoscope, Calendar, TrendingUp, Bell,
  Clock, CheckCircle, AlertCircle, Phone,
} from 'lucide-react';

const toDateInput = (d) => d.toISOString().split('T')[0];

const useStats = () =>
  useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    refetchInterval: 60 * 1000,
  });

const useRdvAujourdhui = () => {
  const debut = new Date(); debut.setHours(0, 0, 0, 0);
  const fin   = new Date(); fin.setHours(23, 59, 59, 999);
  return useQuery({
    queryKey: ['rdv-aujourd-hui'],
    queryFn: () =>
      api.get('/rendez-vous', { params: { debut: debut.toISOString(), fin: fin.toISOString() } })
        .then((r) => r.data),
    refetchInterval: 60 * 1000,
  });
};

const formatMontant = (n) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1).replace('.', ',') + ' M FCFA'
    : new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const STATUT_RDV = {
  planifie:  { label: 'Planifié',  couleur: 'bg-yellow-100 text-yellow-800', icone: Clock },
  confirme:  { label: 'Confirmé',  couleur: 'bg-blue-100 text-blue-800',     icone: CheckCircle },
  honore:    { label: 'Honoré',    couleur: 'bg-green-100 text-green-800',   icone: CheckCircle },
  absent:    { label: 'Absent',    couleur: 'bg-red-100 text-red-700',       icone: AlertCircle },
  annule:    { label: 'Annulé',    couleur: 'bg-gray-100 text-gray-500',     icone: AlertCircle },
};

const CarteKPI = ({ titre, valeur, icone: Icone, couleur, sous, onClick, badge }) => (
  <div
    className={`carte flex items-center gap-4 relative ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    onClick={onClick}
  >
    <div className={`w-12 h-12 rounded-carte flex items-center justify-center flex-shrink-0 ${couleur}`}>
      <Icone size={22} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-texte-secondaire">{titre}</p>
      <p className="text-2xl font-titres font-bold text-texte-principal">{valeur}</p>
      {sous && <p className="text-xs text-texte-secondaire mt-0.5">{sous}</p>}
    </div>
    {badge > 0 && (
      <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </div>
);

const DashboardPage = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useStats();
  const { data: rdvs = [], isLoading: rdvLoading } = useRdvAujourdhui();

  const val = (v) => (isLoading ? '…' : v ?? '—');

  const rdvActifs = rdvs.filter((r) => r.statut !== 'annule');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-titres font-bold text-texte-principal">
          Bonjour, {utilisateur?.prenom}
        </h1>
        <p className="text-texte-secondaire mt-1">
          Cabinet médical ZEZEPAGNON — Abidjan, Côte d'Ivoire
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CarteKPI
          titre="Patients actifs"
          valeur={val(stats?.patients_actifs)}
          icone={Users}
          couleur="bg-zeze-vert"
          onClick={() => navigate('/patients')}
        />
        <CarteKPI
          titre="Consultations aujourd'hui"
          valeur={val(stats?.consultations_aujourd_hui)}
          icone={Stethoscope}
          couleur="bg-blue-500"
          sous={stats ? `${stats.consultations_mois} ce mois` : null}
        />
        <CarteKPI
          titre="Rendez-vous aujourd'hui"
          valeur={val(stats?.rdv_aujourd_hui)}
          icone={Calendar}
          couleur="bg-zeze-or"
          onClick={() => navigate('/rendez-vous')}
        />
        <CarteKPI
          titre={stats?.ca_filtre ? 'Mon CA du mois' : 'CA du mois'}
          valeur={isLoading ? '…' : stats ? formatMontant(stats.ca_mois) : '—'}
          icone={TrendingUp}
          couleur="bg-emerald-600"
          onClick={() => navigate('/statistiques')}
        />
      </div>

      {/* Alerte relances */}
      {!isLoading && stats?.factures_a_relancer > 0 && (
        <button
          onClick={() => navigate('/facturation')}
          className="w-full bg-red-50 border border-red-200 rounded-carte px-4 py-3 flex items-center justify-between hover:bg-red-100 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Bell size={15} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {stats.factures_a_relancer} facture{stats.factures_a_relancer > 1 ? 's' : ''} en attente de paiement
              </p>
              <p className="text-xs text-red-600">Cliquez pour voir les patients à relancer</p>
            </div>
          </div>
          <span className="text-xs text-red-700 font-semibold">Voir →</span>
        </button>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* RDV du jour */}
        <div className="carte">
          <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
            <Calendar size={15} className="text-zeze-or" />
            Rendez-vous du jour
            {rdvActifs.length > 0 && (
              <span className="ml-auto text-xs text-texte-secondaire font-normal">{rdvActifs.length} RDV</span>
            )}
          </h2>

          {rdvLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-zeze-vert border-t-transparent" />
            </div>
          ) : rdvActifs.length === 0 ? (
            <div className="text-center py-6 text-texte-secondaire">
              <Calendar size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun rendez-vous aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rdvActifs.map((rdv) => {
                const cfg = STATUT_RDV[rdv.statut] || STATUT_RDV.planifie;
                const Icone = cfg.icone;
                const heure = new Date(rdv.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={rdv.id}
                    className="flex items-center gap-3 p-2 rounded-bouton hover:bg-fond-secondaire cursor-pointer transition-colors"
                    onClick={() => navigate(`/patients/${rdv.patient_id}`)}
                  >
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-sm font-bold text-texte-principal font-mono">{heure}</p>
                      <p className="text-xs text-texte-secondaire">{rdv.duree_minutes} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-texte-principal truncate">
                        {rdv.patient?.prenom} {rdv.patient?.nom}
                      </p>
                      <p className="text-xs text-texte-secondaire truncate">{rdv.motif}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rdv.patient?.telephone && (
                        <a
                          href={`tel:${rdv.patient.telephone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-zeze-vert hover:bg-zeze-vert/10 rounded"
                          title={rdv.patient.telephone}
                        >
                          <Phone size={13} />
                        </a>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.couleur} whitespace-nowrap`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accès rapides */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            Accès rapides
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { titre: 'Nouveau patient',    sous: 'Créer un dossier',        icone: Users,       couleur: 'bg-zeze-vert/10 group-hover:bg-zeze-vert/20',     ico: 'text-zeze-vert',   href: '/patients/nouveau' },
              { titre: 'Nouveau rendez-vous',sous: 'Planifier un RDV',        icone: Calendar,    couleur: 'bg-zeze-or/10 group-hover:bg-zeze-or/20',         ico: 'text-zeze-or',     href: '/rendez-vous' },
              { titre: 'Consultations',      sous: 'Historique global',        icone: Stethoscope, couleur: 'bg-blue-50 group-hover:bg-blue-100',              ico: 'text-blue-500',    href: '/consultations' },
              { titre: 'Stock produits',     sous: 'Gérer les inventaires',   icone: TrendingUp,  couleur: 'bg-amber-50 group-hover:bg-amber-100',            ico: 'text-amber-600',   href: '/stock' },
            ].map(({ titre, sous, icone: Icone, couleur, ico, href }) => (
              <button
                key={href}
                onClick={() => navigate(href)}
                className="carte text-left hover:border-zeze-vert/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-bouton flex items-center justify-center transition-colors ${couleur}`}>
                    <Icone size={18} className={ico} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-texte-principal">{titre}</p>
                    <p className="text-xs text-texte-secondaire">{sous}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
