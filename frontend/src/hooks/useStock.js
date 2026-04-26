import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useAlertesStock = (enabled = true) =>
  useQuery({
    queryKey: ['stock-alertes'],
    queryFn: () => api.get('/stock/alertes').then((r) => r.data),
    enabled,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

export const useMettreAJourSeuil = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ produitId, seuil_alerte }) =>
      api.put(`/stock/${produitId}/seuil`, { seuil_alerte }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-alertes'] });
    },
  });
};
