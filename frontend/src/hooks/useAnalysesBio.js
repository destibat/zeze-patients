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
    // Pas d'invalidation — l'extraction ne sauvegarde plus en base
  });
}

export function useModifierAnalyseBio(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ analyseId, data }) =>
      api.put(`/patients/${patientId}/analyses-bio/${analyseId}`, data).then((r) => r.data),
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

const telechargerFichier = async (url, filename, mimeType) => {
  const resp = await api.get(url, { responseType: 'blob', timeout: 60000 });
  const objectUrl = window.URL.createObjectURL(new Blob([resp.data], { type: mimeType }));
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { window.URL.revokeObjectURL(objectUrl); document.body.removeChild(a); }, 1000);
};

export function useTelechargePdfAnalyse(patientId) {
  return useMutation({
    mutationFn: (analyseId) => telechargerFichier(
      `/patients/${patientId}/analyses-bio/${analyseId}/pdf`,
      `analyse_${analyseId}.pdf`,
      'application/pdf',
    ),
  });
}

export function useTelechargeDocxAnalyse(patientId) {
  return useMutation({
    mutationFn: (analyseId) => telechargerFichier(
      `/patients/${patientId}/analyses-bio/${analyseId}/docx`,
      `analyse_${analyseId}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
  });
}

export function useCreerEtAnalyserIA(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => {
      // Si data est une FormData (contient les fichiers originaux) → route multipart dédiée
      if (data instanceof FormData) {
        return api.post(
          `/patients/${patientId}/analyses-bio/analyser-documents`,
          data,
          { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 },
        ).then((r) => r.data);
      }
      // Sinon JSON classique (sans fichiers)
      return api.post(
        `/patients/${patientId}/analyses-bio`,
        { ...data, lancer_ia: true },
        { timeout: 120000 },
      ).then((r) => r.data);
    },
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
