import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useStatsStockDelegue, useGainsDelegues, useVentesEnAttente } from '../hooks/useStockDelegue';
import { useExerciceActuel, useBilanExercice } from '../hooks/useExercices';
import { useAlertesStock } from '../hooks/useStock';
import {
  Users, Stethoscope, Calendar, TrendingUp, Bell,
  Clock, CheckCircle, AlertCircle, Phone,
  ShoppingCart, ShoppingBag, Package, BookOpen, AlertTriangle,
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
    ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n / 1_000_000) + ' M FCFA'
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

// ── Widget exercice comptable (admin + stockiste) ─────────────────────────────
const WidgetExercice = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useExerciceActuel();
  const exercice = data?.exercice;
  const { data: bilanData, isLoading: bilanLoading } = useBilanExercice(exercice?.id);

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

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
          <p className="text-sm font-bold text-texte-principal">{fmt(data.ca_accumule)}</p>
          <p className="text-xs text-texte-secondaire">
            Fact. {fmt(data.ca_factures)} · Dél. {fmt(data.ca_delegues)}
          </p>
        </div>
        <div>
          <p className="text-xs text-texte-secondaire">Commissions dues</p>
          <p className="text-sm font-bold text-zeze-or">
            {bilanLoading ? '…' : commissionsTotal !== null ? fmt(commissionsTotal) : '—'}
          </p>
          {!bilanLoading && bilan && (
            <p className="text-xs text-texte-secondaire">
              Stock. {fmt(bilan.commissions_stockistes)} · Dél. {fmt(bilan.commissions_delegues)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-texte-secondaire">Net MAPA</p>
          <p className="text-sm font-bold text-zeze-vert">
            {bilanLoading ? '…' : bilan ? fmt(bilan.net_mapa) : '—'}
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

      {/* KPI ligne 2 : stock personnel */}
      <div>
        <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
          Mon stock ce mois
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CarteKPI
            titre="Achats (approvisionnement)"
            valeur={valMontant(stockStats?.achats_mois)}
            icone={ShoppingCart}
            couleur="bg-blue-600"
            sous="Montant total dépensé ce mois"
            onClick={() => navigate('/mon-stock')}
          />
          <CarteKPI
            titre="Ventes directes (stock)"
            valeur={valMontant(stockStats?.ventes_mois)}
            icone={ShoppingBag}
            couleur="bg-zeze-or"
            sous={stockStats ? `Gain validé : ${formatMontant(stockStats.gain_delegue_mois)}` : null}
            onClick={() => navigate('/mon-stock')}
          />
          <CarteKPI
            titre="Mes gains totaux (15%)"
            valeur={isLoading || stockLoading ? '…' : formatMontant((stats?.gains_ordonnances_mois ?? 0) + (stockStats?.gain_delegue_mois ?? 0))}
            icone={TrendingUp}
            couleur="bg-emerald-600"
            sous={isLoading || stockLoading ? null : `Ordonnances : ${formatMontant(stats?.gains_ordonnances_mois ?? 0)} · Stock : ${formatMontant(stockStats?.gain_delegue_mois ?? 0)}`}
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
  const gainsTotaux        = r ? (r.gains_directs + gainsIndirectsMois) : 0;
  const mapaTotal          = r ? (r.part_mapa_direct + mapaDelegueMois) : 0;

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
            valeur={exerciceData ? formatMontant(exerciceData.ca_accumule) : '…'}
            icone={TrendingUp}
            couleur="bg-slate-600"
            sous="CA cumulé depuis l'ouverture"
          />
          <CarteKPI
            titre="Commission stockiste"
            valeur={isLoading ? '…' : formatMontant(gainsTotaux)}
            icone={TrendingUp}
            couleur="bg-zeze-or"
            sous="Gains directs + via revendeurs ce mois"
          />
          <CarteKPI
            titre="Commissions revendeurs"
            valeur={isLoading ? '…' : formatMontant(gainsDelegueMois)}
            icone={ShoppingBag}
            couleur="bg-blue-600"
            sous="Part versée aux délégués ce mois"
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

      {/* Widget exercice comptable */}
      {estStockisteOuAdmin && <WidgetExercice />}

      {/* Alertes stock — admin et secrétaire uniquement (accès à /stock) */}
      {['administrateur', 'secretaire'].includes(utilisateur?.role) && <WidgetAlertesStock />}

      {/* Répartition financière — stockiste uniquement */}
      {estStockisteOuAdmin && !isLoading && r && (() => {
        const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
        const caTotal = r.ca_direct + caDelegueMois;

        return (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide">
              Répartition financière du mois
            </h2>

            {/* KPI synthèse globale */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CarteKPI
                titre="CA total du mois"
                valeur={fmt(caTotal)}
                icone={TrendingUp}
                couleur="bg-slate-500"
                sous={`Directs : ${fmt(r.ca_direct)}  ·  Revendeurs : ${fmt(caDelegueMois)}`}
              />
              <CarteKPI
                titre={r.taux_direct != null ? 'Vos gains totaux' : 'Gains des stockistes'}
                valeur={fmt(gainsTotaux)}
                icone={TrendingUp}
                couleur="bg-zeze-or"
                sous={r.taux_direct != null
                  ? `Directs (${r.taux_direct}%) : ${fmt(r.gains_directs)}  ·  Reversés (${r.taux_indirect}%) : ${fmt(gainsIndirectsMois)}`
                  : `Consultations : ${fmt(r.gains_directs)}  ·  Via revendeurs : ${fmt(gainsIndirectsMois)}`}
              />
              <CarteKPI
                titre={r.taux_mapa != null ? `Part versée à MAPA (${r.taux_mapa}%)` : 'Part versée à MAPA'}
                valeur={fmt(mapaTotal)}
                icone={ShoppingBag}
                couleur="bg-zeze-vert"
                sous={`Directs : ${fmt(r.part_mapa_direct)}  ·  Revendeurs : ${fmt(mapaDelegueMois)}`}
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
                    <th className="text-right px-4 py-2 font-semibold text-texte-secondaire text-xs">CA</th>
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
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-texte-secondaire">{fmt(r.ca_direct)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-vert font-semibold hidden sm:table-cell">
                      {fmt(r.part_mapa_direct)}
                      {r.taux_mapa != null && <span className="text-texte-secondaire font-normal"> ({r.taux_mapa}%)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-or font-semibold">
                      {fmt(r.gains_directs)}
                      {r.taux_direct != null && <span className="text-texte-secondaire font-normal"> ({r.taux_direct}%)</span>}
                    </td>
                  </tr>

                  {/* Lignes par revendeur */}
                  {gainsDelegues.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs text-texte-secondaire italic text-center">
                        Aucune vente revendeur ce mois
                      </td>
                    </tr>
                  ) : gainsDelegues.map((g) => (
                    <tr key={g.delegue.id} className="hover:bg-fond-secondaire/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-texte-principal text-xs">
                          {g.delegue.prenom} {g.delegue.nom}
                        </p>
                        <p className="text-xs text-texte-secondaire">
                          {r.taux_indirect != null
                            ? `Commission reversée (revendeur 15% · vous ${r.taux_indirect}%)`
                            : `Commission reversée (revendeur 15% · stockiste ${g.taux_commission - 15}%)`}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-texte-secondaire">{fmt(g.ventes_mois)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-vert font-semibold hidden sm:table-cell">
                        {fmt(g.part_mapa_mois)}
                        {r.taux_mapa != null && <span className="text-texte-secondaire font-normal"> ({r.taux_mapa}%)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-or font-semibold">
                        {fmt(g.commission_stockiste_mois)}
                        {r.taux_indirect != null && <span className="text-texte-secondaire font-normal"> ({r.taux_indirect}%)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Ligne totaux */}
                <tfoot className="border-t-2 border-gray-300 bg-fond-secondaire">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-xs text-texte-principal">Total</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-texte-principal">{fmt(caTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-zeze-vert hidden sm:table-cell">{fmt(mapaTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-zeze-or">{fmt(gainsTotaux)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Note revendeurs */}
              {gainsDelegues.length > 0 && (
                <div className="px-4 py-2 border-t border-bordure bg-blue-50">
                  <p className="text-xs text-blue-700">
                    Gains revendeurs (15%) ce mois : <strong>{fmt(gainsDelegueMois)}</strong> — versés directement aux revendeurs, non inclus dans vos gains.
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
