import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  useValiderOrdonnance, useSupprimerOrdonnance, useModifierOrdonnanceGlobal,
  useCreerOrdonnanceDirecte, useRenouvelerOrdonnance, telechargerPDF,
} from '../hooks/useOrdonnances';
import { useRecherchePatients } from '../hooks/usePatients';
import { useMonStock } from '../hooks/useStockDelegue';
import ProduitPicker from '../components/ordonnances/ProduitPicker';
import {
  FileText, Download, Search, Receipt, CheckCircle,
  Pencil, Trash2, X, Save, Loader2, Plus, RefreshCw, UserPlus,
} from 'lucide-react';
import { formatMontant } from '../utils/formatMontant';

const useOrdonnancesGlobal = (params) =>
  useQuery({
    queryKey: ['ordonnances-global', params],
    queryFn: () => api.get('/ordonnances', { params }).then((r) => r.data),
  });

const useUtilisateursFiltres = (estAdmin) =>
  useQuery({
    queryKey: ['users', 'stockistes-delegues'],
    queryFn: () =>
      api.get('/users', { params: { limite: 100, actif: true } }).then((r) => r.data.data || []),
    enabled: estAdmin,
    staleTime: 5 * 60 * 1000,
  });

const STATUT = {
  brouillon: { label: 'Brouillon', couleur: 'bg-gray-100 text-gray-600' },
  validee:   { label: 'Validée',   couleur: 'bg-green-100 text-green-700' },
  annulee:   { label: 'Annulée',   couleur: 'bg-red-100 text-red-700' },
};

// ── Combobox patient avec recherche + création rapide ────────────────────────
const ComboboxPatient = ({ value, onChange }) => {
  const [saisie, setSaisie] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  const { data: suggestions = [], isFetching } = useRecherchePatients(saisie);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOuvert(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choisir = (patient) => {
    onChange({ patient_id: patient.id, label: `${patient.prenom} ${patient.nom}` });
    setSaisie(`${patient.prenom} ${patient.nom}`);
    setOuvert(false);
  };

  const choisirNouveau = () => {
    const parties = saisie.trim().split(/\s+/);
    const prenom = parties.slice(0, -1).join(' ') || parties[0] || '';
    const nom = parties.length > 1 ? parties[parties.length - 1] : '';
    onChange({ patient_id: null, patient_nom: nom || saisie.trim(), patient_prenom: prenom, label: saisie.trim() });
    setOuvert(false);
  };

  const effacer = () => { setSaisie(''); onChange(null); setOuvert(false); };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texte-secondaire pointer-events-none" />
        <input
          type="text"
          value={saisie}
          onChange={(e) => { setSaisie(e.target.value); setOuvert(true); onChange(null); }}
          onFocus={() => saisie.length >= 2 && setOuvert(true)}
          placeholder="Rechercher un patient ou saisir un nom..."
          className="champ-input pl-9 pr-8 w-full text-sm"
        />
        {(saisie || value) && (
          <button onClick={effacer} className="absolute right-2 top-1/2 -translate-y-1/2 text-texte-secondaire hover:text-texte-principal">
            <X size={14} />
          </button>
        )}
      </div>

      {value && (
        <div className="mt-1.5 flex items-center gap-2 text-sm text-zeze-vert">
          {value.patient_id
            ? <span className="font-medium">{value.label}</span>
            : <span className="flex items-center gap-1.5 text-amber-600"><UserPlus size={13} /><span>Nouveau patient : <strong>{value.label}</strong></span></span>
          }
        </div>
      )}

      {ouvert && saisie.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-bordure rounded-bouton shadow-lg max-h-56 overflow-y-auto">
          {isFetching && (
            <div className="px-3 py-2 text-xs text-texte-secondaire flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Recherche…
            </div>
          )}
          {!isFetching && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-texte-secondaire">Aucun patient trouvé</div>
          )}
          {suggestions.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => choisir(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-fond-secondaire flex items-center justify-between gap-2"
            >
              <span className="font-medium text-texte-principal">{p.prenom} {p.nom}</span>
              <span className="text-xs text-texte-secondaire font-mono">{p.numero_dossier}</span>
            </button>
          ))}
          <button
            onMouseDown={choisirNouveau}
            className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-2 border-t border-bordure text-amber-700"
          >
            <UserPlus size={13} />
            <span>Créer le patient <strong>"{saisie.trim()}"</strong></span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── Modal nouvelle ordonnance sans consultation ───────────────────────────────
const ModalNouvelleOrdonnance = ({ onFermer, onCreer, loading, erreur, estDelegue = false, stockDelegue = [] }) => {
  const [patient, setPatient] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const peutSoumettre = patient && lignes.length > 0;

  const handleCreer = () => {
    if (!peutSoumettre) return;
    const payload = { lignes, notes, date_ordonnance: date };
    if (patient.patient_id) {
      payload.patient_id = patient.patient_id;
    } else {
      payload.patient_nom = patient.patient_nom;
      payload.patient_prenom = patient.patient_prenom;
    }
    onCreer(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-bordure">
          <div>
            <h3 className="text-base font-semibold text-texte-principal">Nouvelle ordonnance</h3>
            <p className="text-sm text-texte-secondaire mt-0.5">Sans consultation préalable</p>
          </div>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-bouton">{erreur}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1.5">Patient</label>
            <ComboboxPatient value={patient} onChange={setPatient} />
            {patient && !patient.patient_id && (
              <p className="mt-1.5 text-xs text-amber-600">
                Un nouveau dossier patient sera créé. Vous pourrez compléter ses informations depuis sa fiche.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="champ-input w-full text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-texte-principal mb-2">Produits</p>
            <ProduitPicker lignes={lignes} onChange={setLignes} estDelegue={estDelegue} stockDelegue={stockDelegue} />
          </div>

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="champ-input w-full text-sm resize-none"
              placeholder="Notes complémentaires..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bordure">
          <button
            onClick={onFermer}
            className="px-4 py-2 text-sm font-medium text-texte-secondaire hover:text-texte-principal border border-bordure rounded-bouton transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreer}
            disabled={loading || !peutSoumettre}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert-fonce disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Créer l'ordonnance
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal renouvellement (avec choix source pour délégué) ─────────────────────
const ModalRenouveler = ({ ordonnance, onFermer, onRenouveler, loading, erreur, estDelegue = false, stockDelegue = [] }) => {
  const stockParProduit = Object.fromEntries(stockDelegue.map((s) => [s.produit_id, s.quantite]));

  const [lignes, setLignes] = useState(() => {
    const l = ordonnance.lignes;
    if (!Array.isArray(l)) return [];
    if (!estDelegue) return l;
    // Pour le délégué, s'assurer que chaque ligne a une source explicite
    return l.map((ligne) => {
      if (ligne.source) return ligne;
      const dispo = stockParProduit[ligne.produit_id] ?? 0;
      return { ...ligne, source: dispo > 0 ? 'stock' : 'achat' };
    });
  });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-bordure">
          <div>
            <h3 className="text-base font-semibold text-texte-principal">
              Renouveler — {ordonnance.numero}
            </h3>
            <p className="text-sm text-texte-secondaire mt-0.5">
              {ordonnance.patient?.prenom} {ordonnance.patient?.nom}
            </p>
          </div>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-bouton">{erreur}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Date du renouvellement</label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="champ-input text-sm w-48"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-texte-principal mb-2">Produits</p>
            <ProduitPicker lignes={lignes} onChange={setLignes} estDelegue={estDelegue} stockDelegue={stockDelegue} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bordure">
          <button
            onClick={onFermer}
            className="px-4 py-2 text-sm font-medium text-texte-secondaire hover:text-texte-principal border border-bordure rounded-bouton transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onRenouveler({ lignes, date_ordonnance: date })}
            disabled={loading || lignes.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-bouton hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Renouveler
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal modification ────────────────────────────────────────────────────────
const ModalModifier = ({ ordonnance, onFermer, onSauvegarder, loading }) => {
  const [lignes, setLignes] = useState(() => {
    const l = ordonnance.lignes;
    return Array.isArray(l) ? l : [];
  });
  const [notes, setNotes] = useState(ordonnance.notes || '');

  const handleSauvegarder = () => onSauvegarder({ lignes, notes });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-start justify-between p-5 border-b border-bordure">
          <div>
            <h3 className="text-base font-semibold text-texte-principal">
              Modifier l'ordonnance {ordonnance.numero}
            </h3>
            <p className="text-sm text-texte-secondaire mt-0.5">
              {ordonnance.patient?.prenom} {ordonnance.patient?.nom}
            </p>
          </div>
          <button onClick={onFermer} className="text-texte-secondaire hover:text-texte-principal p-1">
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {ordonnance.statut === 'validee' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-bouton px-3 py-2">
              Cette ordonnance est validée — seul un administrateur peut la modifier.
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-texte-principal mb-2">Produits</p>
            <ProduitPicker lignes={lignes} onChange={setLignes} />
          </div>

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="champ-input w-full text-sm resize-none"
              placeholder="Notes complémentaires..."
            />
          </div>
        </div>

        {/* Pied */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bordure">
          <button
            onClick={onFermer}
            className="px-4 py-2 text-sm font-medium text-texte-secondaire hover:text-texte-principal border border-bordure rounded-bouton transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSauvegarder}
            disabled={loading || lignes.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert-fonce disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const OrdonnancesPage = () => {
  const navigate = useNavigate();
  const { utilisateur, aLeRole } = useAuth();
  const estAdmin = aLeRole('administrateur');
  const estStockiste = aLeRole('stockiste');
  const estDelegue = aLeRole('delegue');
  const peutValider = aLeRole('administrateur', 'stockiste', 'delegue');

  const { data: stockDelegue = [] } = useMonStock(estDelegue);

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreUser, setFiltreUser] = useState('');
  const [telechargement, setTelechargement] = useState(null);
  const [validation, setValidation] = useState(null);
  const [suppression, setSuppression] = useState(null);
  const [ordARenouveler, setOrdARenouveler] = useState(null);
  const [ordAModifier, setOrdAModifier] = useState(null);
  const [afficherNouvelle, setAfficherNouvelle] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurModal, setErreurModal] = useState('');

  const params = {};
  if (filtreStatut) params.statut = filtreStatut;
  if (filtreUser) params.medecin_id = filtreUser;

  const { data: ordonnances = [], isLoading } = useOrdonnancesGlobal(params);
  const { data: utilisateurs = [] } = useUtilisateursFiltres(estAdmin);
  const validerOrd = useValiderOrdonnance();
  const supprimerOrd = useSupprimerOrdonnance();
  const modifierOrd = useModifierOrdonnanceGlobal();
  const creerDirecte = useCreerOrdonnanceDirecte();
  const renouvelerOrd = useRenouvelerOrdonnance();

  const utilisateursFiltres = utilisateurs.filter(
    (u) => u.role === 'stockiste' || u.role === 'delegue'
  );

  const filtrees = ordonnances.filter((o) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      o.numero?.toLowerCase().includes(q) ||
      o.patient?.nom?.toLowerCase().includes(q) ||
      o.patient?.prenom?.toLowerCase().includes(q) ||
      o.patient?.numero_dossier?.toLowerCase().includes(q)
    );
  });

  // Un utilisateur peut agir sur une ordonnance s'il l'a créée,
  // ou s'il est stockiste (ses revendeurs), ou s'il est admin
  const peutAgir = (o) => {
    if (estAdmin) return true;
    if (estStockiste) return true; // le backend filtre déjà la liste
    return o.medecin_id === utilisateur?.id;
  };

  const handlePDF = async (e, ord) => {
    e.stopPropagation();
    setTelechargement(ord.id);
    try { await telechargerPDF(ord.id, ord.numero); }
    finally { setTelechargement(null); }
  };

  const handleFacturer = async (e, ord) => {
    e.stopPropagation();
    try {
      await api.post(`/factures/depuis-ordonnance/${ord.id}`, { montant_paye: 0 });
      navigate('/facturation');
    } catch (err) {
      const msg = err?.response?.data?.code === 'EXERCICE_REQUIS'
        ? 'Aucun exercice comptable ouvert. L\'administrateur doit ouvrir un exercice dans "Exercices MAPA" avant de pouvoir facturer.'
        : (err?.response?.data?.message || 'Erreur lors de la création de la facture');
      alert(msg);
    }
  };

  const handleValider = async (e, ord) => {
    e.stopPropagation();
    if (!window.confirm(`Valider l'ordonnance ${ord.numero} ? Cette action est irréversible.`)) return;
    setValidation(ord.id);
    try {
      await validerOrd.mutateAsync(ord.id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setValidation(null);
    }
  };

  const handleSupprimer = async (e, ord) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer l'ordonnance ${ord.numero} ? Cette action est irréversible.`)) return;
    setSuppression(ord.id);
    setErreur('');
    try {
      await supprimerOrd.mutateAsync(ord.id);
    } catch (err) {
      setErreur(err?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setSuppression(null);
    }
  };

  const handleModifier = (e, ord) => {
    e.stopPropagation();
    setOrdAModifier(ord);
    setErreur('');
  };

  const handleSauvegarderModification = async ({ lignes, notes }) => {
    setErreur('');
    try {
      await modifierOrd.mutateAsync({ id: ordAModifier.id, lignes, notes });
      setOrdAModifier(null);
    } catch (err) {
      setErreur(err?.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleCreerDirecte = async (payload) => {
    setErreurModal('');
    try {
      await creerDirecte.mutateAsync(payload);
      setAfficherNouvelle(false);
    } catch (err) {
      setErreurModal(err?.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleRenouveler = (e, ord) => {
    e.stopPropagation();
    setOrdARenouveler(ord);
    setErreurModal('');
  };

  const handleConfirmerRenouvellement = async ({ lignes, date_ordonnance }) => {
    setErreurModal('');
    try {
      await renouvelerOrd.mutateAsync({ id: ordARenouveler.id, lignes, date_ordonnance });
      setOrdARenouveler(null);
    } catch (err) {
      setErreurModal(err?.response?.data?.message || 'Erreur lors du renouvellement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Ordonnances</h1>
          <p className="text-sm text-texte-secondaire mt-1">{filtrees.length} ordonnance{filtrees.length !== 1 ? 's' : ''}</p>
        </div>
        {peutValider && (
          <button
            onClick={() => { setAfficherNouvelle(true); setErreurModal(''); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert-fonce transition-colors"
          >
            <Plus size={15} />
            Nouvelle ordonnance
          </button>
        )}
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-carte flex items-center justify-between">
          <span>{erreur}</span>
          <button onClick={() => setErreur('')} className="ml-3 text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}

      {/* Filtres */}
      <div className="carte py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texte-secondaire" />
            <input
              type="text"
              placeholder="Numéro, nom patient, dossier..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="champ-input pl-9"
            />
          </div>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="champ-input sm:w-40">
            <option value="">Tous statuts</option>
            {Object.entries(STATUT).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
          {estAdmin && utilisateursFiltres.length > 0 && (
            <select value={filtreUser} onChange={(e) => setFiltreUser(e.target.value)} className="champ-input sm:w-56">
              <option value="">Tous les utilisateurs</option>
              {utilisateursFiltres.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.role === 'stockiste' ? 'Stockiste' : 'Revendeur'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="carte p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
          </div>
        ) : filtrees.length === 0 ? (
          <div className="text-center py-12 text-texte-secondaire">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune ordonnance trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fond-secondaire border-b border-bordure">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">N°</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire">Patient</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-texte-secondaire hidden lg:table-cell">Créateur</th>
                  <th className="text-right px-4 py-3 font-semibold text-texte-secondaire hidden sm:table-cell">Montant</th>
                  <th className="text-center px-4 py-3 font-semibold text-texte-secondaire">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-texte-secondaire">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrees.map((o) => {
                  const cfg = STATUT[o.statut] || STATUT.brouillon;
                  const peutEditer = peutAgir(o) && (estAdmin || o.statut === 'brouillon');
                  const peutSupprimer = peutAgir(o) && (estAdmin || o.statut === 'brouillon');
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-fond-secondaire/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/patients/${o.patient_id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zeze-vert">{o.numero}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-texte-principal">{o.patient?.prenom} {o.patient?.nom}</p>
                        <p className="text-xs text-texte-secondaire font-mono">{o.patient?.numero_dossier}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-texte-secondaire whitespace-nowrap">
                        {new Date(o.date_ordonnance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-texte-secondaire">
                        {o.medecin ? `${o.medecin.prenom} ${o.medecin.nom}` : '—'}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-right font-mono text-texte-principal">
                        {formatMontant(o.montant_total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.couleur}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {peutValider && o.statut !== 'annulee' && (
                            <button
                              onClick={(e) => handleRenouveler(e, o)}
                              className="p-1.5 text-texte-secondaire hover:text-indigo-600 rounded"
                              title="Renouveler l'ordonnance"
                            >
                              <RefreshCw size={15} />
                            </button>
                          )}
                          {peutValider && o.statut === 'brouillon' && (
                            <button
                              onClick={(e) => handleValider(e, o)}
                              disabled={validation === o.id}
                              className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                              title="Valider l'ordonnance"
                            >
                              {validation === o.id
                                ? <Loader2 size={15} className="animate-spin text-zeze-vert" />
                                : <CheckCircle size={15} />}
                            </button>
                          )}
                          {peutEditer && (
                            <button
                              onClick={(e) => handleModifier(e, o)}
                              className="p-1.5 text-texte-secondaire hover:text-blue-600 rounded"
                              title="Modifier l'ordonnance"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handlePDF(e, o)}
                            disabled={telechargement === o.id}
                            className="p-1.5 text-texte-secondaire hover:text-zeze-vert rounded"
                            title="Télécharger PDF"
                          >
                            {telechargement === o.id
                              ? <Loader2 size={15} className="animate-spin text-zeze-vert" />
                              : <Download size={15} />}
                          </button>
                          {o.montant_total > 0 && o.statut !== 'annulee' && (
                            <button
                              onClick={(e) => handleFacturer(e, o)}
                              className="p-1.5 text-texte-secondaire hover:text-zeze-or rounded"
                              title="Créer une facture"
                            >
                              <Receipt size={15} />
                            </button>
                          )}
                          {peutSupprimer && (
                            <button
                              onClick={(e) => handleSupprimer(e, o)}
                              disabled={suppression === o.id}
                              className="p-1.5 text-texte-secondaire hover:text-red-600 rounded"
                              title="Supprimer l'ordonnance"
                            >
                              {suppression === o.id
                                ? <Loader2 size={15} className="animate-spin text-red-500" />
                                : <Trash2 size={15} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nouvelle ordonnance */}
      {afficherNouvelle && (
        <ModalNouvelleOrdonnance
          onFermer={() => { setAfficherNouvelle(false); setErreurModal(''); }}
          onCreer={handleCreerDirecte}
          loading={creerDirecte.isPending}
          erreur={erreurModal}
          estDelegue={estDelegue}
          stockDelegue={stockDelegue}
        />
      )}

      {/* Modal renouvellement */}
      {ordARenouveler && (
        <ModalRenouveler
          ordonnance={ordARenouveler}
          onFermer={() => { setOrdARenouveler(null); setErreurModal(''); }}
          onRenouveler={handleConfirmerRenouvellement}
          loading={renouvelerOrd.isPending}
          erreur={erreurModal}
          estDelegue={estDelegue}
          stockDelegue={stockDelegue}
        />
      )}

      {/* Modal modification */}
      {ordAModifier && (
        <ModalModifier
          ordonnance={ordAModifier}
          onFermer={() => { setOrdAModifier(null); setErreur(''); }}
          onSauvegarder={handleSauvegarderModification}
          loading={modifierOrd.isPending}
        />
      )}
    </div>
  );
};

export default OrdonnancesPage;
