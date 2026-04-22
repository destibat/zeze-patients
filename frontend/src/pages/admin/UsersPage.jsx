import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useUsers, useDesactiverUser, useReactiverUser,
  useSupprimerUser, useReinitialiserMdp,
} from '../../hooks/useUsers';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import api from '../../services/api';
import { UserPlus, Search, Pencil, UserX, UserCheck, KeyRound, Trash2, X, Eye, EyeOff, RotateCcw, TriangleAlert } from 'lucide-react';

const couleurRole = { administrateur: 'violet', stockiste: 'bleu', secretaire: 'gris', delegue: 'orange' };

const ModalMotDePasse = ({ user, onFermer, onSucces }) => {
  const [mdp, setMdp] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const reinitialiser = useReinitialiserMdp();

  const soumettre = async (e) => {
    e.preventDefault();
    if (mdp.length < 8) { setErreur('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setErreur('');
    try {
      await reinitialiser.mutateAsync({ id: user.id, nouveauMotDePasse: mdp });
      onSucces(`Mot de passe de ${user.prenom} ${user.nom} modifié. L'utilisateur devra le changer à la prochaine connexion.`);
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la modification.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-texte-principal">
            Modifier le mot de passe — {user.prenom} {user.nom}
          </h2>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal">
            <X size={18} />
          </button>
        </div>
        {erreur && <Alert type="erreur" message={erreur} />}
        <form onSubmit={soumettre} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Nouveau mot de passe</label>
            <div className="relative">
              <input
                autoFocus
                type={visible ? 'text' : 'password'}
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                className="champ-input pr-10"
                placeholder="8 caractères minimum"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-texte-secondaire hover:text-texte-principal"
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-texte-secondaire">
            L'utilisateur sera obligé de changer son mot de passe à la prochaine connexion.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variante="fantome" onClick={onFermer} type="button">Annuler</Button>
            <Button variante="primaire" type="submit" chargement={reinitialiser.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const useResetDonnees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/dev/reset').then((r) => r.data),
    onSuccess: () => {
      // Vider tout le cache TanStack Query d'un coup
      qc.clear();
    },
  });
};

const ModalResetDonnees = ({ onFermer, onSucces }) => {
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const reset = useResetDonnees();
  const MOT_CLE = 'RESET';

  const soumettre = async () => {
    if (confirmation !== MOT_CLE) { setErreur(`Tapez "${MOT_CLE}" pour confirmer.`); return; }
    setErreur('');
    try {
      const data = await reset.mutateAsync();
      onSucces(data.message);
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors du reset.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-md space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <TriangleAlert size={20} className="text-red-600" />
            </div>
            <h2 className="text-base font-semibold text-texte-principal">Reset données de test</h2>
          </div>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-bouton p-3 text-sm text-red-800 space-y-1">
          <p className="font-semibold">Tables qui seront vidées :</p>
          <p>patients · consultations · ordonnances · factures · rendez-vous · ventes délégués · stocks délégués · mouvements stock · quantités en stock (stockistes)</p>
          <p className="font-semibold mt-2">Conservés :</p>
          <p>utilisateurs · liste des produits · paramètres</p>
        </div>

        {erreur && <Alert type="erreur" message={erreur} />}

        <div>
          <label className="block text-sm font-medium text-texte-principal mb-1">
            Tapez <span className="font-mono font-bold text-red-600">{MOT_CLE}</span> pour confirmer
          </label>
          <input
            autoFocus
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && soumettre()}
            className="champ-input"
            placeholder={MOT_CLE}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variante="fantome" onClick={onFermer} type="button">Annuler</Button>
          <Button
            variante="danger"
            icone={RotateCcw}
            onClick={soumettre}
            chargement={reset.isPending}
            disabled={confirmation !== MOT_CLE}
          >
            Vider les données
          </Button>
        </div>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [userMdp, setUserMdp] = useState(null);
  const [showReset, setShowReset] = useState(false);

  const { data, isLoading, isError } = useUsers({ recherche, role: filtreRole || undefined });
  const desactiver = useDesactiverUser();
  const reactiver = useReactiverUser();
  const supprimer = useSupprimerUser();

  const afficherSucces = (msg) => {
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(''), 5000);
  };

  const confirmerDesactivation = async (user) => {
    if (!window.confirm(`Désactiver le compte de ${user.prenom} ${user.nom} ?`)) return;
    try {
      await desactiver.mutateAsync(user.id);
      afficherSucces(`${user.prenom} ${user.nom} a été désactivé.`);
    } catch (e) {
      alert(e?.response?.data?.message || t('commun.erreur'));
    }
  };

  const confirmerReactivation = async (user) => {
    if (!window.confirm(`Réactiver le compte de ${user.prenom} ${user.nom} ?`)) return;
    try {
      await reactiver.mutateAsync(user.id);
      afficherSucces(`${user.prenom} ${user.nom} a été réactivé.`);
    } catch (e) {
      alert(e?.response?.data?.message || t('commun.erreur'));
    }
  };

  const confirmerSuppression = async (user) => {
    if (!window.confirm(
      `Supprimer définitivement le compte de ${user.prenom} ${user.nom} ?\n\nCette action est irréversible.`
    )) return;
    try {
      await supprimer.mutateAsync(user.id);
      afficherSucces(`${user.prenom} ${user.nom} a été supprimé définitivement.`);
    } catch (e) {
      alert(e?.response?.data?.message || t('commun.erreur'));
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
      {userMdp && (
        <ModalMotDePasse
          user={userMdp}
          onFermer={() => setUserMdp(null)}
          onSucces={afficherSucces}
        />
      )}
      {showReset && import.meta.env.DEV && (
        <ModalResetDonnees
          onFermer={() => setShowReset(false)}
          onSucces={(msg) => { afficherSucces(msg); setShowReset(false); }}
        />
      )}

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
        <div className="flex items-center gap-2">
          {import.meta.env.DEV && (
            <Button variante="danger" icone={RotateCcw} onClick={() => setShowReset(true)}>
              Reset données de test
            </Button>
          )}
          <Button variante="primaire" icone={UserPlus} onClick={() => navigate('/admin/utilisateurs/nouveau')}>
            {t('utilisateurs.nouvel_utilisateur')}
          </Button>
        </div>
      </div>

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
          <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} className="champ-input sm:w-48">
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${user.actif ? 'bg-zeze-vert' : 'bg-gray-400'}`}>
                          {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                        <span className={`font-medium ${user.actif ? 'text-texte-principal' : 'text-texte-secondaire line-through'}`}>
                          {user.prenom} {user.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-texte-secondaire hidden md:table-cell">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge couleur={couleurRole[user.role]}>{t(`roles.${user.role}`)}</Badge>
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
                      <div className="flex items-center justify-end gap-1">
                        {/* Modifier */}
                        <button
                          onClick={() => navigate(`/admin/utilisateurs/${user.id}/modifier`)}
                          className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                          title={t('commun.modifier')}
                        >
                          <Pencil size={15} />
                        </button>
                        {/* Mot de passe */}
                        <button
                          onClick={() => setUserMdp(user)}
                          className="p-1.5 text-texte-secondaire hover:text-zeze-or rounded"
                          title="Modifier le mot de passe"
                        >
                          <KeyRound size={15} />
                        </button>
                        {/* Désactiver / Réactiver */}
                        {user.actif ? (
                          <button
                            onClick={() => confirmerDesactivation(user)}
                            className="p-1.5 text-texte-secondaire hover:text-medical-critique rounded"
                            title={t('utilisateurs.desactiver')}
                          >
                            <UserX size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => confirmerReactivation(user)}
                            className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                            title="Réactiver le compte"
                          >
                            <UserCheck size={15} />
                          </button>
                        )}
                        {/* Supprimer définitivement */}
                        <button
                          onClick={() => confirmerSuppression(user)}
                          className="p-1.5 text-texte-secondaire hover:text-medical-critique rounded"
                          title="Supprimer définitivement"
                        >
                          <Trash2 size={15} />
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

export default UsersPage;
