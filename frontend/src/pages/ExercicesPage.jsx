import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useExercices, useExerciceActuel, useBilanExercice,
  useOuvrirExercice, useCloturerExercice, useRouvrirExercice,
} from '../hooks/useExercices';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import {
  BookOpen, BookMarked, Lock, Unlock, Plus, ChevronDown, ChevronUp,
  TrendingUp, Users, Wallet, Printer, Loader2, AlertTriangle, X,
} from 'lucide-react';

// ── Utilitaires ──────────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(2).replace('.', ',') + ' M'
    : new Intl.NumberFormat('fr-FR').format(n ?? 0);

const fmtFCFA = (n) => fmt(n) + ' FCFA';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const statutBadge = (s) => {
  if (s === 'ouvert')  return 'bg-green-100 text-green-800 border border-green-300';
  if (s === 'rouvert') return 'bg-amber-100 text-amber-800 border border-amber-300';
  return 'bg-gray-100 text-gray-600 border border-gray-300';
};

const statutLabel = (s) => ({ ouvert: 'Ouvert', cloture: 'Clôturé', rouvert: 'Rouvert' }[s] ?? s);

// ── Modal confirmation ouverture ─────────────────────────────────────────────
const ModalOuvrir = ({ onConfirm, onAnnuler, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-carte shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <BookOpen size={20} className="text-zeze-vert mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-base font-semibold text-texte-principal">Ouvrir un nouvel exercice</h3>
          <p className="text-sm text-texte-secondaire mt-1">
            Un nouvel exercice va être créé et ouvert. Toutes les ventes et factures émises
            à partir de maintenant y seront automatiquement rattachées.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variante="fantome" onClick={onAnnuler}>Annuler</Button>
        <Button variante="primaire" icone={BookOpen} chargement={loading} onClick={onConfirm}>
          Ouvrir l'exercice
        </Button>
      </div>
    </div>
  </div>
);

// ── Modal clôture avec aperçu bilan ─────────────────────────────────────────
const ModalCloturer = ({ exerciceId, onConfirm, onAnnuler, loading }) => {
  const { data, isLoading } = useBilanExercice(exerciceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Lock size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-texte-principal">Clôturer l'exercice</h3>
                <p className="text-sm text-texte-secondaire mt-0.5">
                  Aperçu du bilan — un nouvel exercice s'ouvrira automatiquement.
                </p>
              </div>
            </div>
            <button onClick={onAnnuler} className="text-texte-secondaire hover:text-texte-principal p-1">
              <X size={18} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-texte-secondaire" /></div>
          ) : data ? (
            <AperçuBilan bilan={data.bilan} exercice={data.exercice} />
          ) : null}

          <div className="flex justify-end gap-2 border-t border-bordure pt-4">
            <Button variante="fantome" onClick={onAnnuler}>Annuler</Button>
            <Button variante="danger" icone={Lock} chargement={loading} onClick={onConfirm}>
              Confirmer la clôture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal réouverture (admin uniquement) ─────────────────────────────────────
const ModalRouvrir = ({ exercice, onConfirm, onAnnuler, loading }) => {
  const [motif, setMotif] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Unlock size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-texte-principal">
              Rouvrir {exercice.numero}
            </h3>
            <p className="text-sm text-texte-secondaire mt-1">
              Action réservée à l'administrateur. Le motif est obligatoire et sera enregistré dans le journal.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-texte-principal mb-1">Motif de réouverture *</label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
            className="champ-input text-sm resize-none w-full"
            placeholder="Ex : Correction d'une erreur de saisie sur la vente du 12/04/2026…"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variante="fantome" onClick={onAnnuler}>Annuler</Button>
          <Button
            variante="secondaire"
            icone={Unlock}
            chargement={loading}
            disabled={!motif.trim()}
            onClick={() => onConfirm(motif)}
          >
            Rouvrir
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Bloc résumé bilan (réutilisé dans modal clôture et page bilan) ───────────
export const AperçuBilan = ({ bilan, exercice }) => {
  if (!bilan) return null;
  return (
    <div className="space-y-4">
      {/* Période */}
      {exercice && (
        <div className="text-xs text-texte-secondaire bg-fond-secondaire rounded-bouton px-3 py-2">
          Période : {fmtDate(exercice.date_ouverture)} → {exercice.date_cloture ? fmtDate(exercice.date_cloture) : 'aujourd\'hui'}
          {exercice.duree_jours != null && ` — ${exercice.duree_jours} jour${exercice.duree_jours > 1 ? 's' : ''}`}
        </div>
      )}

      {/* Totaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CA Total', val: bilan.ca_total, couleur: 'text-zeze-vert font-bold' },
          { label: 'Com. Stockistes', val: bilan.commissions_stockistes, couleur: 'text-blue-600' },
          { label: 'Com. Délégués', val: bilan.commissions_delegues, couleur: 'text-purple-600' },
          { label: 'Net MAPA', val: bilan.net_mapa, couleur: 'text-red-600 font-bold' },
        ].map(({ label, val, couleur }) => (
          <div key={label} className="bg-fond-secondaire rounded-bouton p-3 text-center">
            <p className="text-xs text-texte-secondaire mb-1">{label}</p>
            <p className={`text-sm ${couleur}`}>{fmtFCFA(val)}</p>
          </div>
        ))}
      </div>

      {/* Sous-totaux factures vs délégués */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="border border-bordure rounded-bouton p-3">
          <p className="text-xs text-texte-secondaire mb-1">Factures directes</p>
          <p className="font-medium text-texte-principal">{fmtFCFA(bilan.ca_factures)}</p>
          <p className="text-xs text-texte-secondaire">{bilan.nb_factures} facture{bilan.nb_factures > 1 ? 's' : ''}</p>
        </div>
        <div className="border border-bordure rounded-bouton p-3">
          <p className="text-xs text-texte-secondaire mb-1">Ventes délégués</p>
          <p className="font-medium text-texte-principal">{fmtFCFA(bilan.ca_delegues)}</p>
          <p className="text-xs text-texte-secondaire">{bilan.nb_ventes_delegues} vente{bilan.nb_ventes_delegues > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Détail délégués */}
      {bilan.par_delegue?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Délégués</p>
          <div className="divide-y divide-bordure border border-bordure rounded-bouton overflow-hidden text-sm">
            {bilan.par_delegue.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="font-medium text-texte-principal">{d.nom}</p>
                  <p className="text-xs text-texte-secondaire">{d.nb_ventes} vente{d.nb_ventes > 1 ? 's' : ''} · {fmtFCFA(d.ca)}</p>
                </div>
                <span className="text-purple-600 font-medium">{fmtFCFA(d.gain_delegue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Détail stockistes */}
      {bilan.par_stockiste?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Stockistes</p>
          <div className="divide-y divide-bordure border border-bordure rounded-bouton overflow-hidden text-sm">
            {bilan.par_stockiste.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="font-medium text-texte-principal">{s.nom}</p>
                  <p className="text-xs text-texte-secondaire">Taux {s.taux}%</p>
                </div>
                <span className="text-blue-600 font-medium">{fmtFCFA(s.commission_totale)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top produits */}
      {bilan.top_produits?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2">Produits vendus</p>
          <div className="divide-y divide-bordure border border-bordure rounded-bouton overflow-hidden text-sm">
            {bilan.top_produits.slice(0, 8).map((p) => (
              <div key={p.nom} className="flex items-center justify-between px-3 py-2">
                <p className="text-texte-principal">{p.nom}</p>
                <div className="text-right text-xs text-texte-secondaire">
                  <span className="font-medium text-texte-principal">{p.quantite} unité{p.quantite > 1 ? 's' : ''}</span>
                  {' · '}{fmtFCFA(p.ca)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Carte exercice ────────────────────────────────────────────────────────────
const CarteExercice = ({ exercice, estAdmin, onCloturer, onRouvrir, onVoirBilan }) => {
  const [developpee, setDeveloppee] = useState(false);
  const estOuvert = ['ouvert', 'rouvert'].includes(exercice.statut);
  const dureeJours = exercice.date_cloture
    ? Math.floor((new Date(exercice.date_cloture) - new Date(exercice.date_ouverture)) / 86400000)
    : Math.floor((new Date() - new Date(exercice.date_ouverture)) / 86400000);

  return (
    <div className="border border-bordure rounded-carte overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-fond-secondaire/50 text-left transition-colors"
        onClick={() => setDeveloppee((v) => !v)}
      >
        <BookMarked size={16} className={estOuvert ? 'text-zeze-vert' : 'text-texte-secondaire'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-texte-principal">{exercice.numero}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutBadge(exercice.statut)}`}>
              {statutLabel(exercice.statut)}
            </span>
          </div>
          <p className="text-xs text-texte-secondaire mt-0.5">
            Ouvert le {fmtDate(exercice.date_ouverture)}
            {exercice.date_cloture && ` → Clôturé le ${fmtDate(exercice.date_cloture)}`}
            {' · '}{dureeJours} jour{dureeJours > 1 ? 's' : ''}
            {exercice.ouvreur && ` · ${exercice.ouvreur.prenom} ${exercice.ouvreur.nom}`}
          </p>
        </div>
        {developpee ? <ChevronUp size={16} className="text-texte-secondaire flex-shrink-0" /> : <ChevronDown size={16} className="text-texte-secondaire flex-shrink-0" />}
      </button>

      {developpee && (
        <div className="border-t border-bordure p-4 bg-fond-secondaire/30 space-y-3">
          {exercice.motif_reouverture && (
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-bouton px-3 py-2 text-amber-700">
              <span className="font-semibold">Motif de réouverture :</span> {exercice.motif_reouverture}
              {exercice.rouvreur && ` (${exercice.rouvreur.prenom} ${exercice.rouvreur.nom})`}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variante="fantome" icone={TrendingUp} onClick={() => onVoirBilan(exercice.id)}>
              Voir le bilan
            </Button>
            {estOuvert && (
              <Button variante="danger" icone={Lock} onClick={() => onCloturer(exercice.id)}>
                Clôturer
              </Button>
            )}
            {!estOuvert && estAdmin && (
              <Button variante="fantome" icone={Unlock} onClick={() => onRouvrir(exercice)}>
                Rouvrir (admin)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────────────────────
const ExercicesPage = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const estAdmin = utilisateur?.role === 'administrateur';

  const [modalOuvrir, setModalOuvrir] = useState(false);
  const [modalCloturer, setModalCloturer] = useState(null); // exerciceId
  const [modalRouvrir, setModalRouvrir] = useState(null);   // exercice
  const [message, setMessage] = useState({ type: '', texte: '' });

  const { data: actuel } = useExerciceActuel();
  const { data: liste, isLoading } = useExercices({ limite: 50 });
  const ouvrir = useOuvrirExercice();
  const cloturer = useCloturerExercice();
  const rouvrir = useRouvrirExercice();

  const flash = (type, texte) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage({ type: '', texte: '' }), 5000);
  };

  const handleOuvrir = async () => {
    try {
      await ouvrir.mutateAsync();
      setModalOuvrir(false);
      flash('succes', 'Exercice ouvert avec succès.');
    } catch (e) {
      flash('erreur', e?.response?.data?.message || 'Erreur lors de l\'ouverture.');
      setModalOuvrir(false);
    }
  };

  const handleCloturer = async () => {
    try {
      const res = await cloturer.mutateAsync(modalCloturer);
      setModalCloturer(null);
      flash('succes', `Exercice clôturé. Nouvel exercice ${res.exercice_suivant.numero} ouvert.`);
    } catch (e) {
      flash('erreur', e?.response?.data?.message || 'Erreur lors de la clôture.');
      setModalCloturer(null);
    }
  };

  const handleRouvrir = async (motif) => {
    try {
      await rouvrir.mutateAsync({ id: modalRouvrir.id, motif });
      setModalRouvrir(null);
      flash('succes', `Exercice ${modalRouvrir.numero} rouvert.`);
    } catch (e) {
      flash('erreur', e?.response?.data?.message || 'Erreur lors de la réouverture.');
      setModalRouvrir(null);
    }
  };

  const exerciceOuvert = actuel?.exercice;
  const exercices = liste?.exercices ?? [];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-titres font-bold text-texte-principal">Exercices MAPA</h1>
        {!exerciceOuvert && (
          <Button variante="primaire" icone={Plus} onClick={() => setModalOuvrir(true)}>
            Ouvrir un exercice
          </Button>
        )}
      </div>

      {message.texte && <Alert type={message.type} message={message.texte} />}

      {/* Exercice en cours */}
      {exerciceOuvert && (
        <div className={`border rounded-carte p-4 space-y-3 ${
          exerciceOuvert.statut === 'rouvert'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-zeze-vert/5 border-zeze-vert/20'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={16} className="text-zeze-vert" />
                <span className="font-semibold text-texte-principal">{exerciceOuvert.numero}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutBadge(exerciceOuvert.statut)}`}>
                  {statutLabel(exerciceOuvert.statut)}
                </span>
              </div>
              <p className="text-xs text-texte-secondaire">
                Ouvert le {fmtDate(exerciceOuvert.date_ouverture)} · {actuel.duree_jours} jour{actuel.duree_jours > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-texte-secondaire">CA accumulé</p>
              <p className="text-lg font-bold text-zeze-vert">{fmtFCFA(actuel.ca_accumule)}</p>
              {actuel.ca_factures > 0 && actuel.ca_delegues > 0 && (
                <p className="text-xs text-texte-secondaire">
                  {fmtFCFA(actuel.ca_factures)} fact. + {fmtFCFA(actuel.ca_delegues)} dél.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variante="fantome" icone={TrendingUp} onClick={() => navigate(`/exercices/${exerciceOuvert.id}/bilan`)}>
              Voir le bilan
            </Button>
            <Button variante="danger" icone={Lock} onClick={() => setModalCloturer(exerciceOuvert.id)}>
              Clôturer l'exercice
            </Button>
          </div>
        </div>
      )}

      {/* Liste historique */}
      <div>
        <h2 className="text-sm font-semibold text-texte-secondaire uppercase tracking-wide mb-3">
          Historique des exercices
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-texte-secondaire" />
          </div>
        ) : exercices.length === 0 ? (
          <div className="text-center py-10 text-texte-secondaire">
            <BookMarked size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm italic">Aucun exercice enregistré</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercices.map((ex) => (
              <CarteExercice
                key={ex.id}
                exercice={ex}
                estAdmin={estAdmin}
                onCloturer={(id) => setModalCloturer(id)}
                onRouvrir={(ex) => setModalRouvrir(ex)}
                onVoirBilan={(id) => navigate(`/exercices/${id}/bilan`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalOuvrir && (
        <ModalOuvrir
          onConfirm={handleOuvrir}
          onAnnuler={() => setModalOuvrir(false)}
          loading={ouvrir.isPending}
        />
      )}
      {modalCloturer && (
        <ModalCloturer
          exerciceId={modalCloturer}
          onConfirm={handleCloturer}
          onAnnuler={() => setModalCloturer(null)}
          loading={cloturer.isPending}
        />
      )}
      {modalRouvrir && (
        <ModalRouvrir
          exercice={modalRouvrir}
          onConfirm={handleRouvrir}
          onAnnuler={() => setModalRouvrir(null)}
          loading={rouvrir.isPending}
        />
      )}
    </div>
  );
};

export default ExercicesPage;
