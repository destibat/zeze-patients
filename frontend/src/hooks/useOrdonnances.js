import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useOrdonnance = (id) =>
  useQuery({
    queryKey: ['ordonnance', id],
    queryFn: () => api.get(`/ordonnances/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

export const useModifierOrdonnance = (id, patientId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put(`/ordonnances/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordonnance', id] });
      if (patientId) qc.invalidateQueries({ queryKey: ['consultations', patientId] });
    },
  });
};

export const telechargerPDF = async (id, numero) => {
  const response = await api.get(`/ordonnances/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ordonnance-${numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
