import { useState } from 'react';
import { useMonStock, useAcheterStock, useVendreStock, useMesVentes } from '../hooks/useStockDelegue';
import { useProduits } from '../hooks/useProduits';
import { Package, ShoppingCart, ShoppingBag, Plus, X, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const parseLignes = (lignes) => {
  if (!lignes) return [];
  if (typeof lignes === 'string') { try { return JSON.parse(lignes); } catch { return []; } }
  return Array.isArray(lignes) ? lignes : [];
};

// ── Formulaire d'achat ────────────────────────────────────────────────────────
const FormulaireAchat = ({ produits, stock }) => {
  const [produitId, setProduitId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const acheter = useAcheterStock();

  const produitsCombo = [...produits].sort((a, b) => a.nom.localeCompare(b.nom));
  const produitSelectionne = produitsCombo.find((p) => p.id === produitId);
  const stockActuel = stock.find((s) => s.produit_id === produitId)?.quantite ?? 0;

  const soumettre = async (e) => {
    e.preventDefault();
    if (!produitId) { setErreur('Sélectionnez un produit.'); return; }
    if (quantite < 1) { setErreur('La quantité doit être ≥ 1.'); return; }
    setErreur(''); setSucces('');
    try {
      await acheter.mutateAsync({ produit_id: produitId, quantite: Number(quantite) });
      setSucces(`${quantite} unité(s) ajoutée(s) au stock.`);
      setProduitId(''); setQuantite(1);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'achat.');
    }
  };

  return (
    <div className="carte space-y-4">
      <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
        <ShoppingCart size={16} className="text-zeze-vert" /> Acheter des produits (approvisionner mon stock)
      </h2>
      {erreur && <Alert type="erreur" message={erreur} />}
      {succes && <Alert type="succes" message={succes} />}
      <form onSubmit={soumettre} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-texte-principal mb-1">Produit</label>
          <select value={produitId} onChange={(e) => setProduitId(e.target.value)} className="champ-input">
            <option value="">Sélectionner un produit...</option>
            {produitsCombo.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} — {formatMontant(p.prix_unitaire)}
                {stock.find((s) => s.produit_id === p.id) ? ` (stock: ${stock.find((s) => s.produit_id === p.id).quantite})` : ''}
              </option>
            ))}
          </select>
          {produitSelectionne && (
            <p className="text-xs text-texte-secondaire mt-1">
              Stock actuel : {stockActuel} · Coût : {formatMontant(produitSelectionne.prix_unitaire * quantite)}
            </p>
          )}
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-texte-principal mb-1">Quantité</label>
          <input
            type="number" min={1} value={quantite}
            onChange={(e) => setQuantite(Math.max(1, parseInt(e.target.value) || 1))}
            className="champ-input"
          />
        </div>
        <Button type="submit" variante="primaire" icone={Plus} chargement={acheter.isPending}>
          Ajouter au stock
        </Button>
      </form>
    </div>
  );
};

// ── Formulaire de vente ───────────────────────────────────────────────────────
const FormulaireVente = ({ stock }) => {
  const [lignes, setLignes] = useState([]);
  const [clientNom, setClientNom] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const vendre = useVendreStock();

  const stockDisponible = stock.filter((s) => s.quantite > 0 && s.produit);
  const produitsDejaDans = lignes.map((l) => l.produit_id);

  const ajouterLigne = (item) => {
    if (produitsDejaDans.includes(item.produit_id)) return;
    setLignes([...lignes, {
      produit_id: item.produit_id,
      nom_produit: item.produit.nom,
      quantite: 1,
      prix_unitaire: item.produit.prix_unitaire,
      stock_max: item.quantite,
    }]);
  };

  const retirerLigne = (idx) => setLignes(lignes.filter((_, i) => i !== idx));
  const modifierQte = (idx, val) => {
    const qte = Math.max(1, Math.min(lignes[idx].stock_max, parseInt(val) || 1));
    setLignes(lignes.map((l, i) => i === idx ? { ...l, quantite: qte } : l));
  };

  const total = lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);
  const gainDelegue = Math.round(total * 0.15); // 15% sur les 25% que MAPA octroie au stockiste

  const soumettre = async (e) => {
    e.preventDefault();
    if (lignes.length === 0) { setErreur('Ajoutez au moins un produit.'); return; }
    setErreur(''); setSucces('');
    try {
      await vendre.mutateAsync({
        lignes: lignes.map(({ produit_id, nom_produit, quantite, prix_unitaire }) =>
          ({ produit_id, nom_produit, quantite, prix_unitaire })
        ),
        client_nom: clientNom || null,
      });
      setSucces(`Vente enregistrée — ${formatMontant(total)}`);
      setLignes([]); setClientNom('');
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la vente.');
    }
  };

  return (
    <div className="carte space-y-4">
      <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
        <ShoppingBag size={16} className="text-zeze-or" /> Faire une vente (vente directe sans ordonnance)
      </h2>

      {erreur && <Alert type="erreur" message={erreur} />}
      {succes && <Alert type="succes" message={succes} />}

      {stockDisponible.length === 0 ? (
        <p className="text-sm text-texte-secondaire italic">Votre stock est vide. Approvisionnez-vous d'abord.</p>
      ) : (
        <form onSubmit={soumettre} className="space-y-4">
          {/* Sélection des produits */}
          <div>
            <label className="block text-sm font-medium text-texte-principal mb-2">Produits à vendre</label>
            <div className="flex flex-wrap gap-2">
              {stockDisponible
                .filter((s) => !produitsDejaDans.includes(s.produit_id))
                .map((s) => (
                  <button
                    key={s.produit_id}
                    type="button"
                    onClick={() => ajouterLigne(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zeze-vert text-zeze-vert rounded-bouton hover:bg-zeze-vert/10"
                  >
                    <Plus size={12} /> {s.produit.nom} ({s.quantite} dispo)
                  </button>
                ))}
              {stockDisponible.every((s) => produitsDejaDans.includes(s.produit_id)) && lignes.length > 0 && (
                <p className="text-xs text-texte-secondaire italic">Tous vos produits sont dans la vente.</p>
              )}
            </div>
          </div>

          {/* Tableau des lignes */}
          {lignes.length > 0 && (
            <div className="border border-bordure rounded-carte overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-fond-secondaire">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-texte-secondaire">Produit</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-texte-secondaire w-24">Quantité</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-texte-secondaire">Prix unit.</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-texte-secondaire">Sous-total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, idx) => (
                    <tr key={idx} className="border-t border-bordure">
                      <td className="px-3 py-2 font-medium text-texte-principal text-xs">{l.nom_produit}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number" min={1} max={l.stock_max} value={l.quantite}
                          onChange={(e) => modifierQte(idx, e.target.value)}
                          className="w-16 text-center text-xs border border-bordure rounded px-1 py-0.5"
                        />
                        <p className="text-xs text-texte-secondaire">/ {l.stock_max}</p>
                      </td>
                      <td className="px-2 py-2 text-right text-xs font-mono text-texte-secondaire">{formatMontant(l.prix_unitaire)}</td>
                      <td className="px-2 py-2 text-right text-xs font-mono font-semibold text-texte-principal">{formatMontant(l.prix_unitaire * l.quantite)}</td>
                      <td className="px-1 py-2">
                        <button type="button" onClick={() => retirerLigne(idx)} className="text-texte-secondaire hover:text-medical-critique">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-fond-secondaire border-t border-bordure">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs text-texte-secondaire text-right font-semibold">TOTAL</td>
                    <td className="px-2 py-2 text-right text-sm font-bold text-texte-principal font-mono">{formatMontant(total)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs text-zeze-vert-fonce text-right font-semibold">Votre gain (15%)</td>
                    <td className="px-2 py-2 text-right text-sm font-bold text-zeze-vert font-mono">{formatMontant(gainDelegue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-texte-principal mb-1">Nom du client (optionnel)</label>
              <input
                type="text" value={clientNom} onChange={(e) => setClientNom(e.target.value)}
                className="champ-input" placeholder="ex: Kouassi Bernard"
              />
            </div>
            <Button type="submit" variante="primaire" icone={ShoppingBag} chargement={vendre.isPending} disabled={lignes.length === 0}>
              Enregistrer la vente
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const MonStockPage = () => {
  const { data: stock = [], isLoading } = useMonStock();
  const { data: produits = [] } = useProduits({ actif: 'actif' });
  const { data: ventes = [] } = useMesVentes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-titres font-bold text-texte-principal">Mon Stock</h1>
        <p className="text-sm text-texte-secondaire mt-1">Gérez votre stock personnel et vos ventes directes</p>
      </div>

      <FormulaireAchat produits={produits} stock={stock} />
      <FormulaireVente stock={stock} />

      {/* Stock disponible */}
      <div className="carte p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-bordure flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <Package size={16} className="text-zeze-vert" /> Stock disponible
          </h2>
          <span className="text-xs text-texte-secondaire">{stock.length} produit{stock.length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : stock.length === 0 ? (
          <div className="text-center py-12 text-texte-secondaire">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p>Votre stock est vide. Achetez des produits ci-dessus.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-fond-secondaire border-b border-bordure">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">Produit</th>
                <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Catégorie</th>
                <th className="text-right px-4 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Prix de vente</th>
                <th className="text-center px-4 py-3 font-semibold text-texte-secondaire">Qté disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map((item) => (
                <tr key={item.id} className="hover:bg-fond-secondaire/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-texte-principal">{item.produit?.nom}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-texte-secondaire capitalize">{item.produit?.categorie}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-right font-mono text-texte-secondaire">{formatMontant(item.produit?.prix_unitaire)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${item.quantite === 0 ? 'text-medical-critique' : item.quantite <= 3 ? 'text-zeze-or' : 'text-zeze-vert'}`}>
                      {item.quantite}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Historique des ventes */}
      {ventes.length > 0 && (
        <div className="carte p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-bordure">
            <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
              <Clock size={16} className="text-zeze-or" /> Historique des ventes
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-fond-secondaire border-b border-bordure">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden md:table-cell">Produits</th>
                <th className="text-right px-4 py-3 font-semibold text-texte-secondaire">Montant</th>
                <th className="text-right px-4 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Votre gain (15%)</th>
                <th className="text-center px-4 py-3 font-semibold text-texte-secondaire">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventes.map((v) => (
                <tr key={v.id} className={`hover:bg-fond-secondaire/50 transition-colors ${v.statut === 'refuse' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-texte-secondaire whitespace-nowrap font-mono text-xs">
                    {new Date(v.date_mouvement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-texte-secondaire">{v.client_nom || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-texte-secondaire text-xs">
                    {parseLignes(v.lignes).map((l) => `${l.nom_produit} ×${l.quantite}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-texte-principal">
                    {formatMontant(v.montant_total)}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell font-mono text-zeze-or">
                    {v.statut === 'valide' ? formatMontant(v.gain_delegue) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.statut === 'en_attente' && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">En attente</span>}
                    {v.statut === 'valide'     && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 whitespace-nowrap">Validée</span>}
                    {v.statut === 'refuse'     && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 whitespace-nowrap">Refusée</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MonStockPage;
