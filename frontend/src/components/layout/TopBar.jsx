import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, ChevronDown, LogOut, User } from 'lucide-react';

const LANGUES = [
  { code: 'fr', drapeau: '🇫🇷', label: 'Français' },
  { code: 'en', drapeau: '🇬🇧', label: 'English' },
];

const changerLangueGoogle = (code) => {
  const select = document.querySelector('.goog-te-combo');
  if (select) {
    select.value = code === 'fr' ? 'fr' : 'en';
    select.dispatchEvent(new Event('change'));
  }
  localStorage.setItem('langue_ui', code);
};

const TopBar = ({ onOuvrirSidebar }) => {
  const { t } = useTranslation();
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [langueActive, setLangueActive] = useState(
    localStorage.getItem('langue_ui') || 'fr'
  );

  const changerLangue = (code) => {
    changerLangueGoogle(code);
    setLangueActive(code);
  };

  const gererDeconnexion = async () => {
    await deconnexion();
    navigate('/connexion');
  };

  const labelRole = {
    administrateur: 'Administrateur',
    stockiste: 'Stockiste',
    secretaire: 'Secrétaire',
    delegue: 'Revendeur',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-4 lg:px-6">
      {/* Bouton menu mobile */}
      <button
        onClick={onOuvrirSidebar}
        className="lg:hidden p-2 rounded-bouton text-texte-secondaire hover:bg-fond-secondaire"
      >
        <Menu size={22} />
      </button>

      {/* Titre de la page (optionnel — espace vide sur desktop) */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {/* Sélecteur de langue */}
        <div className="flex items-center gap-1 bg-fond-secondaire rounded-bouton px-1 py-1">
          {LANGUES.map(({ code, drapeau, label }) => (
            <button
              key={code}
              onClick={() => changerLangue(code)}
              title={label}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                langueActive === code
                  ? 'bg-white shadow-sm text-texte-principal'
                  : 'text-texte-secondaire hover:text-texte-principal'
              }`}
            >
              <span className="text-base leading-none">{drapeau}</span>
              <span className="hidden sm:inline">{code.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Menu utilisateur */}
        <div className="relative">
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="flex items-center gap-2 px-3 py-2 rounded-bouton hover:bg-fond-secondaire transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-zeze-vert flex items-center justify-center text-white text-sm font-semibold">
              {utilisateur?.prenom?.[0]}{utilisateur?.nom?.[0]}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-texte-principal leading-tight">
                {utilisateur?.prenom} {utilisateur?.nom}
              </p>
              <p className="text-xs text-texte-secondaire">{labelRole[utilisateur?.role]}</p>
            </div>
            <ChevronDown size={16} className="text-texte-secondaire" />
          </button>

          {menuOuvert && (
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-carte shadow-modale border border-gray-100 py-1 z-50">
              <button
                onClick={() => { setMenuOuvert(false); navigate('/profil'); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-texte-principal hover:bg-fond-secondaire"
              >
                <User size={16} />
                Mon profil
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={gererDeconnexion}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-medical-critique hover:bg-red-50"
              >
                <LogOut size={16} />
                {t('auth.deconnexion')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
