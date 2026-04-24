import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useStatsStockDelegue, useGainsDelegues, useVentesEnAttente } from '../hooks/useStockDelegue';
import {
  Users, Stethoscope, Calendar, TrendingUp, Bell,
  Clock, CheckCircle, AlertCircle, Phone,
  ShoppingCart, ShoppingBag, Package,
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

// ── Dashboard délégué ─────────────────────────────────────────────────────────
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
            titre="Ventes directes"
            valeur={valMontant(stockStats?.ventes_mois)}
            icone={ShoppingBag}
            couleur="bg-zeze-or"
            sous={stockStats ? `Mon gain : ${formatMontant(stockStats.gain_delegue_mois)}` : null}
            onClick={() => navigate('/mon-stock')}
          />
          <CarteKPI
            titre="Mes gains (15% des ventes)"
            valeur={valMontant(stockStats?.gain_delegue_mois)}
            icone={TrendingUp}
            couleur="bg-emerald-600"
            sous="Sur vos ventes directes ce mois"
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

        {/* Accès rapides délégué */}
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

// ── Dashboard standard (admin, stockiste, secrétaire) ────────────────────────
const DashboardStandard = ({ utilisateur }) => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useStats();
  const { data: rdvs = [], isLoading: rdvLoading } = useRdvAujourdhui();
  const estStockisteOuAdmin = ['administrateur', 'stockiste'].includes(utilisateur?.role);
  const { data: gainsDelegues = [] } = useGainsDelegues(estStockisteOuAdmin);
  const { data: ventesAttente = [] } = useVentesEnAttente(estStockisteOuAdmin);
  const nbVentesAttente = ventesAttente.length;

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

      {/* Répartition financière — stockiste uniquement */}
      {estStockisteOuAdmin && !isLoading && stats?.repartition && (() => {
        const r = stats.repartition;
        const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

        // Agrégats ventes délégués
        const caDelegueMois        = gainsDelegues.reduce((s, g) => s + g.ventes_mois, 0);
        const gainsIndirectsMois   = gainsDelegues.reduce((s, g) => s + g.commission_stockiste_mois, 0);
        const gainsDelegueMois     = gainsDelegues.reduce((s, g) => s + g.gain_delegue_mois, 0);
        const mapaDelegueMois      = gainsDelegues.reduce((s, g) => s + g.part_mapa_mois, 0);

        // Totaux combinés
        const caTotal       = r.ca_direct + caDelegueMois;
        const gainsTotaux   = r.gains_directs + gainsIndirectsMois;
        const mapaTotal     = r.part_mapa_direct + mapaDelegueMois;

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
                sous={`Directs : ${fmt(r.ca_direct)}  ·  Délégués : ${fmt(caDelegueMois)}`}
              />
              <CarteKPI
                titre="Vos gains totaux"
                valeur={fmt(gainsTotaux)}
                icone={TrendingUp}
                couleur="bg-zeze-or"
                sous={`Directs (${r.taux_direct}%) : ${fmt(r.gains_directs)}  ·  Reversés (${r.taux_indirect}%) : ${fmt(gainsIndirectsMois)}`}
              />
              <CarteKPI
                titre={`Part versée à MAPA (${r.taux_mapa}%)`}
                valeur={fmt(mapaTotal)}
                icone={ShoppingBag}
                couleur="bg-zeze-vert"
                sous={`Directs : ${fmt(r.part_mapa_direct)}  ·  Délégués : ${fmt(mapaDelegueMois)}`}
              />
            </div>

            {/* Ligne de détail : ventes directes vs délégués */}
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
                      <span className="text-texte-secondaire font-normal"> ({r.taux_mapa}%)</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-or font-semibold">
                      {fmt(r.gains_directs)}
                      <span className="text-texte-secondaire font-normal"> ({r.taux_direct}%)</span>
                    </td>
                  </tr>

                  {/* Lignes par délégué */}
                  {gainsDelegues.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs text-texte-secondaire italic text-center">
                        Aucune vente délégué ce mois
                      </td>
                    </tr>
                  ) : gainsDelegues.map((g) => (
                    <tr key={g.delegue.id} className="hover:bg-fond-secondaire/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-texte-principal text-xs">
                          {g.delegue.prenom} {g.delegue.nom}
                        </p>
                        <p className="text-xs text-texte-secondaire">Commission reversée (délégué 15% · vous {r.taux_indirect}%)</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-texte-secondaire">{fmt(g.ventes_mois)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-vert font-semibold hidden sm:table-cell">
                        {fmt(g.part_mapa_mois)}
                        <span className="text-texte-secondaire font-normal"> ({r.taux_mapa}%)</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-or font-semibold">
                        {fmt(g.commission_stockiste_mois)}
                        <span className="text-texte-secondaire font-normal"> ({r.taux_indirect}%)</span>
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

              {/* Note délégués */}
              {gainsDelegues.length > 0 && (
                <div className="px-4 py-2 border-t border-bordure bg-blue-50">
                  <p className="text-xs text-blue-700">
                    Gains délégués (15%) ce mois : <strong>{fmt(gainsDelegueMois)}</strong> — versés directement aux délégués, non inclus dans vos gains.
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
