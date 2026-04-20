import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  // Au montage, on vérifie si un token valide existe déjà
  useEffect(() => {
    const initialiser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setChargement(false);
        return;
      }
      try {
        const profil = await authService.obtenirProfil();
        setUtilisateur(profil);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setChargement(false);
      }
    };
    initialiser();
  }, []);

  const connexion = useCallback(async (email, motDePasse) => {
    const donnees = await authService.connexion(email, motDePasse);
    authService.sauvegarderTokens(donnees.accessToken, donnees.refreshToken);
    setUtilisateur(donnees.utilisateur);
    return donnees.utilisateur;
  }, []);

  const deconnexion = useCallback(async () => {
    await authService.deconnexion();
    setUtilisateur(null);
  }, []);

  const estAuthentifie = Boolean(utilisateur);

  const aLeRole = useCallback((...roles) => {
    return utilisateur && roles.includes(utilisateur.role);
  }, [utilisateur]);

  return (
    <AuthContext.Provider value={{ utilisateur, chargement, estAuthentifie, connexion, deconnexion, aLeRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
};

export default AuthContext;
