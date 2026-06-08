import { useState, useEffect, useCallback } from 'react';
import {
  Shield, LogOut, Save, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle,
  PlusCircle, Building2, KeyRound, ChevronDown, ChevronUp, Banknote,
  AlertCircle, Ban, LayoutDashboard,
} from 'lucide-react';
import {
  loginSuperAdmin, listerCabinets, creerCabinet, resetPasswordAdmin,
  validerPaiement, suspendre as suspendreCabinet,
} from '../services/superadminService';

const TOKEN_KEY = 'superadmin_token';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getStatut = (c) => {
  if (!c.abonnement_actif) return 'suspendu';
  if (!c.prochaine_echeance) return 'actif';
  const diffJours = Math.floor((Date.now() - new Date(c.prochaine_echeance)) / 86400000);
  if (diffJours >= 5) return 'suspendu_auto';
  if (diffJours >= 1) return 'en_retard';
  return 'actif';
};

const STATUT_CFG = {
  actif:         { label: 'Actif',     cls: 'bg-green-100 text-green-700',  Ic: CheckCircle2 },
  en_retard:     { label: 'En retard', cls: 'bg-amber-100 text-amber-700',  Ic: AlertCircle },
  suspendu:      { label: 'Suspendu',  cls: 'bg-red-100   text-red-700',    Ic: XCircle },
  suspendu_auto: { label: 'Suspendu',  cls: 'bg-red-100   text-red-700',    Ic: XCircle },
};

const BadgeStatut = ({ statut }) => {
  const s = STATUT_CFG[statut] || STATUT_CFG.actif;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      <s.Ic size={11} /> {s.label}
    </span>
  );
};

// ── Page de connexion ─────────────────────────────────────────────────────────
const LoginForm = ({ onLogin }) => {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true); setErreur('');
    try {
      const token = await loginSuperAdmin(secret.trim());
      onLogin(token);
    } catch (err) {
      setErreur(err?.response?.data?.message || 'Erreur de connexion');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-700 rounded-2xl mb-4">
            <Shield className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Super-Admin GECAM</h1>
          <p className="text-sm text-gray-500 mt-1">ZEZEPAGNON — Administration des cabinets</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret d&apos;accès</label>
            <input
              type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="••••••••••••" autoFocus required
            />
          </div>
          {erreur && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={14} />{erreur}</p>}
          <button
            type="submit" disabled={loading || !secret.trim()}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Accéder
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">Accès réservé à l&apos;administrateur ZEZEPAGNON</p>
      </div>
    </div>
  );
};

// ── Réinitialisation mot de passe ─────────────────────────────────────────────
const ResetPassword = ({ token, cabinetId }) => {
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await resetPasswordAdmin(token, cabinetId, email, mdp);
      setMsg({ ok: true, texte: 'Mot de passe mis à jour' });
      setEmail(''); setMdp('');
    } catch (err) {
      setMsg({ ok: false, texte: err?.response?.data?.message || 'Erreur' });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <button
        type="button" onClick={() => setOuvert(!ouvert)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <KeyRound size={11} /> Réinitialiser MDP admin
        {ouvert ? <ChevronUp size={10} className="ml-0.5" /> : <ChevronDown size={10} className="ml-0.5" />}
      </button>
      {ouvert && (
        <form onSubmit={submit} className="mt-2 space-y-1.5">
          {msg && (
            <p className={`text-xs flex items-center gap-1 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {msg.ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {msg.texte}
            </p>
          )}
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email de l'utilisateur" required
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="password" value={mdp} onChange={(e) => setMdp(e.target.value)}
            placeholder="Nouveau mot de passe" required
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Enregistrer
          </button>
        </form>
      )}
    </div>
  );
};

// ── Tableau de bord abonnements ───────────────────────────────────────────────
const TableauDeBord = ({ token }) => {
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enCours, setEnCours] = useState({}); // { cabinetId: true }

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listerCabinets(token);
      setCabinets(data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { charger(); }, [charger]);

  const setAction = (id, val) => setEnCours((a) => ({ ...a, [id]: val }));

  const handleValiderPaiement = async (cabinetId) => {
    setAction(cabinetId, true);
    try {
      await validerPaiement(token, cabinetId);
      await charger();
    } catch {
      // silencieux, l'utilisateur peut réessayer
    } finally {
      setAction(cabinetId, false);
    }
  };

  const handleSuspendre = async (cabinetId, nomCabinet) => {
    if (!window.confirm(`Suspendre le cabinet "${nomCabinet}" ?\n\nLes utilisateurs ne pourront plus effectuer d'opérations.`)) return;
    setAction(cabinetId, true);
    try {
      await suspendreCabinet(token, cabinetId);
      await charger();
    } catch {
      // silencieux
    } finally {
      setAction(cabinetId, false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600 w-6 h-6" /></div>;

  // KPIs
  const stats = { actif: 0, en_retard: 0, suspendu: 0 };
  cabinets.forEach((c) => {
    const s = getStatut(c);
    if (s === 'actif') stats.actif++;
    else if (s === 'en_retard') stats.en_retard++;
    else stats.suspendu++;
  });

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.actif}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><CheckCircle2 size={11} className="text-green-600" /> Actifs</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.en_retard}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><AlertCircle size={11} className="text-amber-500" /> En retard</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.suspendu}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><XCircle size={11} className="text-red-500" /> Suspendus</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{cabinets.length}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Building2 size={11} /> Total</p>
        </div>
      </div>

      {/* Table des cabinets */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={16} className="text-green-600" /> Cabinets ({cabinets.length})
          </h2>
          <button onClick={charger} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {cabinets.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              <Building2 size={24} className="mx-auto mb-2 opacity-30" />
              Aucun cabinet enregistré
            </div>
          )}

          {cabinets.map((c) => {
            const statut = getStatut(c);
            const isLoading = !!enCours[c.id];
            const nomAffiche = c.nom_affiche || c.nom;
            const peutValider = statut !== 'actif';
            const peutSuspendre = c.abonnement_actif && statut !== 'suspendu_auto';

            return (
              <div key={c.id} className="p-4 hover:bg-gray-50/70 transition-colors">
                {/* Ligne principale */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Nom + domaine */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{nomAffiche}</span>
                      <BadgeStatut statut={statut} />
                      {c.jours_retard > 0 && (
                        <span className={`text-xs font-semibold ${c.jours_retard >= 5 ? 'text-red-600' : 'text-amber-600'}`}>
                          {c.jours_retard}j de retard
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{c.domaine}</p>
                  </div>

                  {/* Prochaine échéance */}
                  <div className="sm:text-right shrink-0 sm:min-w-[130px]">
                    <p className="text-xs text-gray-400">Prochaine échéance</p>
                    <p className={`text-sm font-medium ${c.jours_retard > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmtDate(c.prochaine_echeance)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {peutValider && (
                      <button
                        onClick={() => handleValiderPaiement(c.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Banknote size={12} />}
                        Paiement reçu
                      </button>
                    )}
                    {peutSuspendre && (
                      <button
                        onClick={() => handleSuspendre(c.id, nomAffiche)}
                        disabled={isLoading}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Ban size={11} /> Suspendre
                      </button>
                    )}
                  </div>
                </div>

                {/* Reset MDP (collapsible) */}
                <div className="mt-3 pt-2.5 border-t border-gray-100">
                  <ResetPassword token={token} cabinetId={c.id} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <p className="text-xs text-gray-400 text-center">
        "Paiement reçu" réactive le cabinet et reporte l'échéance à 30 jours à compter d'aujourd'hui.
        Un cabinet est automatiquement suspendu 5 jours après la date d'échéance.
      </p>
    </div>
  );
};

// ── Formulaire création cabinet ───────────────────────────────────────────────
const FormulaireCabinet = ({ token, onCreated }) => {
  const vide = { slug: '', domaine: '', nom: '', adresse: '', admin_email: '', admin_password: '', admin_nom: '', admin_prenom: '' };
  const [form, setForm] = useState(vide);
  const [saving, setSaving] = useState(false);
  const [succes, setSucces] = useState(null);
  const [erreur, setErreur] = useState('');

  const set = (k) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: val };
      // Auto-remplissage du domaine si slug change
      if (k === 'slug' && !f.domaine.includes('.')) {
        next.domaine = val ? `${val.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.zezepagnon.solutions` : '';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setErreur(''); setSucces(null);
    try {
      const res = await creerCabinet(token, form);
      setSucces(res);
      setForm(vide);
      onCreated();
    } catch (err) {
      setErreur(err?.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const champ = (label, key, type = 'text', placeholder = '', requis = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{requis && ' *'}</label>
      <input
        type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} required={requis}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {succes && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 size={14} /> Cabinet créé</p>
          <p className="mt-1 font-mono text-xs">{succes.domaine} · ID {succes.cabinet_id?.slice(0, 8)}…</p>
          <p className="mt-0.5 text-xs">Prochaine échéance : {fmtDate(succes.prochaine_echeance)}</p>
        </div>
      )}
      {erreur && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} />{erreur}
        </div>
      )}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cabinet</p>
      {champ('Nom du cabinet', 'nom', 'text', 'Ex: Cabinet Dupont', true)}
      {champ('Slug (identifiant URL)', 'slug', 'text', 'ex: dupont', true)}
      {champ('Domaine complet', 'domaine', 'text', 'dupont.zezepagnon.solutions', true)}
      {champ('Adresse', 'adresse', 'text', 'Rue, ville…')}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Premier administrateur</p>
      <div className="grid grid-cols-2 gap-3">
        {champ('Prénom', 'admin_prenom', 'text', 'Jean')}
        {champ('Nom', 'admin_nom', 'text', 'Dupont')}
      </div>
      {champ('Email', 'admin_email', 'email', 'admin@cabinet.com', true)}
      {champ('Mot de passe', 'admin_password', 'password', '••••••••', true)}

      <p className="text-xs text-gray-400">L&apos;abonnement sera actif 30 jours à partir de la création.</p>

      <button
        type="submit" disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
        Créer le cabinet
      </button>
    </form>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const SuperAdminPage = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [onglet, setOnglet] = useState('dashboard');

  const handleLogin = (tok) => { sessionStorage.setItem(TOKEN_KEY, tok); setToken(tok); };
  const handleLogout = () => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); };

  if (!token) return <LoginForm onLogin={handleLogin} />;

  const ONGLETS = [
    { id: 'dashboard', label: 'Tableau de bord', Ic: LayoutDashboard },
    { id: 'nouveau',   label: 'Nouveau cabinet', Ic: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-none">Super-Admin GECAM</h1>
              <p className="text-xs text-gray-500 mt-0.5">ZEZEPAGNON</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-6">
          {ONGLETS.map(({ id, label, Ic }) => (
            <button
              key={id} onClick={() => setOnglet(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${onglet === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Ic size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {onglet === 'dashboard' && <TableauDeBord token={token} />}

        {onglet === 'nouveau' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PlusCircle size={16} className="text-green-600" /> Nouveau cabinet
            </h2>
            <FormulaireCabinet token={token} onCreated={() => setOnglet('dashboard')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPage;
