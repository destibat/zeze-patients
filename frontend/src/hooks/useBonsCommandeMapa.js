import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const CLE = 'bons-commande-mapa';

export const useBonsCommandeMapa = () =>
  useQuery({
    queryKey: [CLE],
    queryFn: () => api.get('/bons-commande-mapa').then((r) => r.data),
  });

export const useBonCommandeMapaParId = (id) =>
  useQuery({
    queryKey: [CLE, id],
    queryFn: () => api.get(`/bons-commande-mapa/${id}`).then((r) => r.data),
    enabled: !!id,
  });

export const useCreerBonCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/bons-commande-mapa').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};

export const useMettreAJourBC = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lignes, notes }) =>
      api.put(`/bons-commande-mapa/${id}`, { lignes, notes }).then((r) => r.data),
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
    mutationFn: (id) => api.delete(`/bons-commande-mapa/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};
