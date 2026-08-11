import useFichierProtege from '../../hooks/useFichierProtege';

// <img> pour fichiers protégés (/uploads) : affiche le fallback tant que le
// blob n'est pas chargé (ou si src est vide / en erreur)
const ImageProtegee = ({ src, fallback = null, alt = '', ...props }) => {
  const { blobUrl } = useFichierProtege(src);
  if (!blobUrl) return fallback;
  return <img src={blobUrl} alt={alt} {...props} />;
};

export default ImageProtegee;
