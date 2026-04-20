import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import logoMapa from '../assets/logo-mapa.png';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [mdpVisible, setMdpVisible] = useState(false);
  const { t } = useTranslation();
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const destination = location.state?.from?.pathname || '/';

  const { register, handleSubmit, formState: { errors } } = useForm();

  const soumettre = async ({ email, motDePasse }) => {
    setErreur('');
    setChargement(true);
    try {
      const user = await connexion(email, motDePasse);
      // Redirection vers changement de mot de passe si requis
      if (user.doitChangerMdp) {
        navigate('/changer-mot-de-passe', { replace: true });
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('auth.erreur_connexion');
      setErreur(msg);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen bg-fond-secondaire flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <img src={logoMapa} alt="MAPA ZEZEPAGNON" className="h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-titres font-bold text-zeze-vert-fonce">
            Dossiers Patients
          </h1>
          <p className="text-sm text-texte-secondaire mt-1">
            Cabinet médical ZEZEPAGNON — Abidjan
          </p>
        </div>

        {/* Formulaire */}
        <div className="carte">
          <h2 className="text-lg font-titres font-semibold text-texte-principal mb-6">
            {t('auth.connexion')}
          </h2>

          {erreur && (
            <div className="mb-4">
              <Alert type="erreur" message={erreur} fermable />
            </div>
          )}

          <form onSubmit={handleSubmit(soumettre)} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                autoComplete="email"
                className={`champ-input ${errors.email ? 'border-medical-critique' : ''}`}
                placeholder="exemple@zezepagnon.local"
                {...register('email', {
                  required: t('auth.email_requis'),
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.email_invalide') },
                })}
              />
              {errors.email && <p className="text-xs text-medical-critique mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">
                {t('auth.mot_de_passe')}
              </label>
              <div className="relative">
                <input
                  type={mdpVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`champ-input pr-10 ${errors.motDePasse ? 'border-medical-critique' : ''}`}
                  placeholder="••••••••"
                  {...register('motDePasse', {
                    required: t('auth.mdp_requis'),
                    minLength: { value: 8, message: t('auth.mdp_min') },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setMdpVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-texte-secondaire hover:text-texte-principal p-1 rounded"
                  tabIndex={-1}
                >
                  {mdpVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.motDePasse && <p className="text-xs text-medical-critique mt-1">{errors.motDePasse.message}</p>}
            </div>

            <Button
              type="submit"
              variante="primaire"
              taille="lg"
              chargement={chargement}
              className="w-full mt-2"
            >
              {chargement ? t('auth.connexion_en_cours') : t('auth.se_connecter')}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-texte-secondaire mt-6">
          © {new Date().getFullYear()} MAPA ZEZEPAGNON — Abidjan, Côte d'Ivoire
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
