import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const CLE = 'prets-emprunts';

export const usePretEmprunts = (params = {}) =>
  useQuery({
    queryKey: [CLE, params],
    queryFn: () => api.get('/prets-emprunts', { params }).then((r) => r.data),
    refetchInterval: 30 * 1000,
  });

export const useStatsPretEmprunts = () =>
  useQuery({
    queryKey: [CLE, 'stats'],
    queryFn: () => api.get('/prets-emprunts/stats').then((r) => r.data),
    refetchInterval: 60 * 1000,
  });

export const usePretEmprunt = (id) =>
  useQuery({
    queryKey: [CLE, id],
    queryFn: () => api.get(`/prets-emprunts/${id}`).then((r) => r.data),
    enabled: !!id,
  });

export const useCreerPretEmprunt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/prets-emprunts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-alertes'] });
    },
  });
};

export const useRetournerPretEmprunt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      api.patch(`/prets-emprunts/${id}/retourner`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-alertes'] });
    },
  });
};

export const useModifierPretEmprunt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      api.patch(`/prets-emprunts/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};

export const useSupprimerPretEmprunt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/prets-emprunts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-alertes'] });
    },
  });
};
