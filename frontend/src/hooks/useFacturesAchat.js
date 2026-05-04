import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useFacturesAchat = () =>
  useQuery({
    queryKey: ['factures-achat'],
    queryFn: () => api.get('/factures-achat').then((r) => r.data),
  });

// Revendeur : paiement envoyé
export const useMarquerEnvoye = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode_paiement }) =>
      api.patch(`/factures-achat/${id}/envoyer`, { mode_paiement }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures-achat'] });
      qc.invalidateQueries({ queryKey: ['commandes-appro'] });
    },
  });
};

// Stockiste : paiement reçu confirmé
export const useMarquerPaye = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      api.patch(`/factures-achat/${id}/payer`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures-achat'] });
      qc.invalidateQueries({ queryKey: ['commandes-appro'] });
    },
  });
};
