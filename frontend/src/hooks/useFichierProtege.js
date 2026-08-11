import { useState, useEffect } from 'react';
import api from '../services/api';

// /uploads exige désormais le token JWT : on récupère les fichiers via axios
// (en-tête Authorization + refresh auto) et on expose une URL blob locale.

// Téléchargement direct (bouton "Télécharger")
export const telechargerFichierProtege = async (url, nomFichier) => {
  const { data } = await api.get(url, { baseURL: '', responseType: 'blob', timeout: 60000 });
  const objectUrl = URL.createObjectURL(data);
  const lien = document.createElement('a');
  lien.href = objectUrl;
  lien.download = nomFichier || '';
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(objectUrl);
};

// Hook d'affichage : renvoie une URL blob utilisable dans <img>/<iframe>
const useFichierProtege = (url) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!url) return undefined;
    let objectUrl = null;
    let annule = false;
    setBlobUrl(null);
    setErreur(false);

    api.get(url, { baseURL: '', responseType: 'blob', timeout: 60000 })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (annule) URL.revokeObjectURL(objectUrl);
        else setBlobUrl(objectUrl);
      })
      .catch(() => { if (!annule) setErreur(true); });

    return () => {
      annule = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { blobUrl, erreur };
};

export default useFichierProtege;
