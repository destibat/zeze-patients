import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMettreAJourSeuil } from '../hooks/useStock';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Package, TrendingUp, TrendingDown, AlertTriangle, X, Plus, Minus, RefreshCw, Bell, BellOff, Pencil } from 'lucide-react';

const useStock = () =>
  useQuery({ queryKey: ['stock'], queryFn: () => api.get('/stock').then((r) => r.data), refetchInterval: 60 * 1000 });

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

const useCreerProduit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/produits', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
};

const useModifierProduit = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put(`/produits/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
};

const CATEGORIES = Object.entries(categorieLabel);

const ProduitModal = ({ produit, onFermer }) => {
  const estEdition = Boolean(produit);
  const [form, setForm] = useState({
    nom: produit?.nom || '',
    categorie: produit?.categorie || 'antibiotique',
    prix_unitaire: produit?.prix_unitaire ?? '',
    seuil_alerte: produit?.seuil_alerte ?? '',
    actif: produit?.actif ?? true,
  });
  const [erreur, setErreur] = useState('');
  const creer = useCreerProduit();
  const modifier = useModifierProduit(produit?.id);
  const mutation = estEdition ? modifier : creer;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    setErreur('');
    if (!form.nom.trim()) return setErreur('Le nom est requis');
    if (!form.prix_unitaire || isNaN(Number(form.prix_unitaire)) || Number(form.prix_unitaire) <= 0)
      return setErreur('Prix unitaire invalide');
    try {
      await mutation.mutateAsync({
        nom: form.nom.trim().toUpperCase(),
        categorie: form.categorie,
        prix_unitaire: parseInt(form.prix_unitaire),
        seuil_alerte: form.seuil_alerte === '' ? null : parseInt(form.seuil_alerte),
        actif: form.actif,
      });
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-bordure">
          <h2 className="font-semibold text-texte-principal">
            {estEdition ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button onClick={onFermer} className="p-1 text-texte-secondaire hover:text-texte-principal">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Nom du produit *</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => set('nom', e.target.value)}
              placeholder="ex: ANTIBIOTIQUE GRAND FORMAT"
              className="champ-input"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-texte-principal mb-1">Catégorie *</label>
              <select value={form.categorie} onChange={(e) => set('categorie', e.target.value)} className="champ-input">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-texte-principal mb-1">Prix unitaire (FCFA) *</label>
              <input
                type="number"
                min={1}
                value={form.prix_unitaire}
                onChange={(e) => set('prix_unitaire', e.target.value)}
                placeholder="ex: 40000"
                className="champ-input"
              />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-texte-principal mb-1">Seuil d'alerte stock</label>
              <input
                type="number"
                min={0}
                value={form.seuil_alerte}
                onChange={(e) => set('seuil_alerte', e.target.value)}
                placeholder="vide = pas d'alerte"
                className="champ-input"
              />
            </div>
            {estEdition && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-texte-principal mb-1">Statut</label>
                <select value={form.actif ? 'actif' : 'inactif'} onChange={(e) => set('actif', e.target.value === 'actif')} className="champ-input">
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            )}
          </div>

          {erreur && <Alert type="erreur" message={erreur} />}

          <div className="flex gap-2 pt-1">
            <Button variante="primaire" chargement={mutation.isPending} onClick={soumettre} className="flex-1">
              {estEdition ? 'Enregistrer les modifications' : 'Créer le produit'}
            </Button>
            <Button variante="fantome" onClick={onFermer}>Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MouvementModal = ({ produit, onFermer }) => {
  const [type, setType] = useState('entree');
  const [quantite, setQuantite] = useState(1);
  const [motif, setMotif] = useState('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [erreur, setErreur] = useState('');
  const [seuilEdition, setSeuilEdition] = useState(false);
  const [seuilValeur, setSeuilValeur] = useState(
    produit.seuil_alerte !== null ? String(produit.seuil_alerte) : ''
  );
  const enregistrer = useEnregistrerMouvement(produit.id);
  const mettreAJourSeuil = useMettreAJourSeuil();
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

        {/* Seuil d'alerte */}
        <div className="p-4 border-b border-bordure">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Seuil d'alerte</p>
            {!seuilEdition && (
              <button
                type="button"
                onClick={() => setSeuilEdition(true)}
                className="text-xs text-zeze-vert hover:underline font-medium"
              >
                Modifier
              </button>
            )}
          </div>
          {!seuilEdition ? (
            <div className="flex items-center gap-2">
              {produit.seuil_alerte !== null ? (
                <>
                  <Bell size={13} className="text-orange-500" />
                  <p className="text-sm text-texte-principal">
                    Alerte si stock ≤ <strong>{produit.seuil_alerte}</strong>
                  </p>
                </>
              ) : (
                <>
                  <BellOff size={13} className="text-texte-secondaire" />
                  <p className="text-sm text-texte-secondaire italic">Aucune alerte configurée</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={seuilValeur}
                onChange={(e) => setSeuilValeur(e.target.value)}
                placeholder="Ex: 5 (vide = pas d'alerte)"
                className="champ-input flex-1"
              />
              <Button
                variante="primaire"
                chargement={mettreAJourSeuil.isPending}
                onClick={async () => {
                  await mettreAJourSeuil.mutateAsync({
                    produitId: produit.id,
                    seuil_alerte: seuilValeur === '' ? null : parseInt(seuilValeur, 10),
                  });
                  setSeuilEdition(false);
                }}
              >
                OK
              </Button>
              <button
                type="button"
                onClick={() => { setSeuilEdition(false); setSeuilValeur(produit.seuil_alerte !== null ? String(produit.seuil_alerte) : ''); }}
                className="p-1.5 text-texte-secondaire hover:text-texte-principal"
              >
                <X size={16} />
              </button>
            </div>
          )}
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
  const [produitEdition, setProduitEdition]         = useState(null);
  const [creationOuverte, setCreationOuverte]       = useState(false);
  const [filtreCategorie, setFiltreCategorie]       = useState('');

  const peutGerer = aLeRole('administrateur', 'stockiste');
  const alertes = produits.filter(
    (p) => p.actif && p.seuil_alerte !== null && p.quantite_stock <= p.seuil_alerte
  );
  const ruptures = alertes.filter((p) => p.quantite_stock === 0);
  const basStock = alertes.filter((p) => p.quantite_stock > 0);
  const produitsFiltres = filtreCategorie
    ? produits.filter((p) => p.categorie === filtreCategorie)
    : produits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Stock produits</h1>
          <p className="text-sm text-texte-secondaire mt-1">
            {produits.length} produits
            {alertes.length > 0 && ` · ${ruptures.length > 0 ? `${ruptures.length} rupture${ruptures.length > 1 ? 's' : ''}` : ''}${ruptures.length > 0 && basStock.length > 0 ? ', ' : ''}${basStock.length > 0 ? `${basStock.length} stock bas` : ''}`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value)}
            className="champ-input sm:w-48"
          >
            <option value="">Toutes catégories</option>
            {Object.entries(categorieLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {peutGerer && (
            <Button variante="primaire" icone={Plus} onClick={() => setCreationOuverte(true)}>
              Nouveau produit
            </Button>
          )}
        </div>
      </div>

      {/* Alertes rupture */}
      {ruptures.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-carte p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-semibold text-red-800">Rupture de stock — {ruptures.length} produit{ruptures.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ruptures.map((p) => (
              <span key={p.id} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                {p.nom}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alertes stock bas */}
      {basStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-carte p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-600" />
            <p className="text-sm font-semibold text-orange-800">Stock bas — {basStock.length} produit{basStock.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {basStock.map((p) => (
              <span key={p.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                {p.nom} ({p.quantite_stock}/{p.seuil_alerte})
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
            const aUnSeuil = p.seuil_alerte !== null;
            const stockBas = aUnSeuil && p.quantite_stock <= p.seuil_alerte && p.quantite_stock > 0;
            const stockVide = aUnSeuil && p.quantite_stock === 0;
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
                  <div className="flex items-center gap-2">
                    {peutGerer && (
                      <button onClick={() => setProduitEdition(p)} className="text-texte-secondaire hover:text-zeze-vert" title="Modifier ce produit">
                        <Pencil size={14} />
                      </button>
                    )}
                    <Package size={16} className={stockVide ? 'text-medical-critique' : stockBas ? 'text-orange-500' : 'text-zeze-vert'} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold font-titres ${stockVide ? 'text-medical-critique' : stockBas ? 'text-orange-600' : 'text-zeze-vert'}`}>
                      {p.quantite_stock}
                    </p>
                    <p className="text-xs text-texte-secondaire">
                      unités{aUnSeuil ? ` · seuil ${p.seuil_alerte}` : ' · pas de seuil'}
                    </p>
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

      {creationOuverte && (
        <ProduitModal onFermer={() => setCreationOuverte(false)} />
      )}

      {produitEdition && (
        <ProduitModal produit={produitEdition} onFermer={() => setProduitEdition(null)} />
      )}
    </div>
  );
};

export default StockPage;
