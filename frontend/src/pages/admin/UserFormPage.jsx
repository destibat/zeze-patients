import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useUser, useCreerUser, useModifierUser } from '../../hooks/useUsers';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import api from '../../services/api';
import { ArrowLeft, Save } from 'lucide-react';

const ChampFormulaire = ({ label, erreur, children, obligatoire }) => (
  <div>
    <label className="block text-sm font-medium text-texte-principal mb-1">
      {label} {obligatoire && <span className="text-medical-critique">*</span>}
    </label>
    {children}
    {erreur && <p className="text-xs text-medical-critique mt-1">{erreur}</p>}
  </div>
);

const useStockistes = () =>
  useQuery({
    queryKey: ['users', { role: 'stockiste' }],
    queryFn: () =>
      api.get('/users', { params: { role: 'stockiste', limite: 100 } }).then((r) => r.data?.data || []),
  });

const UserFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const modeEdition = Boolean(id);

  const { data: utilisateurExistant, isLoading } = useUser(id);
  const { data: stockistes = [] } = useStockistes();
  const creer = useCreerUser();
  const modifier = useModifierUser();

  const mutation = modeEdition ? modifier : creer;
  const erreurMutation = mutation.error?.response?.data?.message;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm();

  const roleSelectionne = useWatch({ control, name: 'role', defaultValue: '' });

  useEffect(() => {
    if (modeEdition && utilisateurExistant) {
      reset({
        nom: utilisateurExistant.nom,
        prenom: utilisateurExistant.prenom,
        email: utilisateurExistant.email,
        telephone: utilisateurExistant.telephone || '',
        role: utilisateurExistant.role,
        commission_rate: utilisateurExistant.commission_rate ?? 25,
        stockiste_id: utilisateurExistant.stockiste_id || '',
      });
    }
  }, [utilisateurExistant, modeEdition, reset]);

  const soumettre = async (valeurs) => {
    try {
      const payload = { ...valeurs };
      if (modeEdition) {
        await modifier.mutateAsync({ id, ...payload });
      } else {
        await creer.mutateAsync({ ...payload, password: valeurs.motDePasse });
      }
      navigate('/admin/utilisateurs');
    } catch {
      // L'erreur est affichée via erreurMutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/utilisateurs')}
          className="p-2 text-texte-secondaire hover:text-zeze-vert rounded-bouton hover:bg-fond-secondaire"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-titres font-bold text-texte-principal">
          {modeEdition ? t('utilisateurs.modifier') : t('utilisateurs.nouvel_utilisateur')}
        </h1>
      </div>

      {erreurMutation && <Alert type="erreur" message={erreurMutation} />}

      <div className="carte space-y-4">
        <form onSubmit={handleSubmit(soumettre)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChampFormulaire label={t('utilisateurs.prenom')} erreur={errors.prenom?.message} obligatoire>
              <input
                className={`champ-input ${errors.prenom ? 'border-medical-critique' : ''}`}
                {...register('prenom', { required: t('commun.requis') })}
              />
            </ChampFormulaire>

            <ChampFormulaire label={t('utilisateurs.nom')} erreur={errors.nom?.message} obligatoire>
              <input
                className={`champ-input ${errors.nom ? 'border-medical-critique' : ''}`}
                {...register('nom', { required: t('commun.requis') })}
              />
            </ChampFormulaire>
          </div>

          <ChampFormulaire label={t('utilisateurs.email')} erreur={errors.email?.message} obligatoire>
            <input
              type="email"
              className={`champ-input ${errors.email ? 'border-medical-critique' : ''}`}
              {...register('email', {
                required: t('commun.requis'),
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.email_invalide') },
              })}
            />
          </ChampFormulaire>

          <ChampFormulaire label={t('utilisateurs.telephone')} erreur={errors.telephone?.message}>
            <input
              type="tel"
              placeholder="+225 07 00 00 00 00"
              className="champ-input"
              {...register('telephone')}
            />
          </ChampFormulaire>

          <ChampFormulaire label={t('utilisateurs.role')} erreur={errors.role?.message} obligatoire>
            <select
              className={`champ-input ${errors.role ? 'border-medical-critique' : ''}`}
              {...register('role', { required: t('commun.requis') })}
            >
              <option value="">— Choisir un rôle —</option>
              <option value="administrateur">{t('roles.administrateur')}</option>
              <option value="stockiste">{t('roles.stockiste')}</option>
              <option value="secretaire">{t('roles.secretaire')}</option>
              <option value="delegue">{t('roles.delegue')}</option>
            </select>
          </ChampFormulaire>

          {/* Commission (stockiste uniquement) */}
          {roleSelectionne === 'stockiste' && (
            <ChampFormulaire label="Taux de commission (%)" erreur={errors.commission_rate?.message} obligatoire>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className={`champ-input ${errors.commission_rate ? 'border-medical-critique' : ''}`}
                placeholder="25"
                {...register('commission_rate', {
                  required: t('commun.requis'),
                  min: { value: 0, message: 'Minimum 0%' },
                  max: { value: 100, message: 'Maximum 100%' },
                })}
              />
              <p className="text-xs text-texte-secondaire mt-1">Taux négocié à la signature du contrat (défaut : 25%)</p>
            </ChampFormulaire>
          )}

          {/* Stockiste rattaché (délégué uniquement) */}
          {roleSelectionne === 'delegue' && (
            <ChampFormulaire label="Stockiste rattaché" erreur={errors.stockiste_id?.message} obligatoire>
              <select
                className={`champ-input ${errors.stockiste_id ? 'border-medical-critique' : ''}`}
                {...register('stockiste_id', { required: 'Un délégué doit être rattaché à un stockiste' })}
              >
                <option value="">— Choisir un stockiste —</option>
                {stockistes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.prenom} {s.nom}
                  </option>
                ))}
              </select>
              <p className="text-xs text-texte-secondaire mt-1">Le délégué recevra 15% de la commission du stockiste</p>
            </ChampFormulaire>
          )}

          {/* Mot de passe uniquement à la création */}
          {!modeEdition && (
            <ChampFormulaire label={t('auth.mot_de_passe')} erreur={errors.motDePasse?.message} obligatoire>
              <input
                type="password"
                className={`champ-input ${errors.motDePasse ? 'border-medical-critique' : ''}`}
                placeholder="Minimum 8 caractères"
                {...register('motDePasse', {
                  required: t('commun.requis'),
                  minLength: { value: 8, message: t('auth.mdp_min') },
                })}
              />
              <p className="text-xs text-texte-secondaire mt-1">
                L'utilisateur devra changer ce mot de passe à sa première connexion.
              </p>
            </ChampFormulaire>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variante="primaire"
              icone={Save}
              chargement={mutation.isPending}
            >
              {t('commun.enregistrer')}
            </Button>
            <Button
              type="button"
              variante="fantome"
              onClick={() => navigate('/admin/utilisateurs')}
            >
              {t('commun.annuler')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormPage;
