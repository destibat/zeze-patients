import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useExerciceActuel = () =>
  useQuery({
    queryKey: ['exercice-actuel'],
    queryFn: () => api.get('/exercices/actuel').then((r) => r.data),
    refetchInterval: 2 * 60 * 1000, // rafraîchit le CA toutes les 2 min
    staleTime: 30 * 1000,
  });

export const useExercices = (params = {}) =>
  useQuery({
    queryKey: ['exercices', params],
    queryFn: () => api.get('/exercices', { params }).then((r) => r.data),
  });

export const useExercice = (id) =>
  useQuery({
    queryKey: ['exercices', id],
    queryFn: () => api.get(`/exercices/${id}`).then((r) => r.data),
    enabled: !!id,
  });

export const useBilanExercice = (id) =>
  useQuery({
    queryKey: ['exercices', id, 'bilan'],
    queryFn: () => api.get(`/exercices/${id}/bilan`).then((r) => r.data),
    enabled: !!id,
  });

export const useOuvrirExercice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data = {}) => api.post('/exercices/ouvrir', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercice-actuel'] });
      qc.invalidateQueries({ queryKey: ['exercices'] });
    },
  });
};

export const useCloturerExercice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/exercices/${id}/cloturer`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercice-actuel'] });
      qc.invalidateQueries({ queryKey: ['exercices'] });
    },
  });
};

export const useRouvrirExercice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }) => api.post(`/exercices/${id}/rouvrir`, { motif }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercice-actuel'] });
      qc.invalidateQueries({ queryKey: ['exercices'] });
    },
  });
};
