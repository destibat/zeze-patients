import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const cle = (patientId) => ['analyses-bio', patientId];

export function useAnalysesBio(patientId) {
  return useQuery({
    queryKey: cle(patientId),
    queryFn: () => api.get(`/patients/${patientId}/analyses-bio`).then((r) => r.data),
    enabled: !!patientId,
  });
}

export function useCreerAnalyseBio(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/patients/${patientId}/analyses-bio`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cle(patientId) }),
  });
}

export function useModifierAnalyseBio(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      api.put(`/patients/${patientId}/analyses-bio/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cle(patientId) }),
  });
}

export function useSupprimerAnalyseBio(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/patients/${patientId}/analyses-bio/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cle(patientId) }),
  });
}
