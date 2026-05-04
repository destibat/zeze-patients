import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProduits } from '../hooks/useProduits';
import {
  usePretEmprunts, useStatsPretEmprunts,
  useCreerPretEmprunt, useRetournerPretEmprunt,
  useModifierPretEmprunt, useSupprimerPretEmprunt,
} from '../hooks/usePretEmprunts';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import {
  ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Plus, RotateCcw,
  Pencil, Trash2, X, Check, Search, ChevronDown, ChevronUp,
  Phone, Building2, Package,
} from 'lucide-react';

// ── Utilitaires ───────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const today = () => new Date().toISOString().split('T')[0];

const STATUT_CFG = {
  en_cours:      { label: 'En cours',       couleur: 'bg-yellow-100 text-yellow-800' },
  rendu_partiel: { label: 'Rendu partiel',  couleur: 'bg-blue-100 text-blue-700' },
  rendu:         { label: 'Rendu',          couleur: 'bg-green-100 text-green-800' },
};

const Badge = ({ statut }) => {
  const cfg = STATUT_CFG[statut] || STATUT_CFG.en_cours;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.couleur}`}>
      {cfg.label}
    </span>
  );
};

const BadgeType = ({ type }) =>
  type === 'pret'
    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700"><ArrowUpRight size={11} /> Prêt</span>
    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700"><ArrowDownLeft size={11} /> Emprunt</span>;

// ── Modal Créer ───────────────────────────────────────────────────────────────
const ModalCreer = ({ typeInitial = 'pret', onFermer, onCreate }) => {
  const { data: produits = [] } = useProduits({ actif: 'actif' });
  const creer = useCreerPretEmprunt();
  const [form, setForm] = useState({
    type: typeInitial,
    partenaire_nom: '',
    partenaire_telephone: '',
    partenaire_cabinet: '',
    produit_id: '',
    quantite: 1,
    date_pret: today(),
    note: '',
  });
  const [erreur, setErreur] = useState('');
  const [stockApres, setStockApres] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const produitSelectionne = produits.find((p) => p.id === form.produit_id);

  const handleSubmit = async () => {
    if (!form.partenaire_nom.trim()) { setErreur('Le nom du partenaire est obligatoire.'); return; }
    if (!form.produit_id)            { setErreur('Sélectionnez un produit.'); return; }
    if (form.quantite <= 0)          { setErreur('La quantité doit être supérieure à 0.'); return; }
    setErreur('');
    try {
      const res = await creer.mutateAsync({ ...form, quantite: parseInt(form.quantite) });
      setStockApres({ nom: res.produit?.nom, valeur: res.stock_apres });
      onCreate?.();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la création');
    }
  };

  if (stockApres) {
    const delta = form.type === 'pret' ? -parseInt(form.quantite) : +parseInt(form.quantite);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-fond-principal rounded-carte shadow-xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={20} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-texte-principal">Opération enregistrée</h3>
          </div>
          <div className="bg-fond-secondaire rounded-bouton p-3 text-sm space-y-1">
            <p className="text-texte-secondaire">Impact sur le stock cabinet :</p>
            <p className="font-semibold text-texte-principal">
              {delta > 0 ? '+' : ''}{delta} {stockApres.nom}
              <span className="text-texte-secondaire font-normal ml-2">→ stock actuel : {stockApres.valeur}</span>
            </p>
          </div>
          <Button variante="primaire" onClick={onFermer} className="w-full">Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-fond-principal rounded-carte shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-texte-principal flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-zeze-vert" />
            Nouveau {form.type === 'pret' ? 'prêt' : 'emprunt'}
          </h3>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal"><X size={18} /></button>
        </div>

        {erreur && <Alert type="erreur" message={erreur} />}

        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {[['pret', 'Prêt (je donne)', 'text-red-700'], ['emprunt', 'Emprunt (je reçois)', 'text-green-700']].map(([val, label, cls]) => (
            <button
              key={val}
              onClick={() => set('type', val)}
              className={`py-2 px-3 rounded-bouton border-2 text-sm font-medium transition-colors ${
                form.type === val ? 'border-zeze-vert bg-zeze-vert/10 ' + cls : 'border-bordure text-texte-secondaire hover:border-zeze-vert/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Partenaire */}
        <fieldset className="space-y-3 border border-bordure rounded-carte p-3">
          <legend className="text-xs font-semibold text-texte-secondaire px-1">Partenaire</legend>
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Nom <span className="text-red-500">*</span></label>
            <input value={form.partenaire_nom} onChange={(e) => set('partenaire_nom', e.target.value)}
              className="champ-input text-sm" placeholder="ex : Jean Kouassi" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-texte-principal mb-1">Téléphone</label>
              <input value={form.partenaire_telephone} onChange={(e) => set('partenaire_telephone', e.target.value)}
                className="champ-input text-sm" placeholder="+225..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-texte-principal mb-1">Cabinet / Structure</label>
              <input value={form.partenaire_cabinet} onChange={(e) => set('partenaire_cabinet', e.target.value)}
                className="champ-input text-sm" placeholder="Nom du cabinet" />
            </div>
          </div>
        </fieldset>

        {/* Produit + quantité */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-texte-principal mb-1">Produit <span className="text-red-500">*</span></label>
            <select value={form.produit_id} onChange={(e) => set('produit_id', e.target.value)} className="champ-input text-sm">
              <option value="">-- Sélectionner --</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}{form.type === 'pret' ? ` (stock : ${p.quantite_stock})` : ''}
                </option>
              ))}
            </select>
            {produitSelectionne && form.type === 'pret' && (
              <p className="text-xs text-texte-secondaire mt-1">
                Stock disponible : <span className={`font-semibold ${produitSelectionne.quantite_stock < form.quantite ? 'text-red-600' : 'text-zeze-vert'}`}>{produitSelectionne.quantite_stock}</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Quantité <span className="text-red-500">*</span></label>
            <input type="number" min={1} value={form.quantite} onChange={(e) => set('quantite', parseInt(e.target.value) || 1)}
              className="champ-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date_pret} onChange={(e) => set('date_pret', e.target.value)}
              className="champ-input text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-texte-principal mb-1">Note (optionnel)</label>
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)}
            className="champ-input text-sm resize-none" rows={2} placeholder="Commentaire libre..." />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variante="fantome" icone={X} onClick={onFermer}>Annuler</Button>
          <Button variante="primaire" icone={Check} chargement={creer.isPending} onClick={handleSubmit}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Retour ──────────────────────────────────────────────────────────────
const ModalRetour = ({ pret, onFermer }) => {
  const retourner = useRetournerPretEmprunt();
  const resteARendre = pret.quantite - pret.quantite_rendue;
  const [form, setForm] = useState({ date_retour: today(), quantite_rendue: resteARendre, note: '' });
  const [erreur, setErreur] = useState('');

  const handleSubmit = async () => {
    if (form.quantite_rendue <= 0 || form.quantite_rendue > resteARendre) {
      setErreur(`La quantité rendue doit être entre 1 et ${resteARendre}.`);
      return;
    }
    setErreur('');
    try {
      await retourner.mutateAsync({ id: pret.id, ...form, quantite_rendue: parseInt(form.quantite_rendue) });
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors du retour');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-fond-principal rounded-carte shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-texte-principal flex items-center gap-2">
            <RotateCcw size={16} className="text-zeze-vert" /> Saisir le retour
          </h3>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal"><X size={18} /></button>
        </div>

        <div className="bg-fond-secondaire rounded-bouton p-3 text-sm space-y-1">
          <p className="font-medium text-texte-principal">{pret.produit?.nom}</p>
          <p className="text-texte-secondaire">
            {pret.type === 'pret' ? 'Prêté à' : 'Emprunté auprès de'} <span className="font-medium text-texte-principal">{pret.partenaire_nom}</span>
          </p>
          <p className="text-texte-secondaire">
            Quantité totale : <span className="font-semibold">{pret.quantite}</span>
            {pret.quantite_rendue > 0 && <span className="ml-2 text-blue-600">· Déjà rendu : {pret.quantite_rendue}</span>}
            <span className="ml-2 font-semibold text-texte-principal">· Reste : {resteARendre}</span>
          </p>
        </div>

        {erreur && <Alert type="erreur" message={erreur} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Quantité rendue</label>
            <input type="number" min={1} max={resteARendre} value={form.quantite_rendue}
              onChange={(e) => setForm((f) => ({ ...f, quantite_rendue: parseInt(e.target.value) || 1 }))}
              className="champ-input text-sm" />
            {parseInt(form.quantite_rendue) < resteARendre && (
              <p className="text-xs text-blue-600 mt-1">Retour partiel → statut "rendu partiel"</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Date de retour</label>
            <input type="date" value={form.date_retour}
              onChange={(e) => setForm((f) => ({ ...f, date_retour: e.target.value }))}
              className="champ-input text-sm" />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variante="fantome" icone={X} onClick={onFermer}>Annuler</Button>
          <Button variante="primaire" icone={Check} chargement={retourner.isPending} onClick={handleSubmit}>
            Confirmer le retour
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Modifier ────────────────────────────────────────────────────────────
const ModalModifier = ({ pret, onFermer }) => {
  const modifier = useModifierPretEmprunt();
  const [form, setForm] = useState({
    partenaire_nom:       pret.partenaire_nom,
    partenaire_telephone: pret.partenaire_telephone || '',
    partenaire_cabinet:   pret.partenaire_cabinet || '',
    note:                 pret.note || '',
  });
  const [erreur, setErreur] = useState('');

  const handleSubmit = async () => {
    if (!form.partenaire_nom.trim()) { setErreur('Le nom du partenaire est obligatoire.'); return; }
    setErreur('');
    try {
      await modifier.mutateAsync({ id: pret.id, ...form });
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-fond-principal rounded-carte shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-texte-principal flex items-center gap-2">
            <Pencil size={16} className="text-zeze-vert" /> Modifier
          </h3>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal"><X size={18} /></button>
        </div>

        {erreur && <Alert type="erreur" message={erreur} />}

        <div>
          <label className="block text-xs font-medium text-texte-principal mb-1">Nom du partenaire <span className="text-red-500">*</span></label>
          <input value={form.partenaire_nom} onChange={(e) => setForm((f) => ({ ...f, partenaire_nom: e.target.value }))}
            className="champ-input text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Téléphone</label>
            <input value={form.partenaire_telephone} onChange={(e) => setForm((f) => ({ ...f, partenaire_telephone: e.target.value }))}
              className="champ-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-principal mb-1">Cabinet</label>
            <input value={form.partenaire_cabinet} onChange={(e) => setForm((f) => ({ ...f, partenaire_cabinet: e.target.value }))}
              className="champ-input text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-texte-principal mb-1">Note</label>
          <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="champ-input text-sm resize-none" rows={2} />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variante="fantome" icone={X} onClick={onFermer}>Annuler</Button>
          <Button variante="primaire" icone={Check} chargement={modifier.isPending} onClick={handleSubmit}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Ligne du tableau ──────────────────────────────────────────────────────────
const LignePret = ({ pret, estAdmin }) => {
  const supprimer = useSupprimerPretEmprunt();
  const [modalRetour,   setModalRetour]   = useState(false);
  const [modalModifier, setModalModifier] = useState(false);
  const [detail,        setDetail]        = useState(false);
  const [erreur,        setErreur]        = useState('');

  const peutRetourner = ['en_cours', 'rendu_partiel'].includes(pret.statut);

  const handleSupprimer = async () => {
    if (!window.confirm(`Supprimer ce ${pret.type === 'pret' ? 'prêt' : 'emprunt'} ? Le stock sera ajusté en conséquence.`)) return;
    try {
      await supprimer.mutateAsync(pret.id);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <>
      {modalRetour   && <ModalRetour   pret={pret} onFermer={() => setModalRetour(false)} />}
      {modalModifier && <ModalModifier pret={pret} onFermer={() => setModalModifier(false)} />}

      <tr className="border-t border-bordure hover:bg-fond-secondaire/50 transition-colors">
        <td className="px-3 py-2.5"><BadgeType type={pret.type} /></td>
        <td className="px-3 py-2.5 text-xs text-texte-secondaire">{fmtDate(pret.date_pret)}</td>
        <td className="px-3 py-2.5">
          <p className="text-sm font-medium text-texte-principal">{pret.partenaire_nom}</p>
          {pret.partenaire_cabinet && (
            <p className="text-xs text-texte-secondaire flex items-center gap-1"><Building2 size={10} /> {pret.partenaire_cabinet}</p>
          )}
          {pret.partenaire_telephone && (
            <p className="text-xs text-texte-secondaire flex items-center gap-1"><Phone size={10} /> {pret.partenaire_telephone}</p>
          )}
        </td>
        <td className="px-3 py-2.5 text-sm text-texte-principal">{pret.produit?.nom ?? '—'}</td>
        <td className="px-3 py-2.5 text-center">
          <span className="text-sm font-semibold text-texte-principal">{pret.quantite}</span>
          {pret.quantite_rendue > 0 && pret.statut !== 'rendu' && (
            <p className="text-xs text-blue-600">{pret.quantite_rendue} rendu(s)</p>
          )}
        </td>
        <td className="px-3 py-2.5"><Badge statut={pret.statut} /></td>
        <td className="px-3 py-2.5 text-xs text-texte-secondaire">{fmtDate(pret.date_retour)}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            {peutRetourner && (
              <button onClick={() => setModalRetour(true)}
                className="text-xs px-2 py-1 bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert-fonce transition-colors flex items-center gap-1">
                <RotateCcw size={11} /> Retour
              </button>
            )}
            <button onClick={() => setDetail(!detail)}
              className="p-1.5 text-texte-secondaire hover:text-texte-principal hover:bg-fond-secondaire rounded-bouton transition-colors" title="Détail">
              {detail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {pret.statut === 'en_cours' && (
              <button onClick={() => setModalModifier(true)}
                className="p-1.5 text-texte-secondaire hover:text-texte-principal hover:bg-fond-secondaire rounded-bouton transition-colors" title="Modifier">
                <Pencil size={14} />
              </button>
            )}
            <button onClick={handleSupprimer} disabled={supprimer.isPending}
              className="p-1.5 text-texte-secondaire hover:text-medical-critique hover:bg-red-50 rounded-bouton transition-colors" title="Supprimer">
              <Trash2 size={14} />
            </button>
          </div>
          {erreur && <p className="text-xs text-red-600 mt-1">{erreur}</p>}
        </td>
      </tr>

      {detail && (
        <tr className="border-t border-bordure bg-fond-secondaire/30">
          <td colSpan={8} className="px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
              <div>
                <p className="text-texte-secondaire">Produit</p>
                <p className="font-medium text-texte-principal">{pret.produit?.nom ?? '—'}</p>
              </div>
              <div>
                <p className="text-texte-secondaire">Quantité totale</p>
                <p className="font-medium text-texte-principal">{pret.quantite}</p>
              </div>
              <div>
                <p className="text-texte-secondaire">Déjà rendu</p>
                <p className="font-medium text-blue-700">{pret.quantite_rendue}</p>
              </div>
              <div>
                <p className="text-texte-secondaire">Reste à rendre</p>
                <p className={`font-medium ${pret.quantite - pret.quantite_rendue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {pret.quantite - pret.quantite_rendue}
                </p>
              </div>
              <div>
                <p className="text-texte-secondaire">Date du {pret.type === 'pret' ? 'prêt' : 'emprunt'}</p>
                <p className="font-medium text-texte-principal">{fmtDate(pret.date_pret)}</p>
              </div>
              {pret.date_retour && (
                <div>
                  <p className="text-texte-secondaire">Date de retour</p>
                  <p className="font-medium text-texte-principal">{fmtDate(pret.date_retour)}</p>
                </div>
              )}
              {estAdmin && pret.stockiste && (
                <div>
                  <p className="text-texte-secondaire">Stockiste</p>
                  <p className="font-medium text-texte-principal">{pret.stockiste.prenom} {pret.stockiste.nom}</p>
                </div>
              )}
              <div className="col-span-2 sm:col-span-4">
                <p className="text-texte-secondaire">Note</p>
                <p className={pret.note ? 'italic text-texte-principal' : 'italic text-texte-secondaire opacity-60'}>
                  {pret.note || 'Aucune note.'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const PretsEmpruntsPage = () => {
  const { utilisateur } = useAuth();
  const estAdmin = utilisateur?.role === 'administrateur';

  const [filtres, setFiltres] = useState({ type: '', statut: 'en_cours', partenaire: '', date_debut: '', date_fin: '' });
  const [filtreSaisi, setFiltreSaisi] = useState({ ...filtres });
  const [modalCreer, setModalCreer]   = useState(null); // null | 'pret' | 'emprunt'

  const { data: stats } = useStatsPretEmprunts();
  const { data: prets = [], isLoading } = usePretEmprunts(
    Object.fromEntries(Object.entries(filtreSaisi).filter(([, v]) => v !== ''))
  );

  const appliquerFiltres = () => setFiltreSaisi({ ...filtres });
  const reinitFiltres    = () => {
    const vide = { type: '', statut: '', partenaire: '', date_debut: '', date_fin: '' };
    setFiltres(vide);
    setFiltreSaisi(vide);
  };

  const pretsEnCours    = stats?.prets_en_cours    ?? 0;
  const empruntsEnCours = stats?.emprunts_en_cours ?? 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal flex items-center gap-2">
            <ArrowRightLeft size={22} className="text-zeze-vert" /> Prêts et Emprunts
          </h1>
          <p className="text-sm text-texte-secondaire mt-1">Traçabilité des dépannages mutuels de produits</p>
        </div>
        <div className="flex gap-2">
          <Button variante="danger" icone={ArrowUpRight} onClick={() => setModalCreer('pret')}>
            Nouveau prêt
          </Button>
          <Button variante="primaire" icone={ArrowDownLeft} onClick={() => setModalCreer('emprunt')}>
            Nouvel emprunt
          </Button>
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={() => { setFiltres((f) => ({ ...f, type: 'pret', statut: 'en_cours' })); setFiltreSaisi({ ...filtres, type: 'pret', statut: 'en_cours' }); }}
          className={`carte cursor-pointer hover:shadow-md transition-shadow border-l-4 ${pretsEnCours > 5 ? 'border-l-orange-400' : 'border-l-red-400'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-texte-secondaire">Prêts en cours</p>
              <p className={`text-2xl font-bold ${pretsEnCours > 5 ? 'text-orange-500' : 'text-texte-principal'}`}>{pretsEnCours}</p>
            </div>
            <ArrowUpRight size={28} className={pretsEnCours > 5 ? 'text-orange-400' : 'text-red-400'} />
          </div>
          {pretsEnCours > 5 && <p className="text-xs text-orange-600 mt-1">Plusieurs prêts en attente de retour</p>}
        </div>
        <div
          onClick={() => { setFiltres((f) => ({ ...f, type: 'emprunt', statut: 'en_cours' })); setFiltreSaisi({ ...filtres, type: 'emprunt', statut: 'en_cours' }); }}
          className={`carte cursor-pointer hover:shadow-md transition-shadow border-l-4 ${empruntsEnCours > 5 ? 'border-l-orange-400' : 'border-l-green-400'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-texte-secondaire">Emprunts à rendre</p>
              <p className={`text-2xl font-bold ${empruntsEnCours > 5 ? 'text-orange-500' : 'text-texte-principal'}`}>{empruntsEnCours}</p>
            </div>
            <ArrowDownLeft size={28} className={empruntsEnCours > 5 ? 'text-orange-400' : 'text-green-400'} />
          </div>
          {empruntsEnCours > 5 && <p className="text-xs text-orange-600 mt-1">Plusieurs emprunts à régulariser</p>}
        </div>
      </div>

      {/* Filtres */}
      <div className="carte space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Type</label>
            <select value={filtres.type} onChange={(e) => setFiltres((f) => ({ ...f, type: e.target.value }))} className="champ-input text-sm">
              <option value="">Tous</option>
              <option value="pret">Prêts (sortants)</option>
              <option value="emprunt">Emprunts (entrants)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Statut</label>
            <select value={filtres.statut} onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value }))} className="champ-input text-sm">
              <option value="">Tous</option>
              <option value="en_cours">En cours</option>
              <option value="rendu_partiel">Rendu partiel</option>
              <option value="rendu">Rendus</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Partenaire</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-secondaire pointer-events-none" />
              <input value={filtres.partenaire} onChange={(e) => setFiltres((f) => ({ ...f, partenaire: e.target.value }))}
                className="champ-input text-sm pl-7" placeholder="Nom..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Du</label>
            <input type="date" value={filtres.date_debut} onChange={(e) => setFiltres((f) => ({ ...f, date_debut: e.target.value }))} className="champ-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Au</label>
            <input type="date" value={filtres.date_fin} onChange={(e) => setFiltres((f) => ({ ...f, date_fin: e.target.value }))} className="champ-input text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variante="primaire" icone={Search} onClick={appliquerFiltres}>Rechercher</Button>
          <Button variante="fantome" icone={X} onClick={reinitFiltres}>Réinitialiser</Button>
        </div>
      </div>

      {/* Tableau */}
      <div className="carte p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : prets.length === 0 ? (
          <div className="text-center py-12 text-texte-secondaire">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucun prêt ou emprunt trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fond-secondaire border-b border-bordure">
                <tr>
                  {['Type', 'Date', 'Partenaire', 'Produit', 'Qté', 'Statut', 'Retour', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-texte-secondaire">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prets.map((p) => (
                  <LignePret key={p.id} pret={p} estAdmin={estAdmin} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalCreer && (
        <ModalCreer
          typeInitial={modalCreer}
          onFermer={() => setModalCreer(null)}
          onCreate={() => {}}
        />
      )}
    </div>
  );
};

export default PretsEmpruntsPage;
