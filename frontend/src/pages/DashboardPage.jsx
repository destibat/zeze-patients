import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import useFormatMontant from '../hooks/useFormatMontant';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useStatsStockDelegue, useGainsDelegues, useVentesEnAttente } from '../hooks/useStockDelegue';
import { useExerciceActuel, useBilanExercice } from '../hooks/useExercices';
import { useAlertesStock } from '../hooks/useStock';
import { useStatsPretEmprunts } from '../hooks/usePretEmprunts';
import {
  Users, Stethoscope, Calendar, TrendingUp, Bell,
  Clock, CheckCircle, AlertCircle, Phone,
  ShoppingCart, ShoppingBag, Package, BookOpen, AlertTriangle, ArrowRightLeft, FileBarChart,
  Truck, BarChart3, FileBarChart2,
} from 'lucide-react';
import { useBonsCommandeMapa } from '../hooks/useBonsCommandeMapa';

const toDateInput = (d) => d.toISOString().split('T')[0];

const useStatsAnnuelles = () => {
  const annee = new Date().getFullYear();
  return useQuery({
    queryKey: ['stats-annuelles-dashboard', annee],
    queryFn: () => api.get('/stats/detaillees', { params: { periode: 'annee', annee } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
};

// ── Section graphiques analytiques (admin/stockiste) ─────────────────────────
const SectionChartsAnalytiques = () => {
  const navigate = useNavigate();
  const { formatMontant } = useFormatMontant();
  const { data, isLoading } = useStatsAnnuelles();

  if (isLoading) return (
    <div className="carte flex items-center justify-center py-6">
      <div className="animate-spin rounded-full h-5 w-5 border-4 border-zeze-vert border-t-transparent" />
    </div>
  );
  if (!data) return null;

  const caChart = data.ca_chart || [];
  const consultChart = data.consultations_chart || [];
  const topProduits = (data.top_produits || []).slice(0, 5);
  const maxCA = Math.max(...caChart.map((d) => d.encaisse || 0), 1);
  const maxConsult = Math.max(...consultChart.map((d) => d.total || 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide flex items-center gap-2">
          <BarChart3 size={14} className="text-zeze-vert" />
          Tendances — {new Date().getFullYear()}
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/statistiques')}
            className="flex items-center gap-1.5 text-xs font-medium text-zeze-vert hover:underline">
            <FileBarChart2 size={13} />Rapport PDF →
          </button>
          <button onClick={() => navigate('/statistiques')}
            className="text-xs text-texte-secondaire hover:underline">
            Statistiques complètes →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* CA mensuel */}
        <div className="carte">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">
            CA encaissé par mois
          </p>
          <div className="flex items-end gap-0.5 h-28 mt-3 overflow-hidden">
            {caChart.map((d, i) => {
              const h = Math.max(2, Math.round(((d.encaisse || 0) / maxCA) * 100));
              const hF = Math.max(1, Math.round(((d.facture || 0) / maxCA) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {(d.encaisse > 0 || d.facture > 0) && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-texte-principal text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatMontant(d.encaisse)}
                    </div>
                  )}
                  <div className="w-full flex items-end gap-px" style={{ height: '96px' }}>
                    <div className="flex-1 rounded-t bg-zeze-vert/25" style={{ height: `${hF}%`, minHeight: d.facture > 0 ? '3px' : '0' }} />
                    <div className="flex-1 rounded-t bg-zeze-vert" style={{ height: `${h}%`, minHeight: d.encaisse > 0 ? '3px' : '0' }} />
                  </div>
                  <span className="text-[9px] text-texte-secondaire truncate">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-texte-secondaire">
              <span className="w-3 h-2 rounded-sm bg-zeze-vert/25 inline-block" />Facturé
            </span>
            <span className="flex items-center gap-1 text-[10px] text-texte-secondaire">
              <span className="w-3 h-2 rounded-sm bg-zeze-vert inline-block" />Encaissé
            </span>
          </div>
        </div>

        {/* Consultations mensuelles */}
        <div className="carte">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">
            Consultations par mois
          </p>
          <div className="flex items-end gap-0.5 h-28 mt-3 overflow-hidden">
            {consultChart.map((d, i) => {
              const h = Math.max(2, Math.round(((d.total || 0) / maxConsult) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {d.total > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-texte-principal text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {d.total}
                    </div>
                  )}
                  <div className="w-full flex items-end" style={{ height: '96px' }}>
                    <div className="w-full rounded-t bg-blue-500" style={{ height: `${h}%`, minHeight: d.total > 0 ? '3px' : '0' }} />
                  </div>
                  <span className="text-[9px] text-texte-secondaire truncate">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top produits */}
      {topProduits.length > 0 && (
        <div className="carte">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
            Top 5 produits vendus — {new Date().getFullYear()}
          </p>
          <div className="space-y-2.5">
            {topProduits.map((p, i) => {
              const pct = Math.round((p.quantite / topProduits[0].quantite) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-bold text-texte-secondaire shrink-0">{i + 1}</span>
                  <span className="text-sm text-texte-principal truncate w-36 shrink-0">{p.nom}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zeze-or rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-texte-principal shrink-0 w-16 text-right">
                    {p.quantite} unités
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

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

// ── Widget exercice comptable (admin + stockiste) ─────────────────────────────
const WidgetExercice = () => {
  const navigate = useNavigate();
  const { formatMontant } = useFormatMontant();
  const { data, isLoading } = useExerciceActuel();
  const exercice = data?.exercice;
  const { data: bilanData, isLoading: bilanLoading } = useBilanExercice(exercice?.id);

  if (isLoading) {
    return (
      <div className="carte flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-4 border-zeze-vert border-t-transparent" />
      </div>
    );
  }

  if (!exercice) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-carte px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <BookOpen size={15} className="text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Aucun exercice comptable ouvert</p>
            <p className="text-xs text-amber-700">La facturation est bloquée tant qu'aucun exercice n'est ouvert.</p>
          </div>
        </div>
        <button onClick={() => navigate('/exercices')} className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap ml-4">
          Ouvrir →
        </button>
      </div>
    );
  }

  const bilan = bilanData?.bilan;
  const commissionsTotal = bilan ? bilan.commissions_stockistes + bilan.commissions_delegues : null;

  return (
    <div className="carte space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
          <BookOpen size={15} className="text-zeze-vert" />
          Exercice en cours
          <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${
            exercice.statut === 'rouvert'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {exercice.statut === 'rouvert' ? 'Rouvert' : 'Ouvert'}
          </span>
        </h2>
        <button
          onClick={() => navigate(`/exercices/${exercice.id}/bilan`)}
          className="text-xs text-zeze-vert hover:underline font-medium"
        >
          Voir le bilan complet →
        </button>
      </div>

      {/* Infos exercice */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <p className="text-xs text-texte-secondaire">Numéro</p>
          <p className="font-mono font-semibold text-zeze-vert">{exercice.numero}</p>
        </div>
        <div>
          <p className="text-xs text-texte-secondaire">Ouvert le</p>
          <p className="font-semibold text-texte-principal">
            {new Date(exercice.date_ouverture).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-xs text-texte-secondaire">Durée</p>
          <p className="font-semibold text-texte-principal">{data.duree_jours} jour{data.duree_jours > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-bordure">
        <div>
          <p className="text-xs text-texte-secondaire">CA accumulé</p>
          <p className="text-sm font-bold text-texte-principal">{formatMontant(data.ca_accumule)}</p>
          <p className="text-xs text-texte-secondaire">
            Fact. {formatMontant(data.ca_factures)} · Appro. {formatMontant(data.ca_approvisionnements ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-texte-secondaire">Commissions dues</p>
          <p className="text-sm font-bold text-zeze-or">
            {bilanLoading ? '…' : commissionsTotal !== null ? formatMontant(commissionsTotal) : '—'}
          </p>
          {!bilanLoading && bilan && (
            <p className="text-xs text-texte-secondaire">
              Stock. {formatMontant(bilan.commissions_stockistes)} · Dél. {formatMontant(bilan.commissions_delegues)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-texte-secondaire">Net MAPA</p>
          <p className="text-sm font-bold text-zeze-vert">
            {bilanLoading ? '…' : bilan ? formatMontant(bilan.net_mapa) : '—'}
          </p>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={() => navigate('/exercices')}
            className="text-xs px-3 py-1.5 rounded-bouton border border-zeze-vert/40 text-zeze-vert hover:bg-zeze-vert/10 transition-colors font-medium"
          >
            Gérer les exercices
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Dashboard revendeur ─────────────────────────────────────────────────────────
const DashboardDelegue = ({ utilisateur }) => {
  const navigate = useNavigate();
  const { formatMontant } = useFormatMontant();
  const { data: stats, isLoading } = useStats();
  const { data: stockStats, isLoading: stockLoading } = useStatsStockDelegue(true);
  const { data: rdvs = [], isLoading: rdvLoading } = useRdvAujourdhui();

  const val = (v, loading = isLoading) => (loading ? '…' : v ?? '—');
  const valMontant = (v, loading = isLoading || stockLoading) => loading ? '…' : formatMontant(v ?? 0);

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

      {/* KPI ligne 1 : activité générale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CarteKPI
          titre="Consultations aujourd'hui"
          valeur={val(stats?.consultations_aujourd_hui)}
          icone={Stethoscope}
          couleur="bg-blue-500"
          sous={stats ? `${stats.consultations_mois} ce mois` : null}
          onClick={() => navigate('/consultations')}
        />
        <CarteKPI
          titre="Rendez-vous aujourd'hui"
          valeur={val(stats?.rdv_aujourd_hui)}
          icone={Calendar}
          couleur="bg-zeze-or"
          onClick={() => navigate('/rendez-vous')}
        />
        <CarteKPI
          titre="Produits en stock"
          valeur={val(stockStats?.nb_produits_stock, stockLoading)}
          icone={Package}
          couleur="bg-zeze-vert"
          onClick={() => navigate('/mon-stock')}
        />
        <CarteKPI
          titre="Mon CA du mois"
          valeur={isLoading ? '…' : stats ? formatMontant(stats.ca_mois) : '—'}
          icone={TrendingUp}
          couleur="bg-emerald-600"
        />
      </div>

      {/* KPI ligne 2 : activité financière */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide">
            Mon activité — exercice en cours
          </h2>
          <button
            onClick={() => navigate('/mon-bilan')}
            className="flex items-center gap-1.5 text-xs font-medium text-zeze-vert hover:underline"
          >
            <FileBarChart size={13} /> Voir mon bilan complet →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CarteKPI
            titre="Ventes via ordonnances"
            valeur={isLoading ? '…' : formatMontant(stats?.ca_ordonnances_mois ?? 0)}
            icone={ShoppingBag}
            couleur="bg-zeze-vert"
            sous={stockLoading ? null : `Stock: ${formatMontant(stockStats?.ca_ord_depuis_stock ?? 0)} · Direct: ${formatMontant(stockStats?.ca_ord_achat_direct ?? 0)}`}
            onClick={() => navigate('/ordonnances')}
          />
          <CarteKPI
            titre="Ventes directes stock"
            valeur={valMontant(stockStats?.ventes_mois)}
            icone={ShoppingBag}
            couleur="bg-emerald-600"
            sous="Hors ordonnance"
            onClick={() => navigate('/mon-stock')}
          />
          <CarteKPI
            titre="Approvisionnements"
            valeur={valMontant(stockStats?.achats_mois)}
            icone={ShoppingCart}
            couleur="bg-blue-600"
            sous="Achats auprès du stockiste"
            onClick={() => navigate('/approvisionnements')}
          />
          <CarteKPI
            titre="Ma commission"
            valeur={stockLoading ? '…' : formatMontant(stockStats?.gain_delegue_mois ?? 0)}
            icone={TrendingUp}
            couleur="bg-zeze-or"
            sous="Sur achats de l'exercice"
            onClick={() => navigate('/mon-bilan')}
          />
        </div>
      </div>

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
                  <div key={rdv.id} className="flex items-center gap-3 p-2 rounded-bouton hover:bg-fond-secondaire cursor-pointer transition-colors"
                    onClick={() => navigate(`/patients/${rdv.patient_id}`)}>
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-sm font-bold text-texte-principal font-mono">{heure}</p>
                      <p className="text-xs text-texte-secondaire">{rdv.duree_minutes} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-texte-principal truncate">{rdv.patient?.prenom} {rdv.patient?.nom}</p>
                      <p className="text-xs text-texte-secondaire truncate">{rdv.motif}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rdv.patient?.telephone && (
                        <a href={`tel:${rdv.patient.telephone}`} onClick={(e) => e.stopPropagation()}
                          className="p-1 text-zeze-vert hover:bg-zeze-vert/10 rounded" title={rdv.patient.telephone}>
                          <Phone size={13} />
                        </a>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.couleur} whitespace-nowrap`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accès rapides revendeur */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal">Accès rapides</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { titre: 'Nouveau patient',     sous: 'Créer un dossier',        icone: Users,        couleur: 'bg-zeze-vert/10 group-hover:bg-zeze-vert/20',   ico: 'text-zeze-vert', href: '/patients/nouveau' },
              { titre: 'Nouveau rendez-vous', sous: 'Planifier un RDV',        icone: Calendar,     couleur: 'bg-zeze-or/10 group-hover:bg-zeze-or/20',       ico: 'text-zeze-or',   href: '/rendez-vous' },
              { titre: 'Mon stock',           sous: 'Acheter / Vendre',        icone: Package,      couleur: 'bg-emerald-50 group-hover:bg-emerald-100',       ico: 'text-emerald-600', href: '/mon-stock' },
              { titre: 'Consultations',       sous: 'Historique global',        icone: Stethoscope,  couleur: 'bg-blue-50 group-hover:bg-blue-100',             ico: 'text-blue-500',  href: '/consultations' },
            ].map(({ titre, sous, icone: Icone, couleur, ico, href }) => (
              <button key={href} onClick={() => navigate(href)}
                className="carte text-left hover:border-zeze-vert/40 hover:shadow-sm transition-all group">
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

// ── Widget BC MAPA en attente (admin + stockiste) ─────────────────────────────
const WidgetBcMapa = () => {
  const navigate  = useNavigate();
  const { formatMontant } = useFormatMontant();
  const { data: bcs = [], isLoading } = useBonsCommandeMapa();

  const enAttente = bcs.filter((bc) => bc.statut === 'envoye' || bc.statut === 'livre_partiel');

  if (isLoading) return null;
  if (enAttente.length === 0) return null;

  const maintenant = new Date();
  const joursDepuis = (bc) => {
    const dateStr = bc.date_commande || bc.created_at || bc.createdAt;
    if (!dateStr) return null;
    const diff = maintenant - new Date(dateStr);
    const j = Math.floor(diff / (1000 * 60 * 60 * 24));
    return isNaN(j) ? null : j;
  };

  const STATUT = {
    envoye:        { label: 'Envoyé',           couleur: 'bg-blue-100 text-blue-700 border-blue-200' },
    livre_partiel: { label: 'Livraison partielle', couleur: 'bg-amber-100 text-amber-700 border-amber-200' },
  };

  const montantTotal = enAttente.reduce((s, bc) => {
    const lignes = typeof bc.lignes === 'string' ? JSON.parse(bc.lignes || '[]') : (bc.lignes || []);
    return s + lignes.reduce((ls, l) => ls + (l.quantite || 0) * (l.prix_unitaire || 0), 0);
  }, 0);

  const nbUrgent = enAttente.filter((bc) => { const j = joursDepuis(bc); return j !== null && j >= 7; }).length;

  return (
    <div className={`carte space-y-4 ${nbUrgent > 0 ? 'border-amber-300 bg-amber-50/20' : ''}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
          <Truck size={15} className={nbUrgent > 0 ? 'text-amber-600' : 'text-zeze-vert'} />
          Commandes MAPA en attente
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            nbUrgent > 0
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'
          }`}>
            {enAttente.length}
          </span>
        </h2>
        <button
          onClick={() => navigate('/bons-commande-mapa')}
          className="text-xs text-zeze-vert hover:underline font-medium">
          Voir tout →
        </button>
      </div>

      {nbUrgent > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-bouton text-xs text-amber-800">
          <AlertTriangle size={13} className="shrink-0" />
          {nbUrgent} commande{nbUrgent > 1 ? 's' : ''} sans livraison depuis plus de 7 jours
        </div>
      )}

      <div className="divide-y divide-bordure">
        {enAttente.slice(0, 5).map((bc) => {
          const jours = joursDepuis(bc);
          const cfg   = STATUT[bc.statut];
          const lignes = typeof bc.lignes === 'string' ? JSON.parse(bc.lignes || '[]') : (bc.lignes || []);
          const montantBc = lignes.reduce((s, l) => s + (l.quantite || 0) * (l.prix_unitaire || 0), 0);
          return (
            <div key={bc.id}
              className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-fond-secondaire px-1 rounded"
              onClick={() => navigate('/bons-commande-mapa')}>
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <p className="text-sm font-medium text-texte-principal">{bc.numero}</p>
                  <p className="text-xs text-texte-secondaire">
                    {bc.nom_stockiste_mapa || 'MAPA'}
                    {jours !== null && <> · il y a {jours} jour{jours > 1 ? 's' : ''}</>}
                    {jours !== null && jours >= 7 && <span className="ml-1 text-amber-600 font-medium">⚠</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {montantBc > 0 && (
                  <span className="text-sm font-medium text-texte-principal">{formatMontant(montantBc)}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.couleur}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {enAttente.length > 5 && (
        <p className="text-xs text-texte-secondaire text-center">
          + {enAttente.length - 5} autre{enAttente.length - 5 > 1 ? 's' : ''} commande{enAttente.length - 5 > 1 ? 's' : ''}
        </p>
      )}

      {montantTotal > 0 && (
        <div className="pt-1 border-t border-bordure flex justify-between text-xs text-texte-secondaire">
          <span>Montant total commandé</span>
          <span className="font-semibold text-texte-principal">{formatMontant(montantTotal)}</span>
        </div>
      )}
    </div>
  );
};

// ── Widget créances patients (admin + stockiste) ──────────────────────────────
const WidgetCreances = () => {
  const navigate = useNavigate();
  const { formatMontant } = useFormatMontant();
  const { data: factures = [], isLoading } = useQuery({
    queryKey: ['factures-creanciers'],
    queryFn: () => api.get('/factures/creanciers').then((r) => r.data),
  });

  if (isLoading || factures.length === 0) return null;

  const totalDu = factures.reduce((s, f) => s + f.montant_total - f.montant_paye, 0);
  const nbPatients = new Set(factures.map((f) => f.patient_id)).size;
  const hasAnciennesCreances = factures.some((f) => f.exercice?.statut === 'cloture');

  return (
    <button
      onClick={() => navigate('/facturation')}
      className="w-full text-left rounded-carte px-4 py-3 flex items-center justify-between transition-colors bg-red-50 border border-red-300 hover:bg-red-100"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle size={15} className="text-red-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">
            {formatMontant(totalDu)} dus par {nbPatients} patient{nbPatients > 1 ? 's' : ''}
            {hasAnciennesCreances && (
              <span className="ml-2 text-xs font-normal text-red-600">dont dettes d'exercices clôturés</span>
            )}
          </p>
          <p className="text-xs text-red-700">
            {factures.length} facture{factures.length > 1 ? 's' : ''} non soldée{factures.length > 1 ? 's' : ''} — voir onglet Créanciers
          </p>
        </div>
      </div>
      <span className="text-xs font-semibold text-red-700">Gérer →</span>
    </button>
  );
};

// ── Widget prêts et emprunts (admin + stockiste) ─────────────────────────────
const WidgetPretsEmprunts = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useStatsPretEmprunts();

  if (isLoading || !stats) return null;

  const nbPrets    = stats.prets_en_cours    ?? 0;
  const nbEmprunts = stats.emprunts_en_cours ?? 0;
  const total      = nbPrets + nbEmprunts;

  if (total === 0) return null;

  const alerte = total > 5;

  return (
    <button
      onClick={() => navigate('/prets-emprunts')}
      className={`w-full text-left rounded-carte px-4 py-3 flex items-center justify-between transition-colors ${
        alerte
          ? 'bg-orange-50 border border-orange-300 hover:bg-orange-100'
          : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          alerte ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          <ArrowRightLeft size={15} className={alerte ? 'text-orange-700' : 'text-blue-600'} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${alerte ? 'text-orange-800' : 'text-blue-800'}`}>
            {total} prêt{total > 1 ? 's/emprunt' : '/emprunt'}{total > 1 ? 's' : ''} en cours
            {alerte && <span className="ml-2 text-xs font-normal">(attention : volume élevé)</span>}
          </p>
          <p className={`text-xs ${alerte ? 'text-orange-700' : 'text-blue-700'}`}>
            {nbPrets > 0 && `${nbPrets} prêt${nbPrets > 1 ? 's' : ''} accordé${nbPrets > 1 ? 's' : ''}`}
            {nbPrets > 0 && nbEmprunts > 0 && ' · '}
            {nbEmprunts > 0 && `${nbEmprunts} emprunt${nbEmprunts > 1 ? 's' : ''} en cours`}
          </p>
        </div>
      </div>
      <span className={`text-xs font-semibold ${alerte ? 'text-orange-700' : 'text-blue-700'}`}>
        Gérer →
      </span>
    </button>
  );
};

// ── Widget alertes stock (admin + stockiste) ──────────────────────────────────
const WidgetAlertesStock = () => {
  const navigate = useNavigate();
  const { data: alertes = [], isLoading } = useAlertesStock();

  if (isLoading || alertes.length === 0) return null;

  const ruptures = alertes.filter((p) => p.type_alerte === 'rupture');
  const basStock = alertes.filter((p) => p.type_alerte === 'bas');

  return (
    <div className="space-y-2">
      {ruptures.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-carte px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-600" />
              <p className="text-sm font-semibold text-red-800">
                Rupture de stock — {ruptures.length} produit{ruptures.length > 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigate('/stock')} className="text-xs text-red-700 font-semibold hover:underline">
              Gérer →
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ruptures.map((p) => (
              <span key={p.id} className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                {p.nom}
              </span>
            ))}
          </div>
        </div>
      )}
      {basStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-carte px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-orange-600" />
              <p className="text-sm font-semibold text-orange-800">
                Stock bas — {basStock.length} produit{basStock.length > 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigate('/stock')} className="text-xs text-orange-700 font-semibold hover:underline">
              Gérer →
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {basStock.map((p) => (
              <span key={p.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                {p.nom} ({p.quantite_stock}/{p.seuil_alerte})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Dashboard standard (admin, stockiste, secrétaire) ────────────────────────
const DashboardStandard = ({ utilisateur }) => {
  const navigate = useNavigate();
  const { formatMontant } = useFormatMontant();
  const { data: stats, isLoading } = useStats();
  const { data: rdvs = [], isLoading: rdvLoading } = useRdvAujourdhui();
  const estStockisteOuAdmin = ['administrateur', 'stockiste'].includes(utilisateur?.role);
  const { data: gainsDelegues = [] } = useGainsDelegues(estStockisteOuAdmin);
  const { data: ventesAttente = [] } = useVentesEnAttente(estStockisteOuAdmin);
  const nbVentesAttente = ventesAttente.length;
  const { data: exerciceData } = useExerciceActuel();

  // Calculs de répartition (levés ici pour être réutilisés dans plusieurs sections)
  const r = stats?.repartition;
  const caDelegueMois      = gainsDelegues.reduce((s, g) => s + g.ventes_mois, 0);
  const gainsIndirectsMois = gainsDelegues.reduce((s, g) => s + g.commission_stockiste_mois, 0);
  const gainsDelegueMois   = gainsDelegues.reduce((s, g) => s + g.gain_delegue_mois, 0);
  const mapaDelegueMois    = gainsDelegues.reduce((s, g) => s + g.part_mapa_mois, 0);
  const gainsTotaux = r ? (r.gains_directs + (r.gains_indirects ?? gainsIndirectsMois)) : 0;
  const mapaTotal   = r ? (r.part_mapa_direct + (r.mapa_indirects ?? mapaDelegueMois)) : 0;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CarteKPI titre="Patients actifs" valeur={val(stats?.patients_actifs)} icone={Users} couleur="bg-zeze-vert" onClick={() => navigate('/patients')} />
        <CarteKPI
          titre="Consultations aujourd'hui"
          valeur={val(stats?.consultations_aujourd_hui)}
          icone={Stethoscope}
          couleur="bg-blue-500"
          sous={stats ? `${stats.consultations_mois} ce mois` : null}
        />
        <CarteKPI titre="Rendez-vous aujourd'hui" valeur={val(stats?.rdv_aujourd_hui)} icone={Calendar} couleur="bg-zeze-or" onClick={() => navigate('/rendez-vous')} />
        <CarteKPI
          titre={stats?.ca_filtre ? 'Mon CA du mois' : 'CA du mois'}
          valeur={isLoading ? '…' : stats ? formatMontant(stats.ca_mois) : '—'}
          icone={TrendingUp}
          couleur="bg-emerald-600"
          onClick={() => navigate('/statistiques')}
        />
      </div>

      {/* KPI financiers (stockiste / admin) */}
      {estStockisteOuAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CarteKPI
            titre="Ventes exercice"
            valeur={
              exerciceData?.exercice
                ? formatMontant(
                    utilisateur?.role === 'stockiste' && r
                      ? (r.ca_direct ?? 0) + (r.ca_appro_exercice ?? 0)
                      : exerciceData.ca_accumule ?? 0
                  )
                : '—'
            }
            icone={TrendingUp}
            couleur="bg-slate-600"
            sous={utilisateur?.role === 'stockiste' ? 'Mon CA depuis l\'ouverture de l\'exercice' : 'CA cumulé depuis l\'ouverture'}
          />
          <CarteKPI
            titre="Commission stockiste"
            valeur={isLoading ? '…' : formatMontant(gainsTotaux)}
            icone={TrendingUp}
            couleur="bg-zeze-or"
            sous="Gains directs + via revendeurs (exercice)"
          />
          <CarteKPI
            titre="Commissions revendeurs"
            valeur={isLoading ? '…' : formatMontant(gainsDelegueMois)}
            icone={ShoppingBag}
            couleur="bg-blue-600"
            sous="Part versée aux délégués (exercice)"
          />
          <CarteKPI
            titre="Net à verser MAPA"
            valeur={isLoading ? '…' : formatMontant(mapaTotal)}
            icone={Package}
            couleur="bg-zeze-vert"
            sous="Part MAPA (directs + revendeurs)"
          />
        </div>
      )}

      {/* Détail CA exercice — stockiste uniquement */}
      {utilisateur?.role === 'stockiste' && (
        <div>
          <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
            CA exercice en cours — détail
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CarteKPI
              titre="Mon CA exercice"
              valeur={isLoading ? '…' : r ? formatMontant((r.ca_direct ?? 0) + (r.ca_appro_exercice ?? 0)) : '—'}
              icone={TrendingUp}
              couleur="bg-emerald-500"
              sous="Mes ventes directes + appros délégués"
            />
            <CarteKPI
              titre="CA patient de mes délégués"
              valeur={isLoading ? '…' : r?.ca_revendeurs_exercice != null ? formatMontant(r.ca_revendeurs_exercice) : '—'}
              icone={Users}
              couleur="bg-blue-500"
              sous="Informatif — non cumulable avec Mon CA"
            />
          </div>
        </div>
      )}

      {/* Widget exercice comptable */}
      {estStockisteOuAdmin && <WidgetExercice />}

      {/* Widget BC MAPA en attente de livraison */}
      {estStockisteOuAdmin && <WidgetBcMapa />}

      {/* Widget créances patients non soldées */}
      {estStockisteOuAdmin && <WidgetCreances />}

      {/* Widget prêts et emprunts en cours */}
      {estStockisteOuAdmin && <WidgetPretsEmprunts />}

      {/* Alertes stock — admin et secrétaire uniquement (accès à /stock) */}
      {['administrateur', 'secretaire'].includes(utilisateur?.role) && <WidgetAlertesStock />}

      {/* Répartition financière — stockiste uniquement */}
      {estStockisteOuAdmin && !isLoading && r && (() => {
        const caTotal = (r.ca_direct ?? 0) + (r.ca_appro_exercice ?? 0);
        const gainsIndirectsAff = r.gains_indirects ?? gainsIndirectsMois;
        const mapaIndirectsAff  = r.mapa_indirects  ?? mapaDelegueMois;

        return (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide">
              Répartition financière — exercice en cours
            </h2>

            {/* KPI synthèse globale */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CarteKPI
                titre="CA exercice en cours"
                valeur={formatMontant(caTotal)}
                icone={TrendingUp}
                couleur="bg-slate-500"
                sous={`Directs : ${formatMontant(r.ca_direct)}  ·  Appros : ${formatMontant(r.ca_appro_exercice ?? 0)}`}
              />
              <CarteKPI
                titre={r.taux_direct != null ? 'Vos gains totaux' : 'Gains des stockistes'}
                valeur={formatMontant(gainsTotaux)}
                icone={TrendingUp}
                couleur="bg-zeze-or"
                sous={r.taux_direct != null
                  ? `Directs (${r.taux_direct}%) : ${formatMontant(r.gains_directs)}  ·  Reversés : ${formatMontant(gainsIndirectsAff)}`
                  : `Consultations : ${formatMontant(r.gains_directs)}  ·  Via revendeurs : ${formatMontant(gainsIndirectsAff)}`}
              />
              <CarteKPI
                titre={r.taux_mapa != null ? `Part versée à MAPA (${r.taux_mapa}%)` : 'Part versée à MAPA'}
                valeur={formatMontant(mapaTotal)}
                icone={ShoppingBag}
                couleur="bg-zeze-vert"
                sous={`Directs : ${formatMontant(r.part_mapa_direct)}  ·  Appros : ${formatMontant(mapaIndirectsAff)}`}
              />
            </div>

            {/* Ligne de détail : ventes directes vs revendeurs */}
            <div className="carte p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-bordure bg-fond-secondaire/60">
                <h3 className="text-sm font-semibold text-texte-principal">Détail de la répartition</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-fond-secondaire border-b border-bordure">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-texte-secondaire text-xs">Source</th>
                    <th className="text-right px-4 py-2 font-semibold text-texte-secondaire text-xs">Achats stk.</th>
                    <th className="text-right px-4 py-2 font-semibold text-texte-secondaire text-xs hidden sm:table-cell">Part MAPA</th>
                    <th className="text-right px-4 py-2 font-semibold text-texte-secondaire text-xs">Vos gains</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Ligne ventes directes */}
                  <tr className="hover:bg-fond-secondaire/50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-texte-principal text-xs">Ventes directes</p>
                      <p className="text-xs text-texte-secondaire">Ordonnances que vous avez créées</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-texte-secondaire">{formatMontant(r.ca_direct)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-vert font-semibold hidden sm:table-cell">
                      {formatMontant(r.part_mapa_direct)}
                      {r.taux_mapa != null && <span className="text-texte-secondaire font-normal"> ({r.taux_mapa}%)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-or font-semibold">
                      {formatMontant(r.gains_directs)}
                      {r.taux_direct != null && <span className="text-texte-secondaire font-normal"> ({r.taux_direct}%)</span>}
                    </td>
                  </tr>

                  {/* Lignes par revendeur */}
                  {gainsDelegues.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs text-texte-secondaire italic text-center">
                        Aucune vente revendeur sur cet exercice
                      </td>
                    </tr>
                  ) : gainsDelegues.map((g) => (
                    <tr key={g.delegue.id} className="hover:bg-fond-secondaire/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-texte-principal text-xs">
                          {g.delegue.prenom} {g.delegue.nom}
                        </p>
                        <p className="text-xs text-texte-secondaire">
                          {`Commission : rev. ${g.taux_delegue ?? 15}% · stk. ${g.taux_commission - (g.taux_delegue ?? 15)}%`}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-texte-secondaire">{formatMontant(g.ventes_mois)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-vert font-semibold hidden sm:table-cell">
                        {formatMontant(g.part_mapa_mois)}
                        {r.taux_mapa != null && <span className="text-texte-secondaire font-normal"> ({r.taux_mapa}%)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-or font-semibold">
                        {formatMontant(g.commission_stockiste_mois)}
                        
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Ligne totaux */}
                <tfoot className="border-t-2 border-gray-300 bg-fond-secondaire">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-xs text-texte-principal">Total</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-texte-principal">{formatMontant(caTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-zeze-vert hidden sm:table-cell">{formatMontant(mapaTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-zeze-or">{formatMontant(gainsTotaux)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Note revendeurs */}
              {gainsDelegues.length > 0 && (
                <div className="px-4 py-2 border-t border-bordure bg-blue-50">
                  <p className="text-xs text-blue-700">
                    Gains revendeurs (exercice) : <strong>{formatMontant(gainsDelegueMois)}</strong> — versés directement aux revendeurs, non inclus dans vos gains.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {estStockisteOuAdmin && nbVentesAttente > 0 && (
        <button onClick={() => navigate('/facturation')}
          className="w-full bg-yellow-50 border border-yellow-300 rounded-carte px-4 py-3 flex items-center justify-between hover:bg-yellow-100 transition-colors text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <ShoppingBag size={15} className="text-yellow-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                {nbVentesAttente} vente{nbVentesAttente > 1 ? 's' : ''} directe{nbVentesAttente > 1 ? 's' : ''} en attente de validation
              </p>
              <p className="text-xs text-yellow-700">Cliquez pour valider et enregistrer le paiement</p>
            </div>
          </div>
          <span className="text-xs text-yellow-700 font-semibold">Valider →</span>
        </button>
      )}

      {!isLoading && stats?.factures_a_relancer > 0 && (
        <button onClick={() => navigate('/facturation')}
          className="w-full bg-red-50 border border-red-200 rounded-carte px-4 py-3 flex items-center justify-between hover:bg-red-100 transition-colors text-left">
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

      {/* Section graphiques — admin et stockiste */}
      {estStockisteOuAdmin && <SectionChartsAnalytiques />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* RDV du jour */}
        <div className="carte">
          <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
            <Calendar size={15} className="text-zeze-or" />
            Rendez-vous du jour
            {rdvActifs.length > 0 && <span className="ml-auto text-xs text-texte-secondaire font-normal">{rdvActifs.length} RDV</span>}
          </h2>
          {rdvLoading ? (
            <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-4 border-zeze-vert border-t-transparent" /></div>
          ) : rdvActifs.length === 0 ? (
            <div className="text-center py-6 text-texte-secondaire">
              <Calendar size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun rendez-vous aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rdvActifs.map((rdv) => {
                const cfg = STATUT_RDV[rdv.statut] || STATUT_RDV.planifie;
                const heure = new Date(rdv.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={rdv.id} className="flex items-center gap-3 p-2 rounded-bouton hover:bg-fond-secondaire cursor-pointer transition-colors"
                    onClick={() => navigate(`/patients/${rdv.patient_id}`)}>
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-sm font-bold text-texte-principal font-mono">{heure}</p>
                      <p className="text-xs text-texte-secondaire">{rdv.duree_minutes} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-texte-principal truncate">{rdv.patient?.prenom} {rdv.patient?.nom}</p>
                      <p className="text-xs text-texte-secondaire truncate">{rdv.motif}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rdv.patient?.telephone && (
                        <a href={`tel:${rdv.patient.telephone}`} onClick={(e) => e.stopPropagation()}
                          className="p-1 text-zeze-vert hover:bg-zeze-vert/10 rounded">
                          <Phone size={13} />
                        </a>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.couleur} whitespace-nowrap`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accès rapides */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal">Accès rapides</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { titre: 'Nouveau patient',     sous: 'Créer un dossier',      icone: Users,       couleur: 'bg-zeze-vert/10 group-hover:bg-zeze-vert/20', ico: 'text-zeze-vert', href: '/patients/nouveau' },
              { titre: 'Nouveau rendez-vous', sous: 'Planifier un RDV',      icone: Calendar,    couleur: 'bg-zeze-or/10 group-hover:bg-zeze-or/20',     ico: 'text-zeze-or',   href: '/rendez-vous' },
              { titre: 'Consultations',       sous: 'Historique global',      icone: Stethoscope, couleur: 'bg-blue-50 group-hover:bg-blue-100',           ico: 'text-blue-500',  href: '/consultations' },
              { titre: 'Stock produits',      sous: 'Gérer les inventaires', icone: TrendingUp,  couleur: 'bg-amber-50 group-hover:bg-amber-100',         ico: 'text-amber-600', href: '/stock' },
            ].map(({ titre, sous, icone: Icone, couleur, ico, href }) => (
              <button key={href} onClick={() => navigate(href)}
                className="carte text-left hover:border-zeze-vert/40 hover:shadow-sm transition-all group">
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

// ── Export ────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { utilisateur, aLeRole } = useAuth();
  const estDelegue = aLeRole('delegue');

  return estDelegue
    ? <DashboardDelegue utilisateur={utilisateur} />
    : <DashboardStandard utilisateur={utilisateur} />;
};

export default DashboardPage;
