import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useAbonnement = () => {
  const { utilisateur } = useAuth();
  return useQuery({
    queryKey: ['abonnement-statut'],
    queryFn: () => api.get('/abonnement/statut').then((r) => r.data),
    enabled: !!utilisateur,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
