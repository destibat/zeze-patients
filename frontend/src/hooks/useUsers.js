import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import userService from '../services/userService';

const CLE_USERS = 'users';

export const useUsers = (filtres = {}) => {
  return useQuery({
    queryKey: [CLE_USERS, filtres],
    queryFn: () => userService.lister(filtres),
  });
};

export const useUser = (id) => {
  return useQuery({
    queryKey: [CLE_USERS, id],
    queryFn: () => userService.obtenir(id),
    enabled: Boolean(id),
  });
};

export const useCreerUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.creer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CLE_USERS] }),
  });
};

export const useModifierUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => userService.modifier(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CLE_USERS] }),
  });
};

export const useDesactiverUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.desactiver,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CLE_USERS] }),
  });
};

export const useReactiverUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.reactiver,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CLE_USERS] }),
  });
};

export const useSupprimerUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.supprimer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CLE_USERS] }),
  });
};

export const useReinitialiserMdp = () =>
  useMutation({
    mutationFn: ({ id, nouveauMotDePasse }) => userService.reinitialiserMdp(id, nouveauMotDePasse),
  });
