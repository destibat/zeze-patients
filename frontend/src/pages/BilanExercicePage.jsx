import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBilanExercice, useExercice } from '../hooks/useExercices';
import { AperçuBilan } from './ExercicesPage';
import Button from '../components/ui/Button';
import { ArrowLeft, Printer, Loader2, FileText, Download, Users, User, TrendingUp } from 'lucide-react';
import api from '../services/api';
import useFormatMontant from '../hooks/useFormatMontant';

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

// ── Bilan MAPA (affichage écran) ──────────────────────────────────────────────
const SectionBilanMapa = ({ bilan, exerciceId, exerciceNumero }) => {
  const { formatMontant } = useFormatMontant();
  const [parrainNom, setParrainNom] = useState('');
  const [chargement, setChargementPdf] = useState(false);

  const gainBrut        = bilan.commissions_stockistes || 0;
  const partParrain     = Math.round(gainBrut * 0.10);
  const beneficeNet     = gainBrut - partParrain;
  const caTotal         = bilan.ca_total || 0;
  const montantMapa     = caTotal - gainBrut;

  const lignesPct = (val) =>
    caTotal > 0 ? `${((val / caTotal) * 100).toFixed(1)} %` : '—';

  const produits = [...(bilan.top_produits || [])].sort((a, b) => b.ca - a.ca);
  const totalProduits = produits.reduce((s, p) => s + (p.ca || 0), 0);

  return (
    <div className="carte space-y-5 print:hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
          <TrendingUp size={15} className="text-zeze-vert" />
          Bilan MAPA
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={parrainNom}
            onChange={(e) => setParrainNom(e.target.value)}
            placeholder="Nom du parrain (optionnel)"
            className="champ-input text-sm w-52"
          />
          <Button
            variante="secondaire"
            icone={Download}
            chargement={chargement}
            onClick={() =>
              telechargerPDF(
                `/exercices/${exerciceId}/fiches/mapa.pdf${parrainNom ? `?parrain=${encodeURIComponent(parrainNom)}` : ''}`,
                `fiche-mapa-${exerciceNumero}.pdf`,
                setChargementPdf,
              )
            }
          >
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Tableau répartition financière */}
      <div>
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Répartition financière</p>
        <div className="overflow-x-auto rounded-bouton border border-bordure">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs text-texte-secondaire uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-semibold">Ligne</th>
                <th className="px-4 py-2 text-right font-semibold">% du CA</th>
                <th className="px-4 py-2 text-right font-semibold">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              <tr className="bg-gray-50">
                <td className="px-4 py-2.5 text-texte-principal">Montant total vendu</td>
                <td className="px-4 py-2.5 text-right text-texte-secondaire font-mono text-xs">100,0 %</td>
                <td className="px-4 py-2.5 text-right font-semibold font-mono text-texte-principal">{formatMontant(caTotal)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-texte-principal">Bénéfice brut stockiste</td>
                <td className="px-4 py-2.5 text-right text-texte-secondaire font-mono text-xs">{lignesPct(gainBrut)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-texte-principal">{formatMontant(gainBrut)}</td>
              </tr>
              <tr className="bg-orange-50">
                <td className="px-4 py-2.5 text-texte-principal">
                  Part du parrain direct
                  <span className="ml-1 text-xs text-texte-secondaire">(10 % du bénéfice brut)</span>
                </td>
                <td className="px-4 py-2.5 text-right text-texte-secondaire font-mono text-xs">{lignesPct(partParrain)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-orange-700">{formatMontant(partParrain)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-texte-principal">
                  Bénéfice net stockiste
                  <span className="ml-1 text-xs text-texte-secondaire">(brut − part parrain)</span>
                </td>
                <td className="px-4 py-2.5 text-right text-texte-secondaire font-mono text-xs">{lignesPct(beneficeNet)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-texte-principal">{formatMontant(beneficeNet)}</td>
              </tr>
              <tr className="bg-zeze-vert-fonce text-white">
                <td className="px-4 py-3 font-bold">Montant total versé à MAPA</td>
                <td className="px-4 py-3 text-right font-mono text-sm text-white/80">{lignesPct(montantMapa)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-base">{formatMontant(montantMapa)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-texte-secondaire mt-1.5 italic">
          Vérification : CA total ({formatMontant(caTotal)}) = Bénéfice brut ({formatMontant(gainBrut)}) + Montant MAPA ({formatMontant(montantMapa)})
        </p>
      </div>

      {/* Liste des produits vendus (payés uniquement) */}
      {produits.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">
            Produits vendus — payés uniquement
          </p>
          <div className="overflow-x-auto rounded-bouton border border-bordure">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-xs text-texte-secondaire uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-semibold">Produit</th>
                  <th className="px-4 py-2 text-right font-semibold">Qté</th>
                  <th className="px-4 py-2 text-right font-semibold">CA</th>
                  <th className="px-4 py-2 text-right font-semibold">% CA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bordure">
                {produits.map((p, i) => (
                  <tr key={p.nom} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2 text-texte-principal">{p.nom}</td>
                    <td className="px-4 py-2 text-right font-mono text-texte-secondaire">{p.quantite}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatMontant(p.ca)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-texte-secondaire">
                      {totalProduits > 0 ? `${((p.ca / totalProduits) * 100).toFixed(1)} %` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold text-sm">
                  <td className="px-4 py-2.5 text-texte-principal">TOTAL</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {produits.reduce((s, p) => s + (p.quantite || 0), 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatMontant(totalProduits)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-texte-secondaire">100,0 %</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Section fiches PDF ────────────────────────────────────────────────────────
const SectionFichesPDF = ({ exerciceId, exerciceNumero, delegues = [], stockistes = [] }) => {
  const [chargements, setChargements] = useState({});

  const setChargement = (cle, val) =>
    setChargements((prev) => ({ ...prev, [cle]: val }));

  return (
    <div className="carte space-y-4 print:hidden">
      <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
        <FileText size={15} className="text-zeze-vert" />
        Fiches exportables (PDF)
      </h2>

      {/* Bilan stockiste */}
      {stockistes.length > 0 && (
        <div className="border border-bordure rounded-bouton p-3 space-y-2">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Bilan stockiste</p>
          <div className="flex flex-wrap gap-2">
            {stockistes.map((s) => (
              <Button
                key={s.id}
                variante="secondaire"
                icone={User}
                chargement={chargements[`stockiste-${s.id}`]}
                onClick={() =>
                  telechargerPDF(
                    `/exercices/${exerciceId}/fiches/stockiste/${s.id}.pdf`,
                    `bilan-stockiste-${s.nom.toLowerCase().replace(/\s+/g, '-')}-${exerciceNumero}.pdf`,
                    (v) => setChargement(`stockiste-${s.id}`, v)
                  )
                }
              >
                {s.nom}
              </Button>
            ))}
          </div>
        </div>
      )}

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

          <SectionBilanMapa bilan={bilan} exerciceId={id} exerciceNumero={exercice?.numero ?? id} />

          <SectionFichesPDF
            exerciceId={id}
            exerciceNumero={exercice?.numero ?? id}
            delegues={bilan.par_delegue ?? []}
            stockistes={bilan.par_stockiste ?? []}
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
