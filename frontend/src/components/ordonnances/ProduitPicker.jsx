import { useState } from 'react';
import { useProduits } from '../../hooks/useProduits';
import { Search, Plus, X, Package } from 'lucide-react';

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const ProduitPicker = ({ lignes = [], onChange, posologie, estDelegue = false, stockDelegue = [] }) => {
  const [recherche, setRecherche] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const { data: produits = [] } = useProduits({ actif: 'actif' });

  const stockParProduit = Object.fromEntries(
    stockDelegue.map((s) => [s.produit_id, s.quantite])
  );

  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  const ajouterProduit = (produit) => {
    const dejaPresent = lignes.find((l) => l.produit_id === produit.id);
    if (dejaPresent) return;
    const dispoStock = stockParProduit[produit.id] ?? 0;
    onChange([
      ...lignes,
      {
        produit_id: produit.id,
        nom_produit: produit.nom,
        quantite: 1,
        prix_unitaire: produit.prix_unitaire,
        posologie: posologie?.instructions || '',
        duree: posologie?.duree || '',
        source: estDelegue && dispoStock > 0 ? 'stock' : 'achat',
      },
    ]);
    setRecherche('');
    setOuvert(false);
  };

  const retirerLigne = (idx) => {
    onChange(lignes.filter((_, i) => i !== idx));
  };

  const modifierLigne = (idx, champ, valeur) => {
    onChange(lignes.map((l, i) => (i === idx ? { ...l, [champ]: valeur } : l)));
  };

  const total = lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);

  return (
    <div className="space-y-3">
      {/* Sélecteur produit */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOuvert(!ouvert)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zeze-vert border border-zeze-vert rounded-bouton hover:bg-fond-secondaire"
        >
          <Plus size={16} />
          Ajouter un produit
        </button>

        {ouvert && (
          <div className="absolute z-50 mt-1 w-80 bg-white border border-bordure rounded-carte shadow-lg">
            <div className="p-2 border-b border-bordure">
              <div className="flex items-center gap-2 px-2 py-1 border border-bordure rounded-bouton">
                <Search size={14} className="text-texte-secondaire" />
                <input
                  autoFocus
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder="Rechercher un produit..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {produitsFiltres.length === 0 ? (
                <p className="text-sm text-texte-secondaire text-center py-4">Aucun produit</p>
              ) : (
                produitsFiltres.map((p) => {
                  const dispo = stockParProduit[p.id] ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => ajouterProduit(p)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-fond-secondaire border-b border-bordure last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-texte-principal">{p.nom}</p>
                        <p className="text-xs text-texte-secondaire capitalize">{p.categorie}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-zeze-vert">{formatMontant(p.prix_unitaire)}</p>
                        {estDelegue && dispo > 0 && (
                          <p className="text-xs text-green-600">Stock: {dispo}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lignes sélectionnées */}
      {lignes.length > 0 && (
        <div className="border border-bordure rounded-carte overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-fond-secondaire">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-texte-secondaire">Produit</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-texte-secondaire w-16">Qté</th>
                {estDelegue && (
                  <th className="px-2 py-2 text-center text-xs font-semibold text-texte-secondaire w-28">Source</th>
                )}
                <th className="px-2 py-2 text-left text-xs font-semibold text-texte-secondaire">Posologie</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-texte-secondaire w-24">Durée</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-texte-secondaire">Prix</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, idx) => {
                const dispoStock = stockParProduit[ligne.produit_id] ?? 0;
                return (
                  <tr key={idx} className="border-t border-bordure">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-zeze-vert shrink-0" />
                        <span className="font-medium text-texte-principal text-xs">{ligne.nom_produit}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        value={ligne.quantite}
                        onChange={(e) => modifierLigne(idx, 'quantite', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 text-center text-xs border border-bordure rounded px-1 py-0.5"
                      />
                    </td>
                    {estDelegue && (
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-0.5">
                          <select
                            value={ligne.source || 'achat'}
                            onChange={(e) => modifierLigne(idx, 'source', e.target.value)}
                            className="text-xs border border-bordure rounded px-1 py-0.5 bg-white"
                          >
                            <option value="achat">Achat direct</option>
                            <option value="stock" disabled={dispoStock === 0}>
                              Mon stock{dispoStock > 0 ? ` (${dispoStock})` : ' (vide)'}
                            </option>
                          </select>
                          {ligne.source === 'stock' && ligne.quantite > dispoStock && (
                            <p className="text-xs text-medical-critique">Insuffisant</p>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={ligne.posologie}
                        onChange={(e) => modifierLigne(idx, 'posologie', e.target.value)}
                        className="w-full text-xs border border-bordure rounded px-1 py-0.5"
                        placeholder="ex: 250ml matin"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={ligne.duree}
                        onChange={(e) => modifierLigne(idx, 'duree', e.target.value)}
                        className="w-full text-xs border border-bordure rounded px-1 py-0.5"
                        placeholder="ex: 1 mois"
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-xs font-mono text-texte-secondaire whitespace-nowrap">
                      {formatMontant(ligne.prix_unitaire * ligne.quantite)}
                    </td>
                    <td className="px-1 py-2">
                      <button type="button" onClick={() => retirerLigne(idx)} className="text-texte-secondaire hover:text-medical-critique">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-fond-secondaire border-t border-bordure">
              <tr>
                <td colSpan={estDelegue ? 5 : 4} className="px-3 py-2 text-xs font-semibold text-texte-secondaire text-right">TOTAL</td>
                <td className="px-2 py-2 text-right text-sm font-bold text-zeze-vert font-mono whitespace-nowrap">
                  {formatMontant(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProduitPicker;
