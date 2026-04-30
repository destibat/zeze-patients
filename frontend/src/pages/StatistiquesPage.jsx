import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useExercices, useBilanExercice } from '../hooks/useExercices';
import { TrendingUp, Users, Stethoscope, Package, ChevronLeft, ChevronRight, Printer, BookOpen } from 'lucide-react';

const PERIODES = [
  { val: 'annee',     label: 'Année' },
  { val: 'mois',      label: 'Mois' },
  { val: 'semaine',   label: 'Semaine' },
  { val: 'jour',      label: 'Jour' },
  { val: 'intervalle',label: 'Intervalle' },
];

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const useStatsDetaillees = (params) =>
  useQuery({
    queryKey: ['stats-detaillees', params],
    queryFn: () => api.get('/stats/detaillees', { params }).then((r) => r.data),
    keepPreviousData: true,
    enabled: !!params,
  });

const formatMontant = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' k';
  return String(n || 0);
};

const toDateInput = (d) => d.toISOString().split('T')[0];

const BarreChart = ({ donnees, cleValeur, couleur, labelFormatter }) => {
  const max = Math.max(...donnees.map((d) => d[cleValeur] || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-32 overflow-x-auto">
      {donnees.map((d, i) => {
        const h = Math.round(((d[cleValeur] || 0) / max) * 100);
        return (
          <div key={i} className="flex-1 min-w-[8px] flex flex-col items-center gap-1 group relative">
            {d[cleValeur] > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-texte-principal text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {labelFormatter ? labelFormatter(d[cleValeur]) : d[cleValeur]}
              </div>
            )}
            <div className="w-full flex items-end" style={{ height: '112px' }}>
              <div
                className={`w-full rounded-t transition-all ${couleur}`}
                style={{ height: `${h}%`, minHeight: d[cleValeur] > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-xs text-texte-secondaire truncate max-w-full">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const CAChart = ({ donnees }) => {
  const max = Math.max(...donnees.map((d) => d.facture || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-32 overflow-x-auto">
      {donnees.map((d, i) => {
        const hF = Math.round(((d.facture || 0) / max) * 100);
        const hE = Math.round(((d.encaisse || 0) / max) * 100);
        return (
          <div key={i} className="flex-1 min-w-[8px] flex flex-col items-center gap-1 group relative">
            {d.facture > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-texte-principal text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                {formatMontant(d.facture)} FCFA
              </div>
            )}
            <div className="w-full flex items-end gap-0.5" style={{ height: '112px' }}>
              <div className="flex-1 rounded-t bg-zeze-vert/30" style={{ height: `${hF}%`, minHeight: d.facture > 0 ? '4px' : '0' }} />
              <div className="flex-1 rounded-t bg-zeze-vert" style={{ height: `${hE}%`, minHeight: d.encaisse > 0 ? '4px' : '0' }} />
            </div>
            <span className="text-xs text-texte-secondaire truncate max-w-full">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const DonutSexe = ({ donnees }) => {
  const total = donnees.reduce((s, d) => s + parseInt(d.total), 0);
  if (total === 0) return <p className="text-sm text-texte-secondaire italic">Aucune donnée</p>;
  const couleurs = { masculin: '#1976D2', feminin: '#7B1FA2', autre: '#757575' };
  const labels = { masculin: 'Masculin', feminin: 'Féminin', autre: 'Autre' };
  return (
    <div className="space-y-2">
      {donnees.map((d) => {
        const pct = Math.round((parseInt(d.total) / total) * 100);
        return (
          <div key={d.sexe} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-texte-principal">{labels[d.sexe] || d.sexe}</span>
              <span className="font-semibold text-texte-principal">{d.total} <span className="text-texte-secondaire font-normal">({pct}%)</span></span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: couleurs[d.sexe] || '#9E9E9E' }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-texte-secondaire text-right">Total : {total} patients</p>
    </div>
  );
};

const FiltresAnnee = ({ annee, setAnnee }) => {
  const a = new Date().getFullYear();
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setAnnee((v) => v - 1)} className="p-1 rounded hover:bg-fond-secondaire"><ChevronLeft size={16} /></button>
      <select value={annee} onChange={(e) => setAnnee(parseInt(e.target.value))} className="champ-input w-28">
        {Array.from({ length: 5 }, (_, i) => a - i).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={() => setAnnee((v) => Math.min(v + 1, a))} className="p-1 rounded hover:bg-fond-secondaire" disabled={annee >= a}><ChevronRight size={16} /></button>
    </div>
  );
};

const FiltresMois = ({ annee, setAnnee, mois, setMois }) => {
  const now = new Date();
  const avancer = () => {
    if (mois === 12) { setMois(1); setAnnee((v) => v + 1); }
    else setMois((v) => v + 1);
  };
  const reculer = () => {
    if (mois === 1) { setMois(12); setAnnee((v) => v - 1); }
    else setMois((v) => v - 1);
  };
  const estFutur = annee > now.getFullYear() || (annee === now.getFullYear() && mois >= now.getMonth() + 1);
  return (
    <div className="flex items-center gap-2">
      <button onClick={reculer} className="p-1 rounded hover:bg-fond-secondaire"><ChevronLeft size={16} /></button>
      <select value={mois} onChange={(e) => setMois(parseInt(e.target.value))} className="champ-input w-32">
        {MOIS_LABELS.map((l, i) => <option key={i+1} value={i+1}>{l}</option>)}
      </select>
      <select value={annee} onChange={(e) => setAnnee(parseInt(e.target.value))} className="champ-input w-24">
        {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={avancer} disabled={estFutur} className="p-1 rounded hover:bg-fond-secondaire disabled:opacity-30"><ChevronRight size={16} /></button>
    </div>
  );
};

const FiltresSemaine = ({ semaine, setSemaine }) => {
  const getLundi = (d) => {
    const base = new Date(d);
    const jour = base.getDay() === 0 ? 6 : base.getDay() - 1;
    base.setDate(base.getDate() - jour);
    return base;
  };
  const lundi = getLundi(semaine ? new Date(semaine) : new Date());
  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const reculer = () => { const d = new Date(lundi); d.setDate(d.getDate() - 7); setSemaine(toDateInput(d)); };
  const avancer = () => { const d = new Date(lundi); d.setDate(d.getDate() + 7); setSemaine(toDateInput(d)); };
  return (
    <div className="flex items-center gap-2">
      <button onClick={reculer} className="p-1 rounded hover:bg-fond-secondaire"><ChevronLeft size={16} /></button>
      <span className="text-sm text-texte-principal font-medium px-2">{fmt(lundi)} – {fmt(dimanche)}</span>
      <button onClick={avancer} className="p-1 rounded hover:bg-fond-secondaire"><ChevronRight size={16} /></button>
      <input type="date" value={semaine} onChange={(e) => setSemaine(e.target.value)} className="champ-input w-40" />
    </div>
  );
};

const FiltresJour = ({ jour, setJour }) => {
  const reculer = () => { const d = new Date(jour); d.setDate(d.getDate() - 1); setJour(toDateInput(d)); };
  const avancer = () => { const d = new Date(jour); d.setDate(d.getDate() + 1); setJour(toDateInput(d)); };
  return (
    <div className="flex items-center gap-2">
      <button onClick={reculer} className="p-1 rounded hover:bg-fond-secondaire"><ChevronLeft size={16} /></button>
      <input type="date" value={jour} onChange={(e) => setJour(e.target.value)} className="champ-input w-40" />
      <button onClick={avancer} disabled={jour >= toDateInput(new Date())} className="p-1 rounded hover:bg-fond-secondaire disabled:opacity-30"><ChevronRight size={16} /></button>
    </div>
  );
};

const FiltresIntervalle = ({ debut, setDebut, fin, setFin }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm text-texte-secondaire">Du</span>
    <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="champ-input w-40" />
    <span className="text-sm text-texte-secondaire">au</span>
    <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} min={debut} className="champ-input w-40" />
  </div>
);

const libellePeriode = (data) => {
  if (!data) return '';
  const fmt = (s) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  if (data.periode === 'annee') return String(new Date(data.date_debut).getFullYear());
  if (data.periode === 'mois') return new Date(data.date_debut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (data.periode === 'semaine') return `Sem. du ${fmt(data.date_debut)} au ${new Date(data.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`;
  if (data.periode === 'jour') return fmt(data.date_debut);
  return `${fmt(data.date_debut)} → ${fmt(data.date_fin)}`;
};

const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtMontant = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

const KpiLigne = ({ label, valeur, emphasis, green, small }) => (
  <div className={`flex items-center justify-between ${small ? 'py-0.5' : 'py-1'}`}>
    <span className={`${small ? 'text-xs text-texte-secondaire pl-2' : 'text-sm text-texte-principal'}`}>{label}</span>
    <span className={`font-mono text-right ${emphasis ? (green ? 'text-zeze-vert font-bold' : 'text-texte-principal font-bold') : small ? 'text-xs text-texte-secondaire' : 'text-sm text-texte-principal font-medium'}`}>
      {valeur}
    </span>
  </div>
);

const ColonneExercice = ({ exercice, bilan, stats, isLoading }) => {
  if (!exercice) return null;
  const b = bilan?.bilan;
  const commissions = b ? (b.commissions_stockistes || 0) + (b.commissions_delegues || 0) : null;

  return (
    <div className="space-y-5">
      {/* En-tête exercice */}
      <div className="bg-zeze-vert/5 border border-zeze-vert/20 rounded-carte p-3">
        <p className="font-mono font-bold text-zeze-vert text-base">{exercice.numero}</p>
        <p className="text-xs text-texte-secondaire mt-0.5">
          {fmtDate(exercice.date_ouverture)} → {exercice.date_cloture ? fmtDate(exercice.date_cloture) : 'En cours'}
        </p>
        <p className="text-xs text-texte-secondaire">
          {bilan?.exercice?.duree_jours ?? '—'} jours ·{' '}
          <span className={exercice.statut === 'cloture' ? 'text-gray-500' : 'text-green-600 font-medium'}>
            {exercice.statut === 'cloture' ? 'Clôturé' : exercice.statut === 'rouvert' ? 'Rouvert' : 'Ouvert'}
          </span>
        </p>
      </div>

      {/* Indicateurs financiers */}
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">Financier</p>
        <KpiLigne label="CA total" valeur={isLoading ? '…' : b ? fmtMontant(b.ca_total) : '—'} emphasis />
        <KpiLigne label="Factures directes" valeur={isLoading ? '…' : b ? fmtMontant(b.ca_factures) : '—'} small />
        <KpiLigne label="Ventes revendeurs" valeur={isLoading ? '…' : b ? fmtMontant(b.ca_delegues) : '—'} small />
        <div className="border-t border-bordure my-1" />
        <KpiLigne label="Commissions" valeur={isLoading ? '…' : commissions !== null ? fmtMontant(commissions) : '—'} />
        <KpiLigne label="Stockistes" valeur={isLoading ? '…' : b ? fmtMontant(b.commissions_stockistes) : '—'} small />
        <KpiLigne label="Revendeurs" valeur={isLoading ? '…' : b ? fmtMontant(b.commissions_delegues) : '—'} small />
        <div className="border-t border-bordure my-1" />
        <KpiLigne label="Net MAPA" valeur={isLoading ? '…' : b ? fmtMontant(b.net_mapa) : '—'} emphasis green />
      </div>

      {/* Indicateurs activité */}
      <div className="space-y-0.5 border-t border-bordure pt-3">
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-1">Activité</p>
        <KpiLigne label="Consultations" valeur={isLoading ? '…' : stats?.total_consultations ?? '—'} />
        <KpiLigne label="Factures émises" valeur={isLoading ? '…' : b?.nb_factures ?? '—'} />
        <KpiLigne label="Ventes revendeurs" valeur={isLoading ? '…' : b?.nb_ventes_delegues ?? '—'} />
      </div>

      {/* Chart CA */}
      {stats?.ca_chart?.length > 0 && (
        <div className="border-t border-bordure pt-3">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-3">CA sur la période</p>
          <CAChart donnees={stats.ca_chart} />
          <div className="flex gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-texte-secondaire">
              <span className="w-3 h-3 rounded-sm bg-zeze-vert/40 inline-block" /> Facturé
            </span>
            <span className="flex items-center gap-1 text-xs text-texte-secondaire">
              <span className="w-3 h-3 rounded-sm bg-zeze-vert inline-block" /> Encaissé
            </span>
          </div>
        </div>
      )}

      {/* Top produits */}
      {b?.top_produits?.length > 0 && (
        <div className="border-t border-bordure pt-3">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Top produits</p>
          <div className="space-y-1.5">
            {b.top_produits.slice(0, 5).map((p, i) => {
              const max = b.top_produits[0]?.ca || 1;
              const pct = Math.round((p.ca / max) * 100);
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-texte-principal truncate max-w-[60%]">{p.nom}</span>
                    <span className="text-texte-secondaire">{p.quantite} u · {formatMontant(p.ca)} FCFA</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const StatsParExercice = () => {
  const { data: exercicesData, isLoading: exLoading } = useExercices({ limite: 50 });
  const exercices = exercicesData?.exercices ?? [];
  const [ex1Id, setEx1Id] = useState('');
  const [ex2Id, setEx2Id] = useState('');
  const today = toDateInput(new Date());

  const ex1 = exercices.find((e) => e.id === ex1Id) ?? null;
  const ex2 = exercices.find((e) => e.id === ex2Id) ?? null;

  const params1 = ex1 ? {
    periode: 'intervalle',
    debut: toDateInput(new Date(ex1.date_ouverture)),
    fin: ex1.date_cloture ? toDateInput(new Date(ex1.date_cloture)) : today,
  } : null;
  const params2 = ex2 ? {
    periode: 'intervalle',
    debut: toDateInput(new Date(ex2.date_ouverture)),
    fin: ex2.date_cloture ? toDateInput(new Date(ex2.date_cloture)) : today,
  } : null;

  const { data: bilan1, isLoading: b1Loading } = useBilanExercice(ex1Id || null);
  const { data: bilan2, isLoading: b2Loading } = useBilanExercice(ex2Id || null);
  const { data: stats1, isLoading: s1Loading } = useStatsDetaillees(params1);
  const { data: stats2, isLoading: s2Loading } = useStatsDetaillees(params2);

  return (
    <div className="space-y-6">
      {/* Sélecteurs */}
      <div className="carte space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">
              Exercice principal <span className="text-medical-critique">*</span>
            </label>
            <select
              value={ex1Id}
              onChange={(e) => setEx1Id(e.target.value)}
              className="champ-input"
              disabled={exLoading}
            >
              <option value="">— Sélectionner un exercice —</option>
              {exercices.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numero} · {e.statut === 'cloture' ? 'Clôturé' : e.statut === 'rouvert' ? 'Rouvert' : 'Ouvert'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">
              Exercice de comparaison <span className="text-texte-secondaire font-normal">(optionnel)</span>
            </label>
            <select
              value={ex2Id}
              onChange={(e) => setEx2Id(e.target.value)}
              className="champ-input"
              disabled={!ex1Id || exLoading}
            >
              <option value="">— Pas de comparaison —</option>
              {exercices.filter((e) => e.id !== ex1Id).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numero} · {e.statut === 'cloture' ? 'Clôturé' : e.statut === 'rouvert' ? 'Rouvert' : 'Ouvert'}
                </option>
              ))}
            </select>
          </div>
        </div>
        {ex1Id && (
          <div className="flex justify-end print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-sm px-3 py-1.5 border border-bordure rounded-bouton hover:bg-fond-secondaire text-texte-principal transition-colors"
            >
              <Printer size={14} />
              Imprimer / Exporter PDF
            </button>
          </div>
        )}
      </div>

      {/* Vide */}
      {!ex1Id && (
        <div className="carte text-center py-16">
          <BookOpen size={36} className="mx-auto mb-3 text-texte-secondaire opacity-30" />
          <p className="text-sm text-texte-secondaire">Sélectionnez un exercice pour afficher les statistiques</p>
          <p className="text-xs text-texte-secondaire mt-1 opacity-70">Ajoutez un second exercice pour comparer</p>
        </div>
      )}

      {/* Contenu */}
      {ex1Id && (
        <div className={`grid grid-cols-1 ${ex2Id ? 'xl:grid-cols-2' : ''} gap-6`}>
          <div className="carte">
            <ColonneExercice
              exercice={ex1}
              bilan={bilan1}
              stats={stats1}
              isLoading={b1Loading || s1Loading}
            />
          </div>
          {ex2Id && (
            <div className="carte">
              <ColonneExercice
                exercice={ex2}
                bilan={bilan2}
                stats={stats2}
                isLoading={b2Loading || s2Loading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatistiquesPage = () => {
  const { utilisateur } = useAuth();
  const estAdmin = utilisateur?.role === 'administrateur';
  const now = new Date();
  const [mode, setMode] = useState('calendaire');
  const [periode, setPeriode] = useState('annee');
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [semaine, setSemaine] = useState(toDateInput(now));
  const [jour, setJour] = useState(toDateInput(now));
  const [debut, setDebut] = useState(toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [fin, setFin] = useState(toDateInput(now));

  const params = (() => {
    if (periode === 'annee') return { periode, annee };
    if (periode === 'mois') return { periode, annee, mois };
    if (periode === 'semaine') return { periode, semaine };
    if (periode === 'jour') return { periode, jour };
    return { periode, debut, fin };
  })();

  const { data, isLoading } = useStatsDetaillees(params);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Statistiques</h1>
          {/* Toggle Calendaire / Par exercice */}
          <div className="flex rounded-bouton overflow-hidden border border-bordure">
            {[
              { val: 'calendaire', label: 'Calendaire' },
              { val: 'exercice',   label: 'Par exercice' },
            ].map((m) => (
              <button
                key={m.val}
                onClick={() => setMode(m.val)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  mode === m.val
                    ? 'bg-zeze-vert text-white font-medium'
                    : 'text-texte-secondaire hover:bg-fond-secondaire'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sélecteur de période — mode calendaire uniquement */}
        {mode === 'calendaire' && (
          <div className="carte py-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex rounded-bouton overflow-hidden border border-bordure">
                {PERIODES.map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setPeriode(p.val)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      periode === p.val
                        ? 'bg-zeze-vert text-white font-medium'
                        : 'text-texte-secondaire hover:bg-fond-secondaire'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                {periode === 'annee'     && <FiltresAnnee annee={annee} setAnnee={setAnnee} />}
                {periode === 'mois'      && <FiltresMois annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois} />}
                {periode === 'semaine'   && <FiltresSemaine semaine={semaine} setSemaine={setSemaine} />}
                {periode === 'jour'      && <FiltresJour jour={jour} setJour={setJour} />}
                {periode === 'intervalle'&& <FiltresIntervalle debut={debut} setDebut={setDebut} fin={fin} setFin={setFin} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mode Par exercice */}
      {mode === 'exercice' && <StatsParExercice />}

      {/* Mode Calendaire */}
      {mode === 'calendaire' && (isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="carte flex items-center gap-4">
              <div className="w-10 h-10 rounded-bouton bg-blue-100 flex items-center justify-center">
                <Stethoscope size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-texte-secondaire">Consultations · {libellePeriode(data)}</p>
                <p className="text-2xl font-titres font-bold text-texte-principal">{data?.total_consultations || 0}</p>
              </div>
            </div>
            <div className="carte flex items-center gap-4">
              <div className="w-10 h-10 rounded-bouton bg-green-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-zeze-vert" />
              </div>
              <div>
                <p className="text-xs text-texte-secondaire">{estAdmin ? 'CA facturé' : 'Mon CA facturé'} · {libellePeriode(data)}</p>
                <p className="text-2xl font-titres font-bold text-texte-principal">
                  {formatMontant(data?.total_facture)} <span className="text-sm font-normal text-texte-secondaire">FCFA</span>
                </p>
              </div>
            </div>
            <div className="carte flex items-center gap-4">
              <div className="w-10 h-10 rounded-bouton bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-texte-secondaire">{estAdmin ? 'Encaissé' : 'Mon encaissé'} · {libellePeriode(data)}</p>
                <p className="text-2xl font-titres font-bold text-texte-principal">
                  {formatMontant(data?.total_encaisse)} <span className="text-sm font-normal text-texte-secondaire">FCFA</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Consultations */}
            <div className="carte">
              <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
                <Stethoscope size={15} className="text-blue-500" /> Consultations
              </h2>
              {data?.consultations_chart?.length > 0 ? (
                <BarreChart donnees={data.consultations_chart} cleValeur="total" couleur="bg-blue-400" />
              ) : (
                <p className="text-sm text-texte-secondaire italic">Aucune consultation sur cette période</p>
              )}
            </div>

            {/* CA */}
            <div className="carte">
              <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-zeze-vert" />
                {estAdmin ? "Chiffre d'affaires (FCFA)" : "Mon chiffre d'affaires (FCFA)"}
              </h2>
              <div className="flex gap-3 mb-2">
                <span className="flex items-center gap-1 text-xs text-texte-secondaire"><span className="w-3 h-3 rounded-sm bg-zeze-vert/40 inline-block" /> Facturé</span>
                <span className="flex items-center gap-1 text-xs text-texte-secondaire"><span className="w-3 h-3 rounded-sm bg-zeze-vert inline-block" /> Encaissé</span>
              </div>
              {data?.ca_chart?.length > 0 ? (
                <CAChart donnees={data.ca_chart} />
              ) : (
                <p className="text-sm text-texte-secondaire italic">Aucune facture sur cette période</p>
              )}
            </div>

            {/* Répartition par sexe */}
            <div className="carte">
              <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
                <Users size={15} className="text-purple-500" /> Patients par sexe
              </h2>
              {data?.patients_par_sexe ? <DonutSexe donnees={data.patients_par_sexe} /> : null}
            </div>

            {/* Top produits */}
            <div className="carte">
              <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
                <Package size={15} className="text-amber-600" /> Top produits prescrits
              </h2>
              {!data?.top_produits?.length ? (
                <p className="text-sm text-texte-secondaire italic">Aucune ordonnance sur cette période</p>
              ) : (
                <div className="space-y-2">
                  {data.top_produits.map((p, i) => {
                    const max = data.top_produits[0]?.quantite || 1;
                    const pct = Math.round((p.quantite / max) * 100);
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-texte-principal truncate max-w-[60%]">{p.nom}</span>
                          <span className="text-texte-secondaire">{p.quantite} unité{p.quantite > 1 ? 's' : ''} · {formatMontant(p.ca)} FCFA</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ))}
    </div>
  );
};

export default StatistiquesPage;
