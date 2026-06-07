import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const CLE = 'bons-commande-mapa';

export const useBonsCommandeMapa = () =>
  useQuery({
    queryKey: [CLE],
    queryFn: () => api.get('/bons-commande-mapa').then((r) => r.data),
  });

export const useCreerBonCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/bons-commande-mapa', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};

export const useMettreAJourBC = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      api.put(`/bons-commande-mapa/${id}`, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: [CLE, id] });
    },
  });
};

export const useConfirmerBC = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/bons-commande-mapa/${id}/confirmer`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};

export const useSupprimerBC = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/bons-commande-mapa/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};
