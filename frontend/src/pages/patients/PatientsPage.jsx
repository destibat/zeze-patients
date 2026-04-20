import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePatients, useArchiverPatient } from '../../hooks/usePatients';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { UserPlus, Search, Eye, Pencil, Archive } from 'lucide-react';

const sexeLabel = { masculin: 'M', feminin: 'F', autre: 'A' };
const sexeCouleur = { masculin: 'bleu', feminin: 'violet', autre: 'gris' };

const PatientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [filtreSexe, setFiltreSexe] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  const { data, isLoading, isError } = usePatients({
    recherche: recherche || undefined,
    sexe: filtreSexe || undefined,
  });

  const archiver = useArchiverPatient();

  const confirmerArchivage = async (patient) => {
    if (!window.confirm(`Archiver le dossier de ${patient.prenom} ${patient.nom} ?\n\nCette action est réversible depuis l'administration.`)) return;
    try {
      await archiver.mutateAsync(patient.id);
      setMessageSucces('Dossier archivé avec succès');
      setTimeout(() => setMessageSucces(''), 4000);
    } catch {}
  };

  const patients = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Patients</h1>
          {pagination && (
            <p className="text-sm text-texte-secondaire mt-1">
              {pagination.total} dossier{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variante="primaire" icone={UserPlus} onClick={() => navigate('/patients/nouveau')}>
          Nouveau patient
        </Button>
      </div>

      {messageSucces && <Alert type="succes" message={messageSucces} fermable />}

      {/* Filtres */}
      <div className="carte py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texte-secondaire" />
            <input
              type="text"
              placeholder="Nom, prénom, téléphone ou numéro de dossier..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="champ-input pl-9"
            />
          </div>
          <select value={filtreSexe} onChange={(e) => setFiltreSexe(e.target.value)} className="champ-input sm:w-40">
            <option value="">Tous sexes</option>
            <option value="masculin">Masculin</option>
            <option value="feminin">Féminin</option>
            <option value="autre">Autre</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="carte p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="p-6"><Alert type="erreur" message="Erreur lors du chargement des patients" /></div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 text-texte-secondaire">
            <p className="text-lg font-medium mb-1">Aucun patient trouvé</p>
            <p className="text-sm">Créez le premier dossier en cliquant sur « Nouveau patient ».</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fond-secondaire border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire">Dossier</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire">Patient</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Sexe</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire hidden md:table-cell">Âge</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire hidden lg:table-cell">Téléphone</th>
                  <th className="text-right px-6 py-3 font-semibold text-texte-secondaire">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-fond-secondaire/50 transition-colors cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-zeze-vert bg-green-50 px-2 py-1 rounded">
                        {p.numero_dossier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zeze-vert-clair/30 flex items-center justify-center text-zeze-vert text-xs font-semibold flex-shrink-0">
                            {p.prenom[0]}{p.nom[0]}
                          </div>
                        )}
                        <span className="font-medium text-texte-principal">{p.prenom} {p.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Badge couleur={sexeCouleur[p.sexe]}>{sexeLabel[p.sexe]}</Badge>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-texte-secondaire">{p.age} ans</td>
                    <td className="px-6 py-4 hidden lg:table-cell text-texte-secondaire">{p.telephone}</td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/patients/${p.id}`)} className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded" title="Voir le dossier">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => navigate(`/patients/${p.id}/modifier`)} className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded" title="Modifier">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => confirmerArchivage(p)} className="p-1.5 text-texte-secondaire hover:text-medical-alerte rounded" title="Archiver">
                          <Archive size={15} />
                        </button>
                      </div>
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

export default PatientsPage;
