import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useConsultations = (patientId) =>
  useQuery({
    queryKey: ['consultations', patientId],
    queryFn: () => api.get(`/patients/${patientId}/consultations`).then((r) => r.data),
    enabled: Boolean(patientId),
  });

export const useConsultation = (id) =>
  useQuery({
    queryKey: ['consultation', id],
    queryFn: () => api.get(`/patients/_/consultations/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

export const useCreerConsultation = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/patients/${patientId}/consultations`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultations', patientId] }),
  });
};

export const useModifierConsultation = (patientId, consultationId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.put(`/patients/${patientId}/consultations/${consultationId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultations', patientId] });
      qc.invalidateQueries({ queryKey: ['consultation', consultationId] });
    },
  });
};

export const useSupprimerConsultation = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      api.delete(`/patients/${patientId}/consultations/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultations', patientId] }),
  });
};

export const useCreerOrdonnance = (patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ consultationId, ...data }) =>
      api
        .post(`/patients/${patientId}/consultations/${consultationId}/ordonnances`, data)
        .then((r) => r.data),
    onSuccess: (_, { consultationId }) => {
      qc.invalidateQueries({ queryKey: ['consultations', patientId] });
      qc.invalidateQueries({ queryKey: ['consultation', patientId, consultationId] });
    },
  });
};
