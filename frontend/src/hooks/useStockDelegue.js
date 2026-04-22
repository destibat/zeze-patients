import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useMonStock = (enabled = true) =>
  useQuery({
    queryKey: ['stock-delegue'],
    queryFn: () => api.get('/stock-delegue').then((r) => r.data),
    enabled,
  });

export const useStatsStockDelegue = (enabled = true) =>
  useQuery({
    queryKey: ['stock-delegue-stats'],
    queryFn: () => api.get('/stock-delegue/stats').then((r) => r.data),
    enabled,
    refetchInterval: 60 * 1000,
  });

export const useAcheterStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/stock-delegue/acheter', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-delegue'] });
      qc.invalidateQueries({ queryKey: ['stock-delegue-stats'] });
    },
  });
};

export const useVendreStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/stock-delegue/vendre', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-delegue'] });
      qc.invalidateQueries({ queryKey: ['stock-delegue-stats'] });
      qc.invalidateQueries({ queryKey: ['ventes-delegue'] });
    },
  });
};

export const useMesVentes = () =>
  useQuery({
    queryKey: ['ventes-delegue'],
    queryFn: () => api.get('/stock-delegue/ventes').then((r) => r.data),
  });

export const useGainsDelegues = (enabled = true) =>
  useQuery({
    queryKey: ['gains-delegues'],
    queryFn: () => api.get('/stock-delegue/gains-delegues').then((r) => r.data),
    enabled,
    refetchInterval: 60 * 1000,
  });

export const useVentesDirectesDelegues = (enabled = true) =>
  useQuery({
    queryKey: ['ventes-directes-delegues'],
    queryFn: () => api.get('/stock-delegue/ventes-directes').then((r) => r.data),
    enabled,
  });

export const useVentesEnAttente = (enabled = true) =>
  useQuery({
    queryKey: ['ventes-en-attente'],
    queryFn: () => api.get('/stock-delegue/ventes-en-attente').then((r) => r.data),
    enabled,
    refetchInterval: 30 * 1000,
  });

export const useValiderVente = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode_paiement }) =>
      api.put(`/stock-delegue/${id}/valider`, { mode_paiement }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventes-en-attente'] });
      qc.invalidateQueries({ queryKey: ['gains-delegues'] });
      qc.invalidateQueries({ queryKey: ['ventes-directes-delegues'] });
    },
  });
};

export const useRefuserVente = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.put(`/stock-delegue/${id}/refuser`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventes-en-attente'] });
      qc.invalidateQueries({ queryKey: ['gains-delegues'] });
    },
  });
};
