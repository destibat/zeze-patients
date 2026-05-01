import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAlertesStock } from '../../hooks/useStock';
import {
  LayoutDashboard, Users, UserRound, Calendar, FileText,
  Receipt, Package, BarChart3, Settings, X, Boxes, BookOpen, ShoppingCart,
} from 'lucide-react';
import logoMapa from '../../assets/logo-mapa.png';

const entresNav = [
  { cle: 'tableau_de_bord', chemin: '/', icone: LayoutDashboard, roles: ['administrateur', 'stockiste', 'secretaire', 'delegue'] },
  { cle: 'patients', chemin: '/patients', icone: UserRound, roles: ['administrateur', 'stockiste', 'secretaire', 'delegue'] },
  { cle: 'consultations', chemin: '/consultations', icone: FileText, roles: ['administrateur', 'stockiste', 'delegue'] },
  { cle: 'rendez_vous', chemin: '/rendez-vous', icone: Calendar, roles: ['administrateur', 'stockiste', 'secretaire', 'delegue'] },
  { cle: 'ordonnances', chemin: '/ordonnances', icone: FileText, roles: ['administrateur', 'stockiste', 'delegue'] },
  { cle: 'facturation', chemin: '/facturation', icone: Receipt, roles: ['administrateur', 'stockiste', 'secretaire', 'delegue'] },
  { cle: 'mon_stock', chemin: '/mon-stock', icone: Boxes, roles: ['delegue'] },
  { cle: 'approvisionnements', chemin: '/approvisionnements', icone: ShoppingCart, roles: ['delegue', 'stockiste', 'administrateur'] },
  { cle: 'stock', chemin: '/stock', icone: Package, roles: ['administrateur', 'stockiste', 'secretaire'] },
  { cle: 'statistiques', chemin: '/statistiques', icone: BarChart3, roles: ['administrateur'] },
  { cle: 'exercices', chemin: '/exercices', icone: BookOpen, roles: ['administrateur', 'stockiste'] },
  { cle: 'utilisateurs', chemin: '/admin/utilisateurs', icone: Users, roles: ['administrateur'] },
  { cle: 'parametres', chemin: '/parametres', icone: Settings, roles: ['administrateur'] },
];

const Sidebar = ({ ouverte, onFermer }) => {
  const { t } = useTranslation();
  const { aLeRole } = useAuth();
  const peutVoirStock = aLeRole('administrateur', 'secretaire');
  const { data: alertes = [] } = useAlertesStock(peutVoirStock);
  const nbAlertes = alertes.length;

  const entreesVisibles = entresNav.filter(({ roles }) => aLeRole(...roles));

  return (
    <>
      {/* Overlay mobile */}
      {ouverte && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onFermer}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 bg-zeze-vert-fonce text-white
          flex flex-col transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${ouverte ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zeze-vert">
          <div className="bg-white rounded-lg px-2 py-1">
            <img src={logoMapa} alt="MAPA ZEZEPAGNON" className="h-9 object-contain" />
          </div>
          <button onClick={onFermer} className="lg:hidden text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {entreesVisibles.map(({ cle, chemin, icone: Icone }) => (
            <NavLink
              key={cle}
              to={chemin}
              end={chemin === '/'}
              onClick={onFermer}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-bouton mb-1 text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icone size={18} />
              <span className="flex-1">{t(`nav.${cle}`)}</span>
              {cle === 'stock' && nbAlertes > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {nbAlertes > 99 ? '99+' : nbAlertes}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Pied de la sidebar */}
        <div className="px-4 py-3 border-t border-zeze-vert text-xs text-white/40 text-center">
          ZEZEPAGNON v1.0
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
