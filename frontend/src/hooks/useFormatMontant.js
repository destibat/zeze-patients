import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { creerFormateur } from '../utils/devises';

const useFormatMontant = () => {
  const { utilisateur } = useAuth();
  const devise = utilisateur?.devise || 'XOF';
  return useMemo(() => creerFormateur(devise), [devise]);
};

export default useFormatMontant;
