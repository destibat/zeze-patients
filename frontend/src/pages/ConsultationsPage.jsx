import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, FileText, Search } from 'lucide-react';

const useConsultationsGlobal = (params) =>
  useQuery({
    queryKey: ['consultations-global', params],
    queryFn: () => api.get('/consultations', { params }).then((r) => r.data),
  });

const useUtilisateursFiltres = (estAdmin) =>
  useQuery({
    queryKey: ['users', 'stockistes-delegues'],
    queryFn: () =>
      api.get('/users', { params: { limite: 100, actif: true } }).then((r) => r.data.data || []),
    enabled: estAdmin,
    staleTime: 5 * 60 * 1000,
  });

const ConsultationsPage = () => {
  const navigate = useNavigate();
  const { aLeRole } = useAuth();
  const estAdmin = aLeRole('administrateur');

  const [recherche, setRecherche] = useState('');
  const [filtreUser, setFiltreUser] = useState('');

  const params = {};
  if (filtreUser) params.medecin_id = filtreUser;

  const { data: consultations = [], isLoading } = useConsultationsGlobal(params);
  const { data: utilisateurs = [] } = useUtilisateursFiltres(estAdmin);

  const utilisateursFiltres = utilisateurs.filter(
    (u) => u.role === 'stockiste' || u.role === 'delegue'
  );

  const filtrees = consultations.filter((c) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      c.motif?.toLowerCase().includes(q) ||
      c.patient?.nom?.toLowerCase().includes(q) ||
      c.patient?.prenom?.toLowerCase().includes(q) ||
      c.patient?.numero_dossier?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Consultations</h1>
          <p className="text-sm text-texte-secondaire mt-1">{filtrees.length} consultation{filtrees.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="carte py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texte-secondaire" />
            <input
              type="text"
              placeholder="Nom patient, numéro de dossier, motif..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="champ-input pl-9"
            />
          </div>
          {estAdmin && utilisateursFiltres.length > 0 && (
            <select
              value={filtreUser}
              onChange={(e) => setFiltreUser(e.target.value)}
              className="champ-input sm:w-56"
            >
              <option value="">Tous les utilisateurs</option>
              {utilisateursFiltres.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.role === 'stockiste' ? 'Stockiste' : 'Revendeur'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="carte p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : filtrees.length === 0 ? (
          <div className="text-center py-12 text-texte-secondaire">
            <Stethoscope size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune consultation trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fond-secondaire border-b border-bordure">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">Patient</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden md:table-cell">Motif</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden lg:table-cell">Créateur</th>
                  <th className="text-center px-4 py-3 font-semibold text-texte-secondaire">Ordonnances</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrees.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-fond-secondaire/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/patients/${c.patient_id}/consultations/${c.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-texte-secondaire font-mono text-xs">
                      {new Date(c.date_consultation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-texte-principal">{c.patient?.prenom} {c.patient?.nom}</p>
                      <p className="text-xs text-zeze-vert font-mono">{c.patient?.numero_dossier}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-texte-principal max-w-xs truncate">{c.motif}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-texte-secondaire">
                      {c.medecin ? `${c.medecin.prenom} ${c.medecin.nom}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.ordonnances?.length > 0 ? (
                        <span className="flex items-center justify-center gap-1 text-xs text-zeze-vert">
                          <FileText size={12} /> {c.ordonnances.length}
                        </span>
                      ) : (
                        <span className="text-texte-secondaire text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationsPage;
