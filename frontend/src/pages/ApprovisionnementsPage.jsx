import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProduits } from '../hooks/useProduits';
import {
  useBrouillon, useCommandesAppro, useMettreAJourLignes,
  useEnvoyerCommande, useSupprimerBrouillon, useValiderCommande, useRefuserCommande,
} from '../hooks/useCommandesAppro';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { ShoppingCart, Plus, X, Send, Check, Package, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const STATUT_CFG = {
  brouillon:  { label: 'Brouillon',   couleur: 'bg-gray-100 text-gray-600',    icone: Clock },
  en_attente: { label: 'En attente',  couleur: 'bg-yellow-100 text-yellow-800', icone: Clock },
  validee:    { label: 'Validée',     couleur: 'bg-green-100 text-green-800',  icone: CheckCircle },
  refusee:    { label: 'Refusée',     couleur: 'bg-red-100 text-red-700',      icone: XCircle },
};

// ── Brouillon éditable (revendeur) ────────────────────────────────────────────
const BrouillonEditeur = ({ produits }) => {
  const { data: brouillon, isLoading, isError, error } = useBrouillon();
  const mettreAJour = useMettreAJourLignes();
  const envoyer     = useEnvoyerCommande();
  const supprimer   = useSupprimerBrouillon();
  const [notes, setNotes]   = useState('');
  const [erreur, setErreur] = useState('');

  if (isLoading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>;
  if (isError) return (
    <div className="carte border-orange-200 bg-orange-50">
      <p className="text-sm font-semibold text-orange-800 mb-1">Impossible de charger le brouillon</p>
      <p className="text-xs text-orange-700">{error?.response?.data?.message || 'Vérifiez qu\'un stockiste est bien associé à votre compte.'}</p>
    </div>
  );
  if (!brouillon) return null;

  const lignes = Array.isArray(brouillon.lignes) ? brouillon.lignes : [];
  const produitsDejaDans = lignes.map((l) => l.produit_id);
  const total = lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);

  const ajouterProduit = (produit) => {
    if (produitsDejaDans.includes(produit.id)) return;
    const nouvelles = [...lignes, { produit_id: produit.id, nom_produit: produit.nom, quantite: 1, prix_unitaire: produit.prix_unitaire }];
    mettreAJour.mutate(nouvelles, {
      onError: (e) => setErreur(e?.response?.data?.message || 'Erreur lors de l\'ajout du produit'),
    });
  };

  const retirerLigne = (idx) => {
    const nouvelles = lignes.filter((_, i) => i !== idx);
    mettreAJour.mutate(nouvelles);
  };

  const modifierQte = (idx, val) => {
    const qte = Math.max(1, parseInt(val) || 1);
    const nouvelles = lignes.map((l, i) => i === idx ? { ...l, quantite: qte } : l);
    mettreAJour.mutate(nouvelles);
  };

  const handleEnvoyer = async () => {
    setErreur('');
    try {
      await envoyer.mutateAsync({ notes_revendeur: notes || null });
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'envoi');
    }
  };

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer ce brouillon ?')) return;
    supprimer.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="carte space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-texte-principal flex items-center gap-2">
            <ShoppingCart size={16} className="text-zeze-vert" /> Ma commande en cours
          </h2>
          {lignes.length > 0 && (
            <button onClick={handleSupprimer} className="text-texte-secondaire hover:text-medical-critique flex items-center gap-1 text-xs">
              <Trash2 size={12} /> Vider
            </button>
          )}
        </div>

        {erreur && <Alert type="erreur" message={erreur} />}

        {/* Sélection des produits */}
        <div>
          <p className="text-xs font-medium text-texte-secondaire mb-2">Ajouter un produit</p>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {produits
              .filter((p) => p.actif && !produitsDejaDans.includes(p.id))
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => ajouterProduit(p)}
                  disabled={mettreAJour.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zeze-vert text-zeze-vert rounded-bouton hover:bg-zeze-vert/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={11} /> {p.nom} — {formatMontant(p.prix_unitaire)}
                </button>
              ))}
            {produits.filter((p) => p.actif && !produitsDejaDans.includes(p.id)).length === 0 && (
              <p className="text-xs text-texte-secondaire italic">Tous les produits sont dans la commande.</p>
            )}
          </div>
        </div>

        {/* Lignes de la commande */}
        {lignes.length > 0 ? (
          <>
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
                      <td className="px-2 py-2 text-right text-xs font-mono text-texte-secondaire hidden sm:table-cell">{formatMontant(l.prix_unitaire)}</td>
                      <td className="px-2 py-2 text-right text-xs font-mono font-semibold">{formatMontant(l.prix_unitaire * l.quantite)}</td>
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
                    <td className="px-2 py-2 text-right text-sm font-bold text-texte-principal font-mono">{formatMontant(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-texte-principal mb-1">Note pour le stockiste (optionnel)</label>
                <input
                  type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="champ-input text-sm" placeholder="ex: livraison urgente, appeler avant..."
                />
              </div>
              <Button variante="primaire" icone={Send} chargement={envoyer.isPending} onClick={handleEnvoyer}>
                Envoyer la commande au stockiste
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-texte-secondaire">
            <Package size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sélectionnez des produits ci-dessus pour créer votre commande.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Carte commande (historique) ───────────────────────────────────────────────
const CarteCommande = ({ commande, estStockiste }) => {
  const cfg  = STATUT_CFG[commande.statut] || STATUT_CFG.en_attente;
  const Icone = cfg.icone;
  const lignes = Array.isArray(commande.lignes) ? commande.lignes : [];
  const valider = useValiderCommande();
  const refuser = useRefuserCommande();
  const [notes, setNotes]   = useState('');
  const [erreur, setErreur] = useState('');
  const [ouverte, setOuverte] = useState(commande.statut === 'en_attente');

  const handleValider = async () => {
    setErreur('');
    try {
      await valider.mutateAsync({ id: commande.id, notes_stockiste: notes || null });
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la validation');
    }
  };

  const handleRefuser = async () => {
    if (!window.confirm('Refuser cette commande ?')) return;
    setErreur('');
    try {
      await refuser.mutateAsync({ id: commande.id, notes_stockiste: notes || null });
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors du refus');
    }
  };

  return (
    <div className={`carte border-l-4 ${commande.statut === 'validee' ? 'border-l-green-400' : commande.statut === 'refusee' ? 'border-l-red-400' : 'border-l-yellow-400'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer" onClick={() => setOuverte(!ouverte)}>
        <div>
          {estStockiste && (
            <p className="text-sm font-semibold text-texte-principal">
              {commande.revendeur?.prenom} {commande.revendeur?.nom}
            </p>
          )}
          <p className="text-xs text-texte-secondaire">
            {commande.date_commande
              ? new Date(commande.date_commande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
              : 'Brouillon'}
            {commande.notes_revendeur && <span className="ml-2 italic">· {commande.notes_revendeur}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold font-mono text-texte-principal">{formatMontant(commande.montant_total)}</p>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.couleur}`}>
            <Icone size={11} /> {cfg.label}
          </span>
        </div>
      </div>

      {ouverte && (
        <div className="mt-3 space-y-3">
          {erreur && <Alert type="erreur" message={erreur} />}

          {/* Détail des lignes */}
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
                    <td className="px-2 py-1.5 text-right font-mono text-texte-secondaire hidden sm:table-cell">{formatMontant(l.prix_unitaire)}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold">{formatMontant(l.prix_unitaire * l.quantite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Infos paiement si validée */}
          {commande.statut === 'validee' && commande.facture && (
            <div className={`text-xs px-3 py-2 rounded-bouton ${commande.facture.statut_paiement === 'paye' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              Facture : {commande.facture.statut_paiement === 'paye' ? 'Payée' : 'En attente de paiement'}
            </div>
          )}

          {commande.notes_stockiste && (
            <p className="text-xs text-texte-secondaire italic">Note stockiste : {commande.notes_stockiste}</p>
          )}

          {/* Actions stockiste */}
          {estStockiste && commande.statut === 'en_attente' && (
            <div className="space-y-2 pt-1 border-t border-bordure">
              <div>
                <label className="block text-xs font-medium text-texte-principal mb-1">Note (optionnel)</label>
                <input
                  type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="champ-input text-sm" placeholder="Commentaire pour le revendeur..."
                />
              </div>
              <div className="flex gap-2">
                <Button variante="primaire" icone={Check} chargement={valider.isPending} onClick={handleValider}>
                  Valider et livrer
                </Button>
                <Button variante="fantome" icone={X} chargement={refuser.isPending} onClick={handleRefuser}>
                  Refuser
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const ApprovisionnementsPage = () => {
  const { utilisateur } = useAuth();
  const estDelegue   = utilisateur?.role === 'delegue';
  const estStockiste = ['administrateur', 'stockiste'].includes(utilisateur?.role);

  const { data: produits = [] } = useProduits({ actif: 'actif' });
  const { data: commandes = [], isLoading } = useCommandesAppro();

  const commandesEnAttente = commandes.filter((c) => c.statut === 'en_attente');
  const historique         = commandes.filter((c) => ['validee', 'refusee'].includes(c.statut));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-titres font-bold text-texte-principal">Approvisionnements</h1>
        <p className="text-sm text-texte-secondaire mt-1">
          {estDelegue ? 'Commandez des produits auprès de votre stockiste' : 'Gérez les commandes de vos revendeurs'}
        </p>
      </div>

      {/* Brouillon éditable — revendeur uniquement */}
      {estDelegue && <BrouillonEditeur produits={produits} />}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
        </div>
      )}

      {/* Commandes en attente */}
      {commandesEnAttente.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <Clock size={14} className="text-yellow-500" />
            En attente
            <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {commandesEnAttente.length}
            </span>
          </h2>
          {commandesEnAttente.map((c) => (
            <CarteCommande key={c.id} commande={c} estStockiste={estStockiste} />
          ))}
        </div>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <CheckCircle size={14} className="text-texte-secondaire" /> Historique
          </h2>
          {historique.map((c) => (
            <CarteCommande key={c.id} commande={c} estStockiste={estStockiste} />
          ))}
        </div>
      )}

      {!isLoading && commandes.filter((c) => c.statut !== 'brouillon').length === 0 && (
        <div className="carte text-center py-12 text-texte-secondaire">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <p>{estDelegue ? 'Aucune commande envoyée pour le moment.' : 'Aucune commande reçue pour le moment.'}</p>
        </div>
      )}
    </div>
  );
};

export default ApprovisionnementsPage;
