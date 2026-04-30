import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useFacturesAchat = () =>
  useQuery({
    queryKey: ['factures-achat'],
    queryFn: () => api.get('/factures-achat').then((r) => r.data),
  });

export const useMarquerPaye = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode_paiement }) =>
      api.patch(`/factures-achat/${id}/payer`, { mode_paiement }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures-achat'] });
    },
  });
};
