import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useProduits = (params = {}) =>
  useQuery({
    queryKey: ['produits', params],
    queryFn: () => api.get('/produits', { params }).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

export const useProduit = (id) =>
  useQuery({
    queryKey: ['produits', id],
    queryFn: () => api.get(`/produits/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
