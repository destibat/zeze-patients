import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import useFormatMontant from '../hooks/useFormatMontant';
import { FileBarChart2, Download, Loader2, Stethoscope, TrendingUp, Users, Brain } from 'lucide-react';

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Aperçu des KPIs du mois avant téléchargement
const useApercu = (annee, moisNum) =>
  useQuery({
    queryKey: ['rapport-apercu', annee, moisNum],
    queryFn: () =>
      api.get('/stats/detaillees', { params: { periode: 'mois', annee, mois: moisNum } }).then((r) => r.data),
    keepPreviousData: true,
  });

const CarteKPI = ({ label, valeur, icone: Icone, couleur }) => (
  <div className="carte flex items-center gap-3 py-3">
    <div className={`w-10 h-10 rounded-carte flex items-center justify-center flex-shrink-0 ${couleur}`}>
      <Icone size={18} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-texte-secondaire">{label}</p>
      <p className="text-lg font-bold font-titres text-texte-principal">{valeur}</p>
    </div>
  </div>
);

const MiniBarChart = ({ donnees, cleValeur, couleur = 'bg-zeze-vert' }) => {
  const max = Math.max(...donnees.map((d) => d[cleValeur] || 0), 1);
  return (
    <div className="flex items-end gap-px h-16 overflow-hidden">
      {donnees.map((d, i) => {
        const h = Math.max(2, Math.round(((d[cleValeur] || 0) / max) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0 group relative">
            {d[cleValeur] > 0 && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-texte-principal text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                {d[cleValeur]}
              </div>
            )}
            <div className="w-full flex items-end" style={{ height: '64px' }}>
              <div className={`w-full rounded-t ${couleur}`} style={{ height: `${h}%`, minHeight: d[cleValeur] > 0 ? '2px' : '0' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RapportsPage = () => {
  const maintenant = new Date();
  const [annee, setAnnee]   = useState(maintenant.getFullYear());
  const [moisNum, setMoisNum] = useState(maintenant.getMonth() + 1);
  const [telechargement, setTelechargement] = useState(false);
  const { formatMontant } = useFormatMontant();

  const { data: apercu, isLoading } = useApercu(annee, moisNum);

  const telecharger = async () => {
    setTelechargement(true);
    try {
      const resp = await api.get('/rapports/mensuel', {
        params: { mois: `${annee}-${String(moisNum).padStart(2, '0')}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${annee}-${String(moisNum).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTelechargement(false);
    }
  };

  const labelMois = `${MOIS_FR[moisNum - 1]} ${annee}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal flex items-center gap-2">
            <FileBarChart2 size={22} className="text-zeze-vert" />
            Rapports mensuels
          </h1>
          <p className="text-sm text-texte-secondaire mt-0.5">Générez un rapport PDF complet pour chaque mois</p>
        </div>
      </div>

      {/* Sélecteur de mois */}
      <div className="carte flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-texte-principal whitespace-nowrap">Mois :</label>
          <select
            value={moisNum}
            onChange={(e) => setMoisNum(parseInt(e.target.value))}
            className="champ-input w-36"
          >
            {MOIS_FR.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value))}
            className="champ-input w-24"
          >
            {[maintenant.getFullYear() - 1, maintenant.getFullYear()].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          onClick={telecharger}
          disabled={telechargement}
          className="btn-primary flex items-center gap-2 sm:ml-auto"
        >
          {telechargement ? (
            <><Loader2 size={16} className="animate-spin" />Génération...</>
          ) : (
            <><Download size={16} />Télécharger le rapport — {labelMois}</>
          )}
        </button>
      </div>

      {/* Aperçu des KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
          Aperçu — {labelMois}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CarteKPI
                label="Consultations"
                valeur={apercu?.total_consultations ?? '—'}
                icone={Stethoscope}
                couleur="bg-blue-500"
              />
              <CarteKPI
                label="CA facturé"
                valeur={apercu ? formatMontant(apercu.total_facture) : '—'}
                icone={TrendingUp}
                couleur="bg-zeze-vert"
              />
              <CarteKPI
                label="CA encaissé"
                valeur={apercu ? formatMontant(apercu.total_encaisse) : '—'}
                icone={TrendingUp}
                couleur="bg-emerald-600"
              />
              <CarteKPI
                label="Nb factures"
                valeur={apercu?.nb_factures ?? '—'}
                icone={Users}
                couleur="bg-zeze-or"
              />
            </div>

            {/* Mini chart CA */}
            {apercu?.ca_chart?.length > 0 && (
              <div className="carte mt-4">
                <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
                  CA encaissé par jour — {labelMois}
                </p>
                <MiniBarChart donnees={apercu.ca_chart} cleValeur="encaisse" couleur="bg-zeze-vert" />
                <div className="flex justify-between text-xs text-texte-secondaire mt-1">
                  <span>1</span>
                  <span>{apercu.ca_chart.length}</span>
                </div>
              </div>
            )}

            {/* Top produits */}
            {apercu?.top_produits?.length > 0 && (
              <div className="carte mt-4">
                <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
                  Top produits vendus
                </p>
                <div className="space-y-2">
                  {apercu.top_produits.slice(0, 5).map((p, i) => {
                    const max = apercu.top_produits[0]?.quantite || 1;
                    const pct = Math.round((p.quantite / max) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-texte-secondaire text-right shrink-0">{i + 1}</span>
                        <span className="text-sm text-texte-principal truncate w-40 shrink-0">{p.nom}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-zeze-vert rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-texte-principal shrink-0 w-12 text-right">
                          {p.quantite} u.
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RapportsPage;
