import { useState } from 'react';
import api from '../services/api';
import { useProduits } from '../hooks/useProduits';
import {
  useBonsCommandeMapa, useCreerBonCommande, useMettreAJourBC,
  useConfirmerBC, useSupprimerBC, useValiderLivraisonBC, useAnnulerBC,
} from '../hooks/useBonsCommandeMapa';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import {
  ClipboardList, Plus, X, Send, Trash2, FileText,
  CheckCircle, Clock, Package, Edit3, Truck, XCircle, Ban, Filter,
} from 'lucide-react';
import useFormatMontant from '../hooks/useFormatMontant';

const STATUT_CFG = {
  brouillon:    { label: 'Brouillon',        couleur: 'bg-gray-100 text-gray-600',    icone: Clock },
  envoye:       { label: 'Envoyé',           couleur: 'bg-blue-100 text-blue-800',    icone: Send },
  livre_partiel:{ label: 'Livré partiel',    couleur: 'bg-amber-100 text-amber-800',  icone: Truck },
  livre:        { label: 'Livré',            couleur: 'bg-green-100 text-green-800',  icone: CheckCircle },
  annule:       { label: 'Annulé',           couleur: 'bg-red-100 text-red-700',      icone: Ban },
};

const BadgeStatut = ({ statut }) => {
  const cfg = STATUT_CFG[statut] || STATUT_CFG.brouillon;
  const Icone = cfg.icone;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.couleur}`}>
      <Icone size={10} /> {cfg.label}
    </span>
  );
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ── Formulaire (création et modification) ────────────────────────────────────
const FormulaireBc = ({ bcExistant, produits, onSauvegarder, onAnnuler }) => {
  const { formatMontant } = useFormatMontant();
  const creer       = useCreerBonCommande();
  const mettreAJour = useMettreAJourBC();

  const [lignes, setLignes] = useState(Array.isArray(bcExistant?.lignes) ? bcExistant.lignes : []);
  const [infos,  setInfos]  = useState({
    nom_commandeur:       bcExistant?.nom_commandeur       || '',
    prenoms_commandeur:   bcExistant?.prenoms_commandeur   || '',
    telephone_commandeur: bcExistant?.telephone_commandeur || '',
    lieu_livraison:       bcExistant?.lieu_livraison       || '',
    nom_stockiste_mapa:   bcExistant?.nom_stockiste_mapa   || '',
    date_livraison_prevue: bcExistant?.date_livraison_prevue || '',
    mention_livraison:    bcExistant?.mention_livraison    || '',
    notes:                bcExistant?.notes                || '',
  });

  // Détection du mode livraison initial
  const detecterMode = () => {
    if (bcExistant?.mention_livraison === 'Dès que possible') return 'asap';
    if (bcExistant?.mention_livraison === "Aujourd'hui") return 'today';
    if (bcExistant?.date_livraison_prevue) return 'date';
    return null;
  };
  const [modeLivraison, setModeLivraison] = useState(detecterMode);
  const [erreur, setErreur] = useState('');

  const enEdition = !!bcExistant;
  const isPending  = creer.isPending || mettreAJour.isPending;
  const total = lignes.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0);
  const produitsDejaDans = lignes.map((l) => l.produit_id);

  const ajouterProduit = (produit) => {
    if (produitsDejaDans.includes(produit.id)) return;
    setLignes((prev) => [...prev, {
      produit_id: produit.id,
      nom_produit: produit.nom,
      quantite: 1,
      prix_unitaire: produit.prix_unitaire || 0,
    }]);
  };

  const retirerLigne = (idx) => setLignes((prev) => prev.filter((_, i) => i !== idx));

  const modifierQte = (idx, val) => {
    const qte = Math.max(1, parseInt(val) || 1);
    setLignes((prev) => prev.map((l, i) => i === idx ? { ...l, quantite: qte } : l));
  };

  const handleSauvegarder = async () => {
    setErreur('');
    const payload = {
      lignes,
      ...infos,
      date_livraison_prevue: infos.date_livraison_prevue || null,
    };
    try {
      let bc;
      if (enEdition) {
        bc = await mettreAJour.mutateAsync({ id: bcExistant.id, ...payload });
      } else {
        bc = await creer.mutateAsync(payload);
      }
      onSauvegarder(bc);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const champTexte = (label, key, type = 'text', placeholder = '', obligatoire = false) => (
    <div>
      <label className="block text-xs font-medium text-texte-principal mb-1">
        {label}{obligatoire && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={infos[key]}
        onChange={(e) => setInfos((p) => ({ ...p, [key]: e.target.value }))}
        className="champ-input text-sm"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="carte space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-texte-principal flex items-center gap-2">
          <ClipboardList size={15} className="text-zeze-vert" />
          {enEdition ? `Modifier — ${bcExistant.numero}` : 'Nouveau Bon de Commande MAPA'}
        </h2>
        <button onClick={onAnnuler} className="text-texte-secondaire hover:text-texte-principal">
          <X size={18} />
        </button>
      </div>

      {erreur && <Alert type="erreur" message={erreur} />}

      {/* ── Informations commandeur ── */}
      <div>
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
          Informations commandeur
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {champTexte('Nom', 'nom_commandeur', 'text', 'Nom de famille')}
          {champTexte('Prénoms', 'prenoms_commandeur', 'text', 'Prénoms')}
          {champTexte('Téléphone', 'telephone_commandeur', 'tel', '+225 00 00 00 00 00')}
          {champTexte('Lieu de livraison', 'lieu_livraison', 'text', 'ex: Abidjan Cocody')}
          {champTexte('Stockiste MAPA', 'nom_stockiste_mapa', 'text', 'Nom du stockiste MAPA')}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-texte-principal mb-1">
              Date de livraison souhaitée
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'asap',  label: 'Dès que possible' },
                { id: 'today', label: "Aujourd'hui" },
                { id: 'date',  label: 'Choisir une date' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setModeLivraison(opt.id);
                    if (opt.id === 'asap') {
                      setInfos((p) => ({ ...p, mention_livraison: 'Dès que possible', date_livraison_prevue: '' }));
                    } else if (opt.id === 'today') {
                      setInfos((p) => ({ ...p, mention_livraison: "Aujourd'hui", date_livraison_prevue: '' }));
                    } else {
                      setInfos((p) => ({ ...p, mention_livraison: '', date_livraison_prevue: '' }));
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-bouton border transition-colors ${
                    modeLivraison === opt.id
                      ? 'bg-zeze-vert text-white border-zeze-vert'
                      : 'border-bordure text-texte-secondaire hover:border-zeze-vert hover:text-zeze-vert'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {modeLivraison === 'date' && (
              <input
                type="date"
                value={infos.date_livraison_prevue}
                onChange={(e) => setInfos((p) => ({ ...p, date_livraison_prevue: e.target.value, mention_livraison: '' }))}
                className="champ-input text-sm mt-2"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Produits ── */}
      <div>
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Produits</p>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto mb-3">
          {produits
            .filter((p) => !produitsDejaDans.includes(p.id))
            .map((p) => (
              <button
                key={p.id}
                onClick={() => ajouterProduit(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-bouton transition-colors ${
                  p.actif
                    ? 'border-zeze-vert text-zeze-vert hover:bg-zeze-vert/10'
                    : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Plus size={11} />
                {p.nom}{!p.actif && ' (désactivé)'} — {formatMontant(p.prix_unitaire)}
              </button>
            ))}
          {produits.filter((p) => !produitsDejaDans.includes(p.id)).length === 0 && (
            <p className="text-xs text-texte-secondaire italic">Tous les produits sont déjà dans la commande.</p>
          )}
        </div>

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
          <div className="text-center py-6 border border-dashed border-bordure rounded-carte text-texte-secondaire">
            <Package size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">Cliquez sur un produit ci-dessus pour l'ajouter.</p>
          </div>
        )}
      </div>

      {/* ── Remarques ── */}
      <div>
        <label className="block text-xs font-medium text-texte-principal mb-1">Remarques (optionnel)</label>
        <input
          type="text"
          value={infos.notes}
          onChange={(e) => setInfos((p) => ({ ...p, notes: e.target.value }))}
          className="champ-input text-sm"
          placeholder="ex: livraison urgente, quantités à confirmer…"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 flex-wrap">
        <Button variante="primaire" icone={ClipboardList} chargement={isPending} onClick={handleSauvegarder}>
          {enEdition ? 'Mettre à jour le brouillon' : 'Enregistrer comme brouillon'}
        </Button>
        <Button variante="fantome" icone={X} disabled={isPending} onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </div>
  );
};

// ── Vue d'un brouillon enregistré (relecture avant envoi) ─────────────────────
const VueBrouillon = ({ bc, produits, onModifier, onClose }) => {
  const { formatMontant } = useFormatMontant();
  const confirmer  = useConfirmerBC();
  const supprimer  = useSupprimerBC();

  const [chargementPdf, setChargementPdf] = useState(false);
  const [erreur, setErreur] = useState('');

  const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];

  const handleConfirmer = async () => {
    if (lignes.length === 0) { setErreur('Ajoutez au moins un produit avant d\'envoyer.'); return; }
    if (!window.confirm(`Envoyer le BC ${bc.numero} à MAPA ? Cette action est irréversible.`)) return;
    setErreur('');
    try {
      await confirmer.mutateAsync(bc.id);
      onClose();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'envoi');
    }
  };

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer ce brouillon définitivement ?')) return;
    await supprimer.mutateAsync(bc.id);
    onClose();
  };

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

  const ligne = (label, valeur) =>
    valeur ? (
      <div className="flex gap-2 text-xs">
        <span className="text-texte-secondaire min-w-[140px]">{label}</span>
        <span className="text-texte-principal font-medium">{valeur}</span>
      </div>
    ) : null;

  return (
    <div className="carte space-y-4 border-l-4 border-l-amber-400">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold font-mono text-texte-principal">{bc.numero}</p>
          <BadgeStatut statut="brouillon" />
        </div>
        <button onClick={onClose} className="text-texte-secondaire hover:text-texte-principal">
          <X size={18} />
        </button>
      </div>

      {erreur && <Alert type="erreur" message={erreur} />}

      {/* Infos commandeur */}
      <div className="bg-fond-secondaire rounded-bouton p-3 space-y-1.5">
        <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Informations</p>
        {ligne('Nom & Prénoms', [bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' '))}
        {ligne('Téléphone', bc.telephone_commandeur)}
        {ligne('Lieu de livraison', bc.lieu_livraison)}
        {ligne('Date souhaitée', bc.mention_livraison || (bc.date_livraison_prevue ? fmtDate(bc.date_livraison_prevue) : null))}
      </div>

      {/* Tableau produits */}
      {lignes.length > 0 ? (
        <div className="border border-bordure rounded-carte overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-fond-secondaire">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-texte-secondaire">Produit</th>
                <th className="text-center px-2 py-2 font-semibold text-texte-secondaire w-16">Qté</th>
                <th className="text-right px-2 py-2 font-semibold text-texte-secondaire hidden sm:table-cell">Prix unit.</th>
                <th className="text-right px-3 py-2 font-semibold text-texte-secondaire">Total</th>
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
            <tfoot className="bg-fond-secondaire border-t-2 border-bordure">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-xs font-bold text-texte-secondaire text-right">TOTAL</td>
                <td className="px-3 py-2 text-right text-sm font-bold font-mono text-texte-principal" colSpan={2}>
                  {formatMontant(lignes.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-xs text-amber-600 font-medium">⚠ Aucun produit — requis pour l'envoi</p>
      )}

      {bc.notes && (
        <p className="text-xs text-texte-secondaire italic">Remarques : {bc.notes}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variante="primaire" icone={Send} chargement={confirmer.isPending} onClick={handleConfirmer}>
          Valider et envoyer à MAPA
        </Button>
        <Button variante="secondaire" icone={Edit3} onClick={onModifier} disabled={confirmer.isPending}>
          Modifier
        </Button>
        <Button variante="fantome" icone={FileText} chargement={chargementPdf} onClick={handlePdf}>
          Aperçu PDF
        </Button>
        <Button variante="fantome" icone={Trash2} chargement={supprimer.isPending} onClick={handleSupprimer}>
          Supprimer
        </Button>
      </div>
    </div>
  );
};

// ── Carte historique (envoyé / livré / annulé) ───────────────────────────────
const CarteHistorique = ({ bc }) => {
  const { formatMontant } = useFormatMontant();
  const [ouverte, setOuverte]             = useState(false);
  const [chargementPdf, setChargementPdf] = useState(false);
  const [chargementPdfRec, setChargementPdfRec] = useState(false);
  const [erreur, setErreur]               = useState('');
  const [modeReception, setModeReception] = useState(false);
  const [qtesLivrees, setQtesLivrees]     = useState({});
  const validerLivraison = useValiderLivraisonBC();
  const annulerBC        = useAnnulerBC();
  const lignes = Array.isArray(bc.lignes) ? bc.lignes : [];

  const getQteLivree = (produit_id) =>
    qtesLivrees[produit_id] !== undefined ? qtesLivrees[produit_id]
      : (lignes.find((l) => l.produit_id === produit_id)?.quantite ?? 0);

  const ouvrirReception = () => {
    setQtesLivrees({});
    setErreur('');
    setOuverte(true);
    setModeReception(true);
  };

  const modifierQteLivree = (produit_id, val, max) => {
    const qty = Math.min(max, Math.max(0, parseInt(val) || 0));
    setQtesLivrees((prev) => ({ ...prev, [produit_id]: qty }));
  };

  const handleConfirmerReception = async () => {
    setErreur('');
    const payload = lignes.map((l) => ({
      produit_id:      l.produit_id,
      nom_produit:     l.nom_produit,
      quantite_livree: getQteLivree(l.produit_id),
    }));
    try {
      await validerLivraison.mutateAsync({ id: bc.id, lignes_livrees: payload });
      setModeReception(false);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la validation');
    }
  };

  const handleAnnuler = async () => {
    if (!window.confirm(`Annuler le BC ${bc.numero} ? Cette action est irréversible.`)) return;
    setErreur('');
    try {
      await annulerBC.mutateAsync(bc.id);
      setOuverte(false);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'annulation');
    }
  };

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

  const handlePdfReception = async () => {
    setChargementPdfRec(true);
    try {
      const response = await api.get(`/bons-commande-mapa/${bc.id}/pdf-reception`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      alert('Erreur lors de la génération du bon de réception');
    } finally {
      setChargementPdfRec(false);
    }
  };

  // Quantités restantes pour livre_partiel
  const restants = bc.statut === 'livre_partiel'
    ? lignes
        .map((l) => {
          const ll = bc.lignes_livrees?.find((x) => x.produit_id === l.produit_id);
          const reste = l.quantite - (ll?.quantite_livree ?? l.quantite);
          return reste > 0 ? { ...l, reste } : null;
        })
        .filter(Boolean)
    : [];

  const couleurBord = bc.statut === 'livre'         ? 'border-l-green-400'
    : bc.statut === 'livre_partiel'                 ? 'border-l-amber-400'
    : bc.statut === 'annule'                        ? 'border-l-red-300'
    :                                                 'border-l-blue-400';

  return (
    <div className={`carte border-l-4 ${couleurBord}`}>
      {/* ── En-tête cliquable ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
        onClick={() => { setOuverte(!ouverte); if (ouverte) setModeReception(false); }}
      >
        <div>
          <p className="text-sm font-semibold font-mono text-texte-principal">{bc.numero}</p>
          <p className="text-xs text-texte-secondaire mt-0.5">
            {fmtDate(bc.date_commande)}
            {bc.createur && <span className="ml-2">· {bc.createur.prenom} {bc.createur.nom}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold font-mono text-texte-principal">{formatMontant(bc.montant_total)}</p>
          <BadgeStatut statut={bc.statut} />
        </div>
      </div>

      {ouverte && (
        <div className="mt-3 space-y-3">
          {/* ── Infos commandeur ── */}
          <div className="bg-fond-secondaire rounded-bouton p-3 space-y-1 text-xs">
            {[bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' ') && (
              <p><span className="text-texte-secondaire">Commandeur : </span>
                <span className="font-medium">{[bc.nom_commandeur, bc.prenoms_commandeur].filter(Boolean).join(' ')}</span>
              </p>
            )}
            {bc.telephone_commandeur && (
              <p><span className="text-texte-secondaire">Tél. : </span>
                <span className="font-medium">{bc.telephone_commandeur}</span>
              </p>
            )}
            {bc.lieu_livraison && (
              <p><span className="text-texte-secondaire">Lieu : </span>
                <span className="font-medium">{bc.lieu_livraison}</span>
              </p>
            )}
            {bc.nom_stockiste_mapa && (
              <p><span className="text-texte-secondaire">Stockiste MAPA : </span>
                <span className="font-medium">{bc.nom_stockiste_mapa}</span>
              </p>
            )}
            {(bc.mention_livraison || bc.date_livraison_prevue) && (
              <p><span className="text-texte-secondaire">Date souhaitée : </span>
                <span className="font-medium">{bc.mention_livraison || fmtDate(bc.date_livraison_prevue)}</span>
              </p>
            )}
            {bc.date_livraison_effective && (
              <p><span className="text-texte-secondaire">Date de réception : </span>
                <span className="font-medium text-green-700">{fmtDate(bc.date_livraison_effective)}</span>
              </p>
            )}
          </div>

          {/* ── Quantités restantes (livre_partiel) ── */}
          {restants.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-bouton p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                <Truck size={11} /> Quantités restantes à recevoir
              </p>
              <ul className="space-y-0.5">
                {restants.map((l, i) => (
                  <li key={i} className="text-xs flex justify-between text-amber-700">
                    <span>{l.nom_produit}</span>
                    <span className="font-bold">× {l.reste}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Tableau produits (commandé vs livré) ── */}
          <div className="bg-fond-secondaire rounded-bouton overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-texte-secondaire border-b border-bordure">
                  <th className="text-left px-3 py-2">Produit</th>
                  <th className="text-center px-2 py-2 w-16">Commandé</th>
                  {(bc.lignes_livrees || modeReception) && (
                    <th className="text-center px-2 py-2 w-20">
                      {modeReception ? 'Livré' : 'Reçu'}
                    </th>
                  )}
                  <th className="text-right px-3 py-2 hidden sm:table-cell">Prix unit.</th>
                  <th className="text-right px-3 py-2">Total cmd.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bordure">
                {lignes.map((l, i) => {
                  const ll = bc.lignes_livrees?.find((x) => x.produit_id === l.produit_id);
                  const partiel = ll && ll.quantite_livree < l.quantite;
                  return (
                    <tr key={i} className={partiel ? 'bg-amber-50' : ''}>
                      <td className="px-3 py-1.5 font-medium text-texte-principal">
                        {l.nom_produit}
                        {partiel && <span className="ml-1 text-amber-600 text-xs">(partiel)</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center">{l.quantite}</td>
                      {(bc.lignes_livrees || modeReception) && (
                        <td className="px-2 py-1.5 text-center">
                          {modeReception ? (
                            <input
                              type="number"
                              min={0}
                              max={l.quantite}
                              value={getQteLivree(l.produit_id)}
                              onChange={(e) => modifierQteLivree(l.produit_id, e.target.value, l.quantite)}
                              className="w-14 text-center text-xs border border-bordure rounded px-1 py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className={ll?.quantite_livree < l.quantite ? 'text-amber-700 font-semibold' : 'text-green-700 font-semibold'}>
                              {ll?.quantite_livree ?? '—'}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-right font-mono text-texte-secondaire hidden sm:table-cell">
                        {formatMontant(l.prix_unitaire)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold">
                        {formatMontant((l.prix_unitaire || 0) * (l.quantite || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {bc.notes && <p className="text-xs text-texte-secondaire italic">Remarques : {bc.notes}</p>}
          {erreur && <Alert type="erreur" message={erreur} />}

          {/* ── Formulaire de réception (mode saisie) ── */}
          {modeReception && (
            <div className="border border-amber-200 bg-amber-50 rounded-carte p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">
                Ajustez les quantités réellement reçues (0 si non livré).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variante="primaire"
                  icone={Truck}
                  chargement={validerLivraison.isPending}
                  onClick={handleConfirmerReception}
                >
                  Confirmer la réception
                </Button>
                <Button
                  variante="fantome"
                  icone={X}
                  disabled={validerLivraison.isPending}
                  onClick={() => setModeReception(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* ── Actions normales ── */}
          {!modeReception && (
            <div className="flex flex-wrap gap-2">
              {['envoye', 'livre_partiel'].includes(bc.statut) && (
                <Button variante="primaire" icone={Truck} onClick={ouvrirReception}>
                  {bc.statut === 'livre_partiel' ? 'Compléter la livraison' : 'Saisir la réception'}
                </Button>
              )}
              {['livre', 'livre_partiel'].includes(bc.statut) && (
                <Button variante="secondaire" icone={FileText} chargement={chargementPdfRec} onClick={handlePdfReception}>
                  Bon de réception
                </Button>
              )}
              <Button variante="fantome" icone={FileText} chargement={chargementPdf} onClick={handlePdf}>
                BC original
              </Button>
              {['envoye', 'livre_partiel'].includes(bc.statut) && (
                <Button
                  variante="fantome"
                  icone={XCircle}
                  chargement={annulerBC.isPending}
                  onClick={handleAnnuler}
                  className="text-red-600 hover:text-red-700"
                >
                  Annuler la commande
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────────────────────
const BonsCommandeMapaPage = () => {
  const { data: bons = [], isLoading } = useBonsCommandeMapa();
  const { data: produits = [] }        = useProduits({ actif: 'tous' });

  // null = liste, 'nouveau' = formulaire création, string id = edition/vue brouillon
  const [vue, setVue] = useState(null);

  const [filtreStatut, setFiltreStatut] = useState('tous');

  const brouillons = bons.filter((b) => b.statut === 'brouillon');
  const historiqueTotal = bons.filter((b) => b.statut !== 'brouillon');
  const historique = filtreStatut === 'tous'
    ? historiqueTotal
    : historiqueTotal.filter((b) => b.statut === filtreStatut);

  const bcEdite = typeof vue === 'string' && vue !== 'nouveau'
    ? brouillons.find((b) => b.id === vue)
    : null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal flex items-center gap-2">
            <ClipboardList size={22} className="text-zeze-vert" />
            Bons de Commande MAPA
          </h1>
          <p className="text-sm text-texte-secondaire mt-1">
            Créez et suivez vos commandes auprès de MAPA
          </p>
        </div>
        {vue === null && (
          <Button variante="primaire" icone={Plus} onClick={() => setVue('nouveau')}>
            Nouveau BC
          </Button>
        )}
      </div>

      {/* ── Formulaire de création ── */}
      {vue === 'nouveau' && (
        <FormulaireBc
          bcExistant={null}
          produits={produits}
          onSauvegarder={() => setVue(null)}
          onAnnuler={() => setVue(null)}
        />
      )}

      {/* ── Brouillons ── */}
      {brouillons.length > 0 && vue !== 'nouveau' && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <Clock size={14} className="text-amber-500" /> Brouillons
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {brouillons.length}
            </span>
          </h2>
          {brouillons.map((bc) => {
            if (vue === `edit-${bc.id}`) {
              return (
                <FormulaireBc
                  key={bc.id}
                  bcExistant={bc}
                  produits={produits}
                  onSauvegarder={() => setVue(bc.id)}
                  onAnnuler={() => setVue(bc.id)}
                />
              );
            }
            if (vue === bc.id) {
              return (
                <VueBrouillon
                  key={bc.id}
                  bc={bc}
                  produits={produits}
                  onModifier={() => setVue(`edit-${bc.id}`)}
                  onClose={() => setVue(null)}
                />
              );
            }
            // Carte collapsed pour les brouillons non actifs
            return (
              <div
                key={bc.id}
                className="carte border-l-4 border-l-amber-300 flex items-center justify-between cursor-pointer hover:bg-fond-secondaire/50 transition-colors"
                onClick={() => setVue(bc.id)}
              >
                <div>
                  <p className="text-sm font-semibold font-mono text-texte-principal">{bc.numero}</p>
                  <p className="text-xs text-texte-secondaire">
                    {Array.isArray(bc.lignes) ? bc.lignes.length : 0} produit(s)
                    {bc.nom_stockiste_mapa && ` · Stockiste : ${bc.nom_stockiste_mapa}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeStatut statut="brouillon" />
                  <Edit3 size={14} className="text-texte-secondaire" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chargement */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
        </div>
      )}

      {/* ── Historique (envoyé / livré / annulé) ── */}
      {historiqueTotal.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
              <CheckCircle size={14} className="text-texte-secondaire" /> Historique
              <span className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {historique.length}
              </span>
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={11} className="text-texte-secondaire" />
              {[
                { key: 'tous',          label: 'Tous' },
                { key: 'envoye',        label: 'Envoyé' },
                { key: 'livre_partiel', label: 'Livré partiel' },
                { key: 'livre',         label: 'Livré' },
                { key: 'annule',        label: 'Annulé' },
              ].map(({ key, label }) => {
                const count = key === 'tous' ? historiqueTotal.length : historiqueTotal.filter((b) => b.statut === key).length;
                if (count === 0 && key !== 'tous') return null;
                return (
                  <button
                    key={key}
                    onClick={() => setFiltreStatut(key)}
                    className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                      filtreStatut === key
                        ? 'bg-zeze-vert text-white border-zeze-vert'
                        : 'border-bordure text-texte-secondaire hover:border-zeze-vert hover:text-zeze-vert'
                    }`}
                  >
                    {label} {count > 0 && <span className="opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {historique.length > 0
            ? historique.map((bc) => <CarteHistorique key={bc.id} bc={bc} />)
            : <p className="text-xs text-texte-secondaire italic py-2">Aucun BC avec ce statut.</p>
          }
        </div>
      )}

      {!isLoading && bons.length === 0 && vue === null && (
        <div className="carte text-center py-12 text-texte-secondaire">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun bon de commande.</p>
          <p className="text-xs mt-1">Cliquez sur « Nouveau BC » pour créer votre premier bon de commande.</p>
        </div>
      )}
    </div>
  );
};

export default BonsCommandeMapaPage;
