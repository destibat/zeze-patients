import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-fond-principal flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-titres font-bold text-zeze-vert-clair">404</p>
        <h1 className="text-2xl font-titres font-semibold text-texte-principal mt-4 mb-2">
          {t('commun.page_introuvable')}
        </h1>
        <p className="text-texte-secondaire mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <Button variante="primaire" icone={Home} onClick={() => navigate('/')}>
          {t('commun.retour_accueil')}
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
