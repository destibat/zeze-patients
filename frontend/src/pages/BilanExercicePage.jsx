import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBilanExercice, useExercice } from '../hooks/useExercices';
import { AperçuBilan } from './ExercicesPage';
import Button from '../components/ui/Button';
import { ArrowLeft, Printer, Loader2, FileText, Download, Users, Package, User } from 'lucide-react';
import api from '../services/api';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ── Téléchargement d'un PDF via l'API (JWT géré par axios) ───────────────────
const telechargerPDF = async (url, nomFichier, setChargement) => {
  setChargement(true);
  try {
    const response = await api.get(url, { responseType: 'blob', timeout: 30000 });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } finally {
    setChargement(false);
  }
};

// ── Section fiches PDF ────────────────────────────────────────────────────────
const SectionFichesPDF = ({ exerciceId, exerciceNumero, delegues = [] }) => {
  const [parrainNom, setParrainNom] = useState('');
  const [chargements, setChargements] = useState({});

  const setChargement = (cle, val) =>
    setChargements((prev) => ({ ...prev, [cle]: val }));

  return (
    <div className="carte space-y-4 print:hidden">
      <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
        <FileText size={15} className="text-zeze-vert" />
        Fiches exportables (PDF)
      </h2>

      {/* Fiche MAPA */}
      <div className="border border-bordure rounded-bouton p-3 space-y-2">
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Fiche MAPA</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-texte-secondaire mb-1">Nom du parrain (optionnel)</label>
            <input
              type="text"
              value={parrainNom}
              onChange={(e) => setParrainNom(e.target.value)}
              placeholder="Ex : Jean-Pierre Kouassi"
              className="champ-input text-sm w-full"
            />
          </div>
          <Button
            variante="secondaire"
            icone={Download}
            chargement={chargements['mapa']}
            onClick={() =>
              telechargerPDF(
                `/exercices/${exerciceId}/fiches/mapa.pdf${parrainNom ? `?parrain=${encodeURIComponent(parrainNom)}` : ''}`,
                `fiche-mapa-${exerciceNumero}.pdf`,
                (v) => setChargement('mapa', v)
              )
            }
          >
            Exporter fiche MAPA
          </Button>
          <Button
            variante="fantome"
            icone={Package}
            chargement={chargements['produits']}
            onClick={() =>
              telechargerPDF(
                `/exercices/${exerciceId}/fiches/detail-produits.pdf`,
                `detail-produits-${exerciceNumero}.pdf`,
                (v) => setChargement('produits', v)
              )
            }
          >
            Détail produits
          </Button>
        </div>
      </div>

      {/* Récap revendeurs */}
      <div className="border border-bordure rounded-bouton p-3 space-y-2">
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Fiches revendeurs</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secondaire"
            icone={Users}
            chargement={chargements['recap']}
            onClick={() =>
              telechargerPDF(
                `/exercices/${exerciceId}/fiches/recap-delegues.pdf`,
                `recap-delegues-${exerciceNumero}.pdf`,
                (v) => setChargement('recap', v)
              )
            }
          >
            Récap tous revendeurs
          </Button>
        </div>

        {/* Bilan individuel par revendeur */}
        {delegues.length > 0 && (
          <div className="pt-2 border-t border-bordure">
            <p className="text-xs text-texte-secondaire mb-2">Bilan individuel par revendeur :</p>
            <div className="flex flex-wrap gap-2">
              {delegues.map((d) => (
                <Button
                  key={d.id}
                  variante="fantome"
                  icone={User}
                  chargement={chargements[`delegue-${d.id}`]}
                  onClick={() =>
                    telechargerPDF(
                      `/exercices/${exerciceId}/fiches/delegue/${d.id}.pdf`,
                      `bilan-delegue-${d.nom.toLowerCase().replace(/\s+/g, '-')}-${exerciceNumero}.pdf`,
                      (v) => setChargement(`delegue-${d.id}`, v)
                    )
                  }
                >
                  {d.nom}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BilanExercicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: exerciceData, isLoading: loadExercice } = useExercice(id);
  const { data: bilanData, isLoading: loadBilan } = useBilanExercice(id);

  const exercice = exerciceData?.exercice ?? exerciceData;
  const bilan = bilanData?.bilan ?? bilanData;

  const isLoading = loadExercice || loadBilan;

  return (
    <div className="max-w-3xl space-y-6 print:max-w-none print:space-y-4">
      {/* En-tête — masqué à l'impression */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variante="fantome" icone={ArrowLeft} onClick={() => navigate('/exercices')}>
            Exercices
          </Button>
          {exercice && (
            <h1 className="text-xl font-titres font-bold text-texte-principal">
              Bilan — {exercice.numero}
            </h1>
          )}
        </div>
        <Button variante="secondaire" icone={Printer} onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>

      {/* En-tête impression */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">
          Bilan exercice {exercice?.numero ?? ''}
        </h1>
        {exercice && (
          <p className="text-sm text-gray-600 mt-1">
            Du {fmtDate(exercice.date_ouverture)} au {exercice.date_cloture ? fmtDate(exercice.date_cloture) : 'aujourd\'hui'}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">Imprimé le {fmtDate(new Date())}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-texte-secondaire gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Chargement du bilan…</span>
        </div>
      )}

      {!isLoading && bilan && (
        <>
          <div className="carte">
            <AperçuBilan bilan={bilan} exercice={exercice} />
          </div>

          <SectionFichesPDF
            exerciceId={id}
            exerciceNumero={exercice?.numero ?? id}
            delegues={bilan.par_delegue ?? []}
          />
        </>
      )}

      {!isLoading && !bilan && (
        <p className="text-sm text-texte-secondaire text-center py-10">Aucun bilan disponible.</p>
      )}
    </div>
  );
};

export default BilanExercicePage;
