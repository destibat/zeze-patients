import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useRendezVous = (params = {}) =>
  useQuery({
    queryKey: ['rendez-vous', params],
    queryFn: () => api.get('/rendez-vous', { params }).then((r) => r.data),
  });

export const useCreerRendezVous = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/rendez-vous', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rendez-vous'] }),
  });
};

export const useModifierRendezVous = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/rendez-vous/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rendez-vous'] }),
  });
};

export const useSupprimerRendezVous = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/rendez-vous/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rendez-vous'] }),
  });
};
