import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUsers, useDesactiverUser } from '../../hooks/useUsers';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { UserPlus, Search, Pencil, UserX, RefreshCw } from 'lucide-react';

const couleurRole = { administrateur: 'violet', stockiste: 'bleu', secretaire: 'gris', delegue: 'orange' };

const UsersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  const { data, isLoading, isError } = useUsers({ recherche, role: filtreRole || undefined });
  const desactiver = useDesactiverUser();

  const confirmerDesactivation = async (user) => {
    if (!window.confirm(`${t('utilisateurs.confirmer_desactivation')}\n\n${user.prenom} ${user.nom}`)) return;
    try {
      await desactiver.mutateAsync(user.id);
      setMessageSucces(t('utilisateurs.desactivation_succes'));
      setTimeout(() => setMessageSucces(''), 4000);
    } catch {
      // L'erreur est gérée par l'intercepteur axios
    }
  };

  const formaterDate = (date) => {
    if (!date) return t('utilisateurs.jamais_connecte');
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const utilisateurs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">
            {t('utilisateurs.titre')}
          </h1>
          {pagination && (
            <p className="text-sm text-texte-secondaire mt-1">
              {pagination.total} utilisateur{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button
          variante="primaire"
          icone={UserPlus}
          onClick={() => navigate('/admin/utilisateurs/nouveau')}
        >
          {t('utilisateurs.nouvel_utilisateur')}
        </Button>
      </div>

      {/* Message de succès */}
      {messageSucces && <Alert type="succes" message={messageSucces} fermable />}

      {/* Filtres */}
      <div className="carte py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texte-secondaire" />
            <input
              type="text"
              placeholder={t('utilisateurs.rechercher')}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="champ-input pl-9"
            />
          </div>
          <select
            value={filtreRole}
            onChange={(e) => setFiltreRole(e.target.value)}
            className="champ-input sm:w-48"
          >
            <option value="">{t('commun.tous')} les rôles</option>
            <option value="administrateur">{t('roles.administrateur')}</option>
            <option value="stockiste">{t('roles.stockiste')}</option>
            <option value="secretaire">{t('roles.secretaire')}</option>
            <option value="delegue">{t('roles.delegue')}</option>
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
          <div className="p-6"><Alert type="erreur" message={t('commun.erreur')} /></div>
        ) : utilisateurs.length === 0 ? (
          <p className="text-center text-texte-secondaire py-12">{t('utilisateurs.aucun_resultat')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fond-secondaire border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire">{t('utilisateurs.nom')}</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire hidden md:table-cell">{t('utilisateurs.email')}</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire">{t('utilisateurs.role')}</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire hidden lg:table-cell">{t('utilisateurs.derniere_connexion')}</th>
                  <th className="text-left px-6 py-3 font-semibold text-texte-secondaire">Statut</th>
                  <th className="text-right px-6 py-3 font-semibold text-texte-secondaire">{t('commun.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {utilisateurs.map((user) => (
                  <tr key={user.id} className="hover:bg-fond-secondaire/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zeze-vert flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                        <span className="font-medium text-texte-principal">
                          {user.prenom} {user.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-texte-secondaire hidden md:table-cell">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge couleur={couleurRole[user.role]}>
                        {t(`roles.${user.role}`)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-texte-secondaire hidden lg:table-cell text-xs">
                      {formaterDate(user.derniere_connexion)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge couleur={user.actif ? 'vert' : 'rouge'}>
                        {user.actif ? t('utilisateurs.actif') : t('utilisateurs.inactif')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/utilisateurs/${user.id}/modifier`)}
                          className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                          title={t('commun.modifier')}
                        >
                          <Pencil size={15} />
                        </button>
                        {user.actif && (
                          <button
                            onClick={() => confirmerDesactivation(user)}
                            className="p-1.5 text-texte-secondaire hover:text-medical-critique rounded"
                            title={t('utilisateurs.desactiver')}
                          >
                            <UserX size={15} />
                          </button>
                        )}
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

export default UsersPage;
