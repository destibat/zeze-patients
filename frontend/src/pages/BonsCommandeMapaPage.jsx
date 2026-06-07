import { useState } from 'react';
import api from '../services/api';
import { useProduits } from '../hooks/useProduits';
import {
  useBonsCommandeMapa, useCreerBonCommande, useMettreAJourBC,
  useConfirmerBC, useSupprimerBC,
} from '../hooks/useBonsCommandeMapa';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import {
  ClipboardList, Plus, X, Send, Trash2, FileText,
  CheckCircle, Clock, Package, ExternalLink,
} from 'lucide-react';
import useFormatMontant from '../hooks/useFormatMontant';

const STATUT_CFG = {
  brouillon: { label: 'Brouillon',  couleur: 'bg-gray-100 text-gray-600',    icone: Clock },
  envoye:    { label: 'Envoyé',     couleur: 'bg-blue-100 text-blue-800',    icone: CheckCircle },
  livre:     { label: 'Livré',      couleur: 'bg-green-100 text-green-800',  icone: CheckCircle },
};

const BadgeStatut = ({ statut }) => {
  const cfg  = STATUT_CFG[statut] || STATUT_CFG.brouillon;
  const Icone = cfg.icone;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.couleur}`}>
      <Icone size={10} /> {cfg.label}
    </span>
  );
};

// ── Éditeur d'un brouillon ────────────────────────────────────────────────
const EditeurBrouillon = ({ bc, produits, onClose }) => {
  const { formatMontant } = useFormatMontant();
  const mettreAJour = useMettreAJourBC();
  const confirmer   = useConfirmerBC();
  const supprimer   = useSupprimerBC();

  const [lignes, setLignes] = useState(Array.isArray(bc.lignes) ? bc.lignes : []);
  const [notes, setNotes]   = useState(bc.notes || '');
  const [erreur, setErreur] = useState('');

  const produitsDejaDans = lignes.map((l) => l.produit_id);
  const total = lignes.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0);

  const sauvegarder = (nouvelles, nouvellesNotes) => {
    const l = nouvelles !== undefined ? nouvelles : lignes;
    const n = nouvellesNotes !== undefined ? nouvellesNotes : notes;
    setLignes(l);
    mettreAJour.mutate({ id: bc.id, lignes: l, notes: n }, {
      onError: (e) => setErreur(e?.response?.data?.message || 'Erreur lors de la sauvegarde'),
    });
  };

  const ajouterProduit = (produit) => {
    if (produitsDejaDans.includes(produit.id)) return;
    sauvegarder([...lignes, {
      produit_id: produit.id,
      nom_produit: produit.nom,
      reference_mapa: produit.reference_mapa || '',
      quantite: 1,
      prix_unitaire: produit.prix_unitaire || 0,
    }]);
  };

  const retirerLigne = (idx) => sauvegarder(lignes.filter((_, i) => i !== idx));

  const modifierQte = (idx, val) => {
    const qte = Math.max(1, parseInt(val) || 1);
    sauvegarder(lignes.map((l, i) => i === idx ? { ...l, quantite: qte } : l));
  };

  const handleConfirmer = async () => {
    if (lignes.length === 0) { setErreur('Ajoutez au moins un produit avant d\'envoyer.'); return; }
    if (!window.confirm(`Envoyer le BC ${bc.numero} à MAPA ? Cette action est irréversible.`)) return;
    setErreur('');
    try {
      await confirmer.mutateAsync(bc.id);
      onClose();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la confirmation');
    }
  };

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer ce brouillon ?')) return;
    await supprimer.mutateAsync(bc.id);
    onClose();
  };

  return (
    <div className="carte space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-texte-principal flex items-center gap-2">
            <ClipboardList size={15} className="text-zeze-vert" />
            {bc.numero}
          </h2>
          <p className="text-xs text-texte-secondaire mt-0.5">Brouillon — non envoyé</p>
        </div>
        <button onClick={onClose} className="text-texte-secondaire hover:text-texte-principal">
          <X size={18} />
        </button>
      </div>

      {erreur && <Alert type="erreur" message={erreur} />}

      {/* Sélection de produits */}
      <div>
        <p className="text-xs font-medium text-texte-secondaire mb-2">Ajouter un produit</p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {produits
            .filter((p) => !produitsDejaDans.includes(p.id))
            .map((p) => (
              <button
                key={p.id}
                onClick={() => ajouterProduit(p)}
                disabled={mettreAJour.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-bouton transition-colors disabled:opacity-50 ${
                  p.actif
                    ? 'border-zeze-vert text-zeze-vert hover:bg-zeze-vert/10'
                    : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Plus size={11} /> {p.nom}{!p.actif && ' (désactivé)'} — {formatMontant(p.prix_unitaire)}
              </button>
            ))}
          {produits.filter((p) => !produitsDejaDans.includes(p.id)).length === 0 && (
            <p className="text-xs text-texte-secondaire italic">Tous les produits sont déjà dans la commande.</p>
          )}
        </div>
      </div>

      {/* Tableau des lignes */}
      {lignes.length > 0 ? (
        <div className="border border-bordure rounded-carte overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-fond-secondaire">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-texte-secondaire">Produit</th>
                <th className="text-center px-2 py-2 text-xs font-semibold text-texte-secondaire w-28">Quantité</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-texte-secondaire hidden sm:table-cell">Prix unit.</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-texte-secondaire">Sous-total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, idx) => (
                <tr key={idx} className="border-t border-bordure">
                  <td className="px-3 py-2 text-xs font-medium text-texte-principal">{l.nom_produit}</td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number" min={1} value={l.quantite}
                      onChange={(e) => modifierQte(idx, e.target.value)}
                      className="w-16 text-center text-xs border border-bordure rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono text-texte-secondaire hidden sm:table-cell">
                    {formatMontant(l.prix_unitaire)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono font-semibold">
                    {formatMontant((l.prix_unitaire || 0) * (l.quantite || 0))}
                  </td>
                  <td className="px-1 py-2 text-center">
                    <button onClick={() => retirerLigne(idx)} className="text-texte-secondaire hover:text-medical-critique">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-fond-secondaire border-t-2 border-bordure">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-xs font-bold text-texte-secondaire text-right">TOTAL</td>
                <td className="px-2 py-2 text-right text-sm font-bold text-texte-principal font-mono">
                  {formatMontant(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-texte-secondaire">
          <Package size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sélectionnez des produits ci-dessus.</p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-texte-principal mb-1">Remarques (optionnel)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); sauvegarder(lignes, e.target.value); }}
          className="champ-input text-sm"
          placeholder="ex: livraison urgente, quantités à confirmer..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variante="primaire" icone={Send}
          chargement={confirmer.isPending}
          disabled={mettreAJour.isPending || confirmer.isPending}
          onClick={handleConfirmer}
        >
          Confirmer et envoyer à MAPA
        </Button>
        <Button
          variante="fantome" icone={Trash2}
          chargement={supprimer.isPending}
          onClick={handleSupprimer}
        >
          Supprimer le brouillon
        </Button>
      </div>
    </div>
  );
};

// ── Carte BC (historique) ────────────────────────────────────────────────
const CarteBonCommande = ({ bc }) => {
  const { formatMontant } = useFormatMontant();
  const [ouverte, setOuverte] = useState(false);
  const [chargementPdf, setChargementPdf] = useState(false);
  const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];

  const handlePdf = async () => {
    setChargementPdf(true);
    try {
      const response = await api.get(`/bons-commande-mapa/${bc.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      alert('Erreur lors de la génération du PDF');
    } finally {
      setChargementPdf(false);
    }
  };

  return (
    <div className={`carte border-l-4 ${bc.statut === 'livre' ? 'border-l-green-400' : bc.statut === 'envoye' ? 'border-l-blue-400' : 'border-l-gray-300'}`}>
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
        onClick={() => setOuverte(!ouverte)}
      >
        <div>
          <p className="text-sm font-semibold text-texte-principal font-mono">{bc.numero}</p>
          <p className="text-xs text-texte-secondaire mt-0.5">
            {bc.date_commande
              ? new Date(bc.date_commande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
              : '—'}
            {bc.createur && (
              <span className="ml-2">· {bc.createur.prenom} {bc.createur.nom}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold font-mono text-texte-principal">{formatMontant(bc.montant_total)}</p>
          <BadgeStatut statut={bc.statut} />
        </div>
      </div>

      {ouverte && (
        <div className="mt-3 space-y-3">
          <div className="bg-fond-secondaire rounded-bouton overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-texte-secondaire border-b border-bordure">
                  <th className="text-left px-3 py-2">Produit</th>
                  <th className="text-center px-2 py-2 w-16">Qté</th>
                  <th className="text-right px-2 py-2 hidden sm:table-cell">Prix unit.</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bordure">
                {lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-medium text-texte-principal">{l.nom_produit}</td>
                    <td className="px-2 py-1.5 text-center">{l.quantite}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-texte-secondaire hidden sm:table-cell">
                      {formatMontant(l.prix_unitaire)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold">
                      {formatMontant((l.prix_unitaire || 0) * (l.quantite || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bc.notes && (
            <p className="text-xs text-texte-secondaire italic">Remarques : {bc.notes}</p>
          )}

          <Button variante="fantome" icone={FileText} chargement={chargementPdf} onClick={handlePdf}>
            Télécharger le PDF
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────────────────
const BonsCommandeMapaPage = () => {
  const { data: bons = [], isLoading } = useBonsCommandeMapa();
  const { data: produits = [] } = useProduits();
  const creer = useCreerBonCommande();

  const [bcActif, setBcActif] = useState(null);
  const [erreur, setErreur]   = useState('');

  const brouillons  = bons.filter((b) => b.statut === 'brouillon');
  const historique  = bons.filter((b) => b.statut !== 'brouillon');

  const handleNouveauBC = async () => {
    setErreur('');
    try {
      const bc = await creer.mutateAsync();
      setBcActif(bc.id);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const bcEdite = brouillons.find((b) => b.id === bcActif);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal flex items-center gap-2">
            <ClipboardList size={22} className="text-zeze-vert" />
            Bons de Commande MAPA
          </h1>
          <p className="text-sm text-texte-secondaire mt-1">
            Créez et suivez vos commandes de produits auprès de MAPA
          </p>
        </div>
        <Button
          variante="primaire" icone={Plus}
          chargement={creer.isPending}
          onClick={handleNouveauBC}
        >
          Nouveau BC
        </Button>
      </div>

      {erreur && <Alert type="erreur" message={erreur} />}

      {/* Éditeur de brouillon actif */}
      {bcEdite && (
        <EditeurBrouillon
          bc={bcEdite}
          produits={produits}
          onClose={() => setBcActif(null)}
        />
      )}

      {/* Autres brouillons en attente */}
      {brouillons.filter((b) => b.id !== bcActif).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            Brouillons
          </h2>
          {brouillons
            .filter((b) => b.id !== bcActif)
            .map((bc) => (
              <div
                key={bc.id}
                className="carte border-l-4 border-l-gray-300 flex items-center justify-between cursor-pointer hover:bg-fond-secondaire/50 transition-colors"
                onClick={() => setBcActif(bc.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-texte-principal font-mono">{bc.numero}</p>
                  <p className="text-xs text-texte-secondaire">
                    {Array.isArray(bc.lignes) ? bc.lignes.length : 0} produit(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeStatut statut={bc.statut} />
                  <ExternalLink size={14} className="text-texte-secondaire" />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Chargement */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
        </div>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <CheckCircle size={14} className="text-texte-secondaire" />
            Historique
            <span className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {historique.length}
            </span>
          </h2>
          {historique.map((bc) => (
            <CarteBonCommande key={bc.id} bc={bc} />
          ))}
        </div>
      )}

      {!isLoading && bons.length === 0 && (
        <div className="carte text-center py-12 text-texte-secondaire">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun bon de commande pour le moment.</p>
          <p className="text-xs mt-1">Cliquez sur « Nouveau BC » pour créer votre premier bon de commande MAPA.</p>
        </div>
      )}
    </div>
  );
};

export default BonsCommandeMapaPage;
