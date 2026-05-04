import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const CLE = 'commandes-appro';

export const useCommandesAppro = () =>
  useQuery({
    queryKey: [CLE],
    queryFn: () => api.get('/commandes-appro').then((r) => r.data),
    refetchInterval: 30 * 1000,
  });

export const useBrouillon = (enabled = true) =>
  useQuery({
    queryKey: [CLE, 'brouillon'],
    queryFn: () => api.get('/commandes-appro/brouillon').then((r) => r.data),
    enabled,
  });

export const useMettreAJourLignes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lignes) => api.put('/commandes-appro/brouillon/lignes', { lignes }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE, 'brouillon'] }),
  });
};

export const useEnvoyerCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/commandes-appro/brouillon/envoyer', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: [CLE, 'brouillon'] });
    },
  });
};

export const useSupprimerBrouillon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/commandes-appro/brouillon').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: [CLE, 'brouillon'] });
    },
  });
};

export const useCommandeApproParId = (id) =>
  useQuery({
    queryKey: [CLE, id],
    queryFn: () => api.get(`/commandes-appro/${id}`).then((r) => r.data),
    enabled: !!id,
  });

export const useMettreAJourLignesParId = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lignes }) => api.put(`/commandes-appro/${id}/lignes`, { lignes }).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [CLE, id] });
      qc.invalidateQueries({ queryKey: [CLE] });
    },
  });
};

export const useEnvoyerCommandeParId = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes_revendeur }) =>
      api.post(`/commandes-appro/${id}/envoyer`, { notes_revendeur }).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [CLE, id] });
      qc.invalidateQueries({ queryKey: [CLE] });
    },
  });
};

export const useValiderCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes_stockiste }) =>
      api.post(`/commandes-appro/${id}/valider`, { notes_stockiste }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-alertes'] });
      qc.invalidateQueries({ queryKey: ['factures-achat'] });
    },
  });
};

export const useRefuserCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes_stockiste }) =>
      api.post(`/commandes-appro/${id}/refuser`, { notes_stockiste }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};
