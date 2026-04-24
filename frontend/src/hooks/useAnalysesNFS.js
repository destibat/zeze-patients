import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useAnalysesNFS = (patientId) =>
  useQuery({
    queryKey: ['analyses-nfs', patientId],
    queryFn: () => api.get(`/patients/${patientId}/analyses-nfs`).then((r) => r.data),
    enabled: !!patientId,
  });

export const useCreerAnalyseNFS = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/patients/${patientId}/analyses-nfs`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses-nfs', patientId] }),
  });
};

export const useModifierAnalyseNFS = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ analyseId, ...data }) =>
      api.put(`/patients/${patientId}/analyses-nfs/${analyseId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses-nfs', patientId] }),
  });
};

export const useSupprimerAnalyseNFS = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (analyseId) =>
      api.delete(`/patients/${patientId}/analyses-nfs/${analyseId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses-nfs', patientId] }),
  });
};

export const useExtraireNFS = (patientId) =>
  useMutation({
    mutationFn: (fichier) => {
      const fd = new FormData();
      fd.append('fichier', fichier);
      return api.post(`/patients/${patientId}/analyses-nfs/extraire`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
  });
