import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useFichiersPatient = (patientId) =>
  useQuery({
    queryKey: ['fichiers-patient', patientId],
    queryFn: () => api.get(`/patients/${patientId}/fichiers`).then((r) => r.data),
    enabled: !!patientId,
  });

export const useUploaderFichier = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) =>
      api.post(`/patients/${patientId}/fichiers`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fichiers-patient', patientId] }),
  });
};

export const useSupprimerFichier = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fichierId) =>
      api.delete(`/patients/${patientId}/fichiers/${fichierId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fichiers-patient', patientId] }),
  });
};
