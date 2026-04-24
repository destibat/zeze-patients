import { useRef, useState } from 'react';
import { useFichiersPatient, useUploaderFichier, useSupprimerFichier } from '../../../hooks/useFichiersPatient';
import { Upload, FileText, Trash2, Download, Loader2, FolderOpen } from 'lucide-react';
import Alert from '../../../components/ui/Alert';

const CATEGORIES = {
  resultat_analyse: 'Résultat d\'analyse',
  ordonnance_externe: 'Ordonnance externe',
  imagerie: 'Imagerie',
  autre: 'Autre',
};

const TYPES_ACCEPTES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
];

const formatTaille = (octets) => {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
};

const iconeType = (mime) => {
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  return '📎';
};

const SectionFichiers = ({ patientId, peutSupprimer = false }) => {
  const inputRef = useRef(null);
  const [categorie, setCategorie] = useState('autre');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const { data: fichiers = [], isLoading } = useFichiersPatient(patientId);
  const uploader = useUploaderFichier(patientId);
  const supprimer = useSupprimerFichier(patientId);

  const handleFichier = async (e) => {
    const fichier = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = '';
    if (!fichier) return;

    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setErreur('Format non accepté. Utilisez PDF, JPG, PNG ou GIF.');
      return;
    }
    if (fichier.size > 20 * 1024 * 1024) {
      setErreur('Le fichier dépasse la limite de 20 Mo.');
      return;
    }

    setErreur('');
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('categorie', categorie);

    try {
      await uploader.mutateAsync(formData);
      setSucces(`"${fichier.name}" ajouté au dossier.`);
      setTimeout(() => setSucces(''), 4000);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'upload.');
    }
  };

  const handleSupprimer = async (f) => {
    if (!window.confirm(`Supprimer "${f.nom_original}" ?`)) return;
    try {
      await supprimer.mutateAsync(f.id);
    } catch {
      setErreur('Erreur lors de la suppression.');
    }
  };

  return (
    <div className="space-y-4">
      {erreur && <Alert type="erreur" message={erreur} fermable onFermer={() => setErreur('')} />}
      {succes && <Alert type="succes" message={succes} />}

      {/* Zone d'upload */}
      <div className="border-2 border-dashed border-bordure rounded-carte p-5 bg-fond-secondaire/50">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 space-y-2 w-full">
            <label className="block text-sm font-medium text-texte-principal">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="champ-input"
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex-shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              className="hidden"
              onChange={handleFichier}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploader.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zeze-vert text-white text-sm font-medium rounded-bouton hover:bg-zeze-vert-fonce disabled:opacity-50 transition-colors"
            >
              {uploader.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploader.isPending ? 'Envoi…' : 'Ajouter un fichier'}
            </button>
          </div>
        </div>
        <p className="text-xs text-texte-secondaire mt-2">PDF, JPG, PNG, GIF — 20 Mo max.</p>
      </div>

      {/* Liste des fichiers */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={24} className="animate-spin text-texte-secondaire" />
        </div>
      ) : fichiers.length === 0 ? (
        <div className="text-center py-10 text-texte-secondaire">
          <FolderOpen size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm italic">Aucun document dans ce dossier</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fichiers.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-white border border-bordure rounded-bouton hover:border-zeze-vert/40 transition-colors">
              <span className="text-xl flex-shrink-0">{iconeType(f.type_mime)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-texte-principal truncate">{f.nom_original}</p>
                <p className="text-xs text-texte-secondaire">
                  {CATEGORIES[f.categorie]} · {formatTaille(f.taille)} ·{' '}
                  {new Date(f.created_at).toLocaleDateString('fr-FR')}
                  {f.auteur && ` · ${f.auteur.prenom} ${f.auteur.nom}`}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={`/uploads/${f.nom_stocke}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                  title="Ouvrir"
                >
                  <Download size={15} />
                </a>
                {peutSupprimer && (
                  <button
                    onClick={() => handleSupprimer(f)}
                    className="p-1.5 text-texte-secondaire hover:text-medical-critique rounded"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionFichiers;
