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

export function useExtraireAnalyseBio(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fichiers) => {
      const form = new FormData();
      const liste = Array.isArray(fichiers) ? fichiers : [fichiers];
      liste.forEach((f) => form.append('fichiers', f));
      return api.post(`/patients/${patientId}/analyses-bio/extraire`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cle(patientId) }),
  });
}

export function useCreerAnalyseBio(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/patients/${patientId}/analyses-bio`, data).then((r) => r.data),
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

export function useAnalyserAvecIA(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (analyseId) => api.post(
      `/patients/${patientId}/analyses-bio/${analyseId}/analyser`,
      {},
      { timeout: 120000 },
    ).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cle(patientId) }),
  });
}
