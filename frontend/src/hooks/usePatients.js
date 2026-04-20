import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import patientService from '../services/patientService';

const CLE = 'patients';

export const usePatients = (filtres = {}) =>
  useQuery({ queryKey: [CLE, filtres], queryFn: () => patientService.lister(filtres) });

export const usePatient = (id) =>
  useQuery({ queryKey: [CLE, id], queryFn: () => patientService.obtenir(id), enabled: Boolean(id) });

export const useCreerPatient = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: patientService.creer, onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }) });
};

export const useModifierPatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => patientService.modifier(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }),
  });
};

export const useArchiverPatient = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: patientService.archiver, onSuccess: () => qc.invalidateQueries({ queryKey: [CLE] }) });
};
