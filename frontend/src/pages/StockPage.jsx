import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Package, TrendingUp, TrendingDown, AlertTriangle, X, Plus, Minus, RefreshCw } from 'lucide-react';

const useStock = () =>
  useQuery({ queryKey: ['stock'], queryFn: () => api.get('/stock').then((r) => r.data) });

const useMouvements = (produitId) =>
  useQuery({
    queryKey: ['stock-mouvements', produitId],
    queryFn: () => api.get(`/stock/${produitId}/mouvements`).then((r) => r.data),
    enabled: Boolean(produitId),
  });

const useEnregistrerMouvement = (produitId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/stock/${produitId}/mouvements`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-mouvements', produitId] });
    },
  });
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const categorieLabel = {
  antibiotique: 'Antibiotique',
  booster: 'Booster',
  specialise: 'Spécialisé',
  sommeil: 'Sommeil',
  prevention: 'Prévention',
  autre: 'Autre',
};

const MouvementModal = ({ produit, onFermer }) => {
  const [type, setType] = useState('entree');
  const [quantite, setQuantite] = useState(1);
  const [motif, setMotif] = useState('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [erreur, setErreur] = useState('');
  const enregistrer = useEnregistrerMouvement(produit.id);
  const { data: mouvements = [] } = useMouvements(produit.id);

  const soumettre = async () => {
    setErreur('');
    try {
      await enregistrer.mutateAsync({
        type,
        quantite: parseInt(quantite),
        motif,
        ...(type === 'entree' && dateLivraison ? { date_livraison: dateLivraison } : {}),
      });
      setQuantite(1);
      setMotif('');
      setDateLivraison('');
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-bordure">
          <div>
            <h2 className="font-semibold text-texte-principal">{produit.nom}</h2>
            <p className="text-sm text-texte-secondaire">Stock actuel : <span className="font-bold text-zeze-vert">{produit.quantite_stock}</span></p>
          </div>
          <button onClick={onFermer} className="p-1 text-texte-secondaire hover:text-texte-principal">
            <X size={20} />
          </button>
        </div>

        {/* Formulaire mouvement */}
        <div className="p-4 border-b border-bordure space-y-3">
          <div className="flex gap-2">
            {[
              { val: 'entree', label: 'Entrée', icone: Plus, cls: 'border-zeze-vert text-zeze-vert bg-green-50' },
              { val: 'sortie', label: 'Sortie', icone: Minus, cls: 'border-medical-critique text-medical-critique bg-red-50' },
              { val: 'ajustement', label: 'Ajustement', icone: RefreshCw, cls: 'border-blue-500 text-blue-500 bg-blue-50' },
            ].map(({ val, label, icone: Icone, cls }) => (
              <button
                key={val}
                type="button"
                onClick={() => setType(val)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium border rounded-bouton transition-colors ${
                  type === val ? cls : 'border-bordure text-texte-secondaire hover:bg-fond-secondaire'
                }`}
              >
                <Icone size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-texte-principal mb-1">Quantité</label>
              <input
                type="number"
                min={1}
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="champ-input"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-medium text-texte-principal mb-1">Motif</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="ex: Livraison fournisseur"
                className="champ-input"
              />
            </div>
          </div>

          {type === 'entree' && (
            <div>
              <label className="block text-xs font-medium text-texte-principal mb-1">Date de livraison</label>
              <input
                type="date"
                value={dateLivraison}
                onChange={(e) => setDateLivraison(e.target.value)}
                className="champ-input"
              />
            </div>
          )}

          {erreur && <Alert type="erreur" message={erreur} />}

          <Button variante="primaire" chargement={enregistrer.isPending} onClick={soumettre} className="w-full">
            Enregistrer le mouvement
          </Button>
        </div>

        {/* Historique */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Historique récent</p>
          {mouvements.length === 0 ? (
            <p className="text-sm text-texte-secondaire italic">Aucun mouvement enregistré</p>
          ) : (
            <div className="space-y-2">
              {mouvements.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-bordure last:border-0">
                  <div className="flex items-center gap-2">
                    {m.quantite > 0
                      ? <TrendingUp size={14} className="text-zeze-vert" />
                      : <TrendingDown size={14} className="text-medical-critique" />
                    }
                    <div>
                      <p className="text-xs font-medium text-texte-principal">
                        {m.quantite > 0 ? '+' : ''}{m.quantite} — stock : {m.stock_apres}
                      </p>
                      <p className="text-xs text-texte-secondaire">
                        {m.motif || m.type} · {new Date(m.created_at).toLocaleDateString('fr-FR')}
                        {m.date_livraison && (
                          <span className="ml-1 text-zeze-vert">· livré le {new Date(m.date_livraison).toLocaleDateString('fr-FR')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StockPage = () => {
  const { aLeRole } = useAuth();
  const { data: produits = [], isLoading } = useStock();
  const [produitSelectionne, setProduitSelectionne] = useState(null);
  const [filtreCategorie, setFiltreCategorie] = useState('');

  const peutGerer = aLeRole('administrateur', 'stockiste');
  const alertes = produits.filter((p) => p.actif && p.quantite_stock <= p.seuil_alerte);
  const produitsFiltres = filtreCategorie
    ? produits.filter((p) => p.categorie === filtreCategorie)
    : produits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Stock produits</h1>
          <p className="text-sm text-texte-secondaire mt-1">{produits.length} produits · {alertes.length} alerte{alertes.length !== 1 ? 's' : ''}</p>
        </div>
        <select
          value={filtreCategorie}
          onChange={(e) => setFiltreCategorie(e.target.value)}
          className="champ-input sm:w-48"
        >
          <option value="">Toutes catégories</option>
          {Object.entries(categorieLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Alertes stock bas */}
      {alertes.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-carte p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-600" />
            <p className="text-sm font-semibold text-orange-800">Stock bas — {alertes.length} produit{alertes.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertes.map((p) => (
              <span key={p.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                {p.nom} ({p.quantite_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grille produits */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {produitsFiltres.map((p) => {
            const stockBas = p.quantite_stock <= p.seuil_alerte;
            const stockVide = p.quantite_stock === 0;
            return (
              <div
                key={p.id}
                className={`carte hover:shadow-md transition-shadow ${!p.actif ? 'opacity-50' : ''} ${stockVide ? 'border-medical-critique/30' : stockBas ? 'border-orange-300' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-texte-principal leading-tight">{p.nom}</p>
                    <p className="text-xs text-texte-secondaire capitalize mt-0.5">{categorieLabel[p.categorie]}</p>
                  </div>
                  <Package size={16} className={stockVide ? 'text-medical-critique' : stockBas ? 'text-orange-500' : 'text-zeze-vert'} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold font-titres ${stockVide ? 'text-medical-critique' : stockBas ? 'text-orange-600' : 'text-zeze-vert'}`}>
                      {p.quantite_stock}
                    </p>
                    <p className="text-xs text-texte-secondaire">unités · seuil {p.seuil_alerte}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-texte-secondaire">{formatMontant(p.prix_unitaire)}</p>
                    {peutGerer && (
                      <button
                        onClick={() => setProduitSelectionne(p)}
                        className="mt-1 text-xs text-zeze-vert hover:underline font-medium"
                      >
                        Gérer →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {produitSelectionne && (
        <MouvementModal
          produit={produitSelectionne}
          onFermer={() => setProduitSelectionne(null)}
        />
      )}
    </div>
  );
};

export default StockPage;
