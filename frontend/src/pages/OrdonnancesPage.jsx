import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { telechargerPDF } from '../hooks/useOrdonnances';
import { FileText, Download, Search, Receipt } from 'lucide-react';

const useOrdonnancesGlobal = (params) =>
  useQuery({
    queryKey: ['ordonnances-global', params],
    queryFn: () => api.get('/ordonnances', { params }).then((r) => r.data),
  });

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const STATUT = {
  brouillon: { label: 'Brouillon', couleur: 'bg-gray-100 text-gray-600' },
  validee:   { label: 'Validée',   couleur: 'bg-green-100 text-green-700' },
  annulee:   { label: 'Annulée',   couleur: 'bg-red-100 text-red-700' },
};

const OrdonnancesPage = () => {
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [telechargement, setTelechargement] = useState(null);

  const { data: ordonnances = [], isLoading } = useOrdonnancesGlobal(
    filtreStatut ? { statut: filtreStatut } : {}
  );

  const filtrees = ordonnances.filter((o) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      o.numero?.toLowerCase().includes(q) ||
      o.patient?.nom?.toLowerCase().includes(q) ||
      o.patient?.prenom?.toLowerCase().includes(q) ||
      o.patient?.numero_dossier?.toLowerCase().includes(q)
    );
  });

  const handlePDF = async (e, ord) => {
    e.stopPropagation();
    setTelechargement(ord.id);
    try { await telechargerPDF(ord.id, ord.numero); }
    finally { setTelechargement(null); }
  };

  const handleFacturer = async (e, ord) => {
    e.stopPropagation();
    try {
      await api.post(`/factures/depuis-ordonnance/${ord.id}`, { montant_paye: 0 });
      navigate('/facturation');
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la création de la facture');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Ordonnances</h1>
          <p className="text-sm text-texte-secondaire mt-1">{filtrees.length} ordonnance{filtrees.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="carte py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texte-secondaire" />
            <input
              type="text"
              placeholder="Numéro, nom patient, dossier..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="champ-input pl-9"
            />
          </div>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="champ-input sm:w-40">
            <option value="">Tous statuts</option>
            {Object.entries(STATUT).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="carte p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : filtrees.length === 0 ? (
          <div className="text-center py-12 text-texte-secondaire">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune ordonnance trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fond-secondaire border-b border-bordure">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">N°</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">Patient</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden lg:table-cell">Stockiste</th>
                  <th className="text-right px-4 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Montant</th>
                  <th className="text-center px-4 py-3 font-semibold text-texte-secondaire">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-texte-secondaire">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrees.map((o) => {
                  const cfg = STATUT[o.statut] || STATUT.brouillon;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-fond-secondaire/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/patients/${o.patient_id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zeze-vert">{o.numero}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-texte-principal">{o.patient?.prenom} {o.patient?.nom}</p>
                        <p className="text-xs text-texte-secondaire font-mono">{o.patient?.numero_dossier}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-texte-secondaire whitespace-nowrap">
                        {new Date(o.date_ordonnance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-texte-secondaire">
                        {o.medecin ? `${o.medecin.prenom} ${o.medecin.nom}` : '—'}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-right font-mono text-texte-principal">
                        {formatMontant(o.montant_total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.couleur}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handlePDF(e, o)}
                            disabled={telechargement === o.id}
                            className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                            title="Télécharger PDF"
                          >
                            <Download size={15} />
                          </button>
                          {o.montant_total > 0 && o.statut !== 'annulee' && (
                            <button
                              onClick={(e) => handleFacturer(e, o)}
                              className="p-1.5 text-texte-secondaire hover:text-zeze-or rounded"
                              title="Créer une facture"
                            >
                              <Receipt size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdonnancesPage;
