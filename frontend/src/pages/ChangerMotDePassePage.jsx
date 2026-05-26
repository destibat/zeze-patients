import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import logoMapa from '../assets/logo-mapa.png';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const ChampMdp = ({ label, requis, placeholder, erreur, registration }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-texte-principal mb-1">
        {label} {requis && <span className="text-medical-critique">*</span>}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className={`champ-input pr-10 ${erreur ? 'border-medical-critique' : ''}`}
          placeholder={placeholder}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-texte-secondaire hover:text-texte-principal transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {erreur && <p className="text-xs text-medical-critique mt-1">{erreur.message}</p>}
    </div>
  );
};

const ChangerMotDePassePage = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const nouveauMdp = watch('nouveauMdp');

  const soumettre = async ({ ancienMdp, nouveauMdp }) => {
    setErreur('');
    setChargement(true);
    try {
      await authService.changerMotDePasse(ancienMdp, nouveauMdp);
      navigate('/', { replace: true });
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen bg-fond-secondaire flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoMapa} alt="MAPA ZEZEPAGNON" className="h-14 mx-auto mb-4 object-contain" />
        </div>

        <div className="carte">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-zeze-or/20 flex items-center justify-center">
              <KeyRound size={20} className="text-zeze-or" />
            </div>
            <div>
              <h1 className="text-lg font-titres font-semibold text-texte-principal">
                Changement de mot de passe requis
              </h1>
              <p className="text-xs text-texte-secondaire">
                Bienvenue {utilisateur?.prenom} — veuillez définir votre mot de passe personnel.
              </p>
            </div>
          </div>

          {erreur && <div className="mb-4"><Alert type="erreur" message={erreur} /></div>}

          <form onSubmit={handleSubmit(soumettre)} noValidate className="space-y-4">
            <ChampMdp
              label="Mot de passe temporaire"
              requis
              placeholder="Votre mot de passe actuel"
              erreur={errors.ancienMdp}
              registration={register('ancienMdp', { required: 'Requis' })}
            />
            <ChampMdp
              label="Nouveau mot de passe"
              requis
              placeholder="Minimum 8 caractères"
              erreur={errors.nouveauMdp}
              registration={register('nouveauMdp', {
                required: 'Requis',
                minLength: { value: 8, message: 'Minimum 8 caractères' },
              })}
            />
            <ChampMdp
              label="Confirmer le nouveau mot de passe"
              requis
              placeholder="Répétez le nouveau mot de passe"
              erreur={errors.confirmation}
              registration={register('confirmation', {
                required: 'Requis',
                validate: (v) => v === nouveauMdp || 'Les mots de passe ne correspondent pas',
              })}
            />

            <Button type="submit" variante="primaire" taille="lg" chargement={chargement} className="w-full mt-2">
              Enregistrer mon mot de passe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangerMotDePassePage;
