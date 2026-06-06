import { useState, useEffect } from 'react';
import { Shield, LogOut, Save, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle, PlusCircle, Building2, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { loginSuperAdmin, getAbonnement, updateAbonnement, listerCabinets, creerCabinet, resetPasswordAdmin } from '../services/superadminService';

const TOKEN_KEY = 'superadmin_token';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const badgeStatut = (actif, expireLe) => {
  if (!actif) {
    const expired = expireLe && new Date(expireLe) < new Date();
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
        <XCircle size={14} />
        {expired ? 'Expiré' : 'Suspendu'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
      <CheckCircle2 size={14} />
      Actif
    </span>
  );
};

// ── Page de connexion superadmin ──────────────────────────────────────────────
const LoginForm = ({ onLogin }) => {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setErreur('');
    try {
      const token = await loginSuperAdmin(secret.trim());
      sessionStorage.setItem(TOKEN_KEY, token);
      onLogin(token);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erreur de connexion';
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-700 rounded-2xl mb-4">
            <Shield className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Super-Admin</h1>
          <p className="text-sm text-gray-500 mt-1">ZEZEPAGNON — Gestion des abonnements</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret d&apos;accès</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="••••••••••••"
              autoFocus
              required
            />
          </div>

          {erreur && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Accéder
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Accès réservé à l&apos;administrateur ZEZEPAGNON
        </p>
      </div>
    </div>
  );
};

// ── Formulaire d'édition de l'abonnement ─────────────────────────────────────
const FormulaireAbonnement = ({ data, token, onSaved }) => {
  const [actif, setActif] = useState(data.actif);
  const [expireLe, setExpireLe] = useState(data.expire_le || '');
  const [quota, setQuota] = useState(String(data.quota_ia_mensuel));
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setErreur('');
    setSucces(false);
    try {
      await updateAbonnement(token, {
        actif,
        expire_le: expireLe || null,
        quota_ia_mensuel: parseInt(quota, 10) || 100,
      });
      setSucces(true);
      onSaved();
      setTimeout(() => setSucces(false), 3000);
    } catch (err) {
      setErreur(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const quotaNum = parseInt(quota, 10) || 0;
  const pctUsage = quotaNum > 0 ? Math.min(100, Math.round((data.nb_analyses_ce_mois / quotaNum) * 100)) : 0;
  const couleurBarre = pctUsage >= 90 ? 'bg-red-500' : pctUsage >= 70 ? 'bg-orange-400' : 'bg-green-500';

  return (
    <div className="space-y-5">
      {/* Statut actif */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Statut de l&apos;abonnement</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Abonnement actif</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {actif ? 'L\'accès au cabinet est autorisé' : 'Toutes les écritures sont bloquées'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActif((v) => !v)}
            className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${actif ? 'bg-green-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${actif ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Date d&apos;expiration
          </label>
          <input
            type="date"
            value={expireLe}
            onChange={(e) => setExpireLe(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            {expireLe
              ? `Expire le ${fmtDate(expireLe)}`
              : 'Aucune date — abonnement sans limite de durée'}
          </p>
        </div>
      </div>

      {/* Quota IA */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Quota IA mensuel</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre d&apos;analyses IA autorisées par mois
          </label>
          <input
            type="number"
            min="0"
            max="9999"
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Consommation ce mois</span>
            <span className={pctUsage >= 90 ? 'text-red-600 font-semibold' : ''}>
              {data.nb_analyses_ce_mois} / {quotaNum} ({pctUsage}%)
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${couleurBarre}`} style={{ width: `${pctUsage}%` }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      {erreur && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {erreur}
        </p>
      )}

      {succes && (
        <p className="text-sm text-green-600 flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          Modifications enregistrées
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Enregistrer
      </button>
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErreur('');
    setSucces(null);
    try {
      const res = await creerCabinet(token, form);
      setSucces(res);
      setForm(vide);
      onCreated();
    } catch (err) {
      setErreur(err?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const champ = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {succes && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 size={14} /> Cabinet créé</p>
          <p className="mt-1 font-mono text-xs">{succes.domaine} · ID {succes.cabinet_id.slice(0, 8)}…</p>
        </div>
      )}
      {erreur && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} />{erreur}
        </div>
      )}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cabinet</p>
      {champ('Nom du cabinet *', 'nom', 'text', 'Ex: Cabinet Dupont')}
      {champ('Slug (URL) *', 'slug', 'text', 'ex: dupont → dupont.zezepagnon.solutions')}
      {champ('Domaine complet *', 'domaine', 'text', 'dupont.zezepagnon.solutions')}
      {champ('Adresse', 'adresse', 'text', 'Rue, ville…')}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Premier administrateur</p>
      <div className="grid grid-cols-2 gap-3">
        {champ('Prénom', 'admin_prenom', 'text', 'Jean')}
        {champ('Nom', 'admin_nom', 'text', 'Dupont')}
      </div>
      {champ('Email *', 'admin_email', 'email', 'admin@cabinet.com')}
      {champ('Mot de passe *', 'admin_password', 'password', '••••••••')}

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
        Créer le cabinet
      </button>
    </form>
  );
};

// ── Réinitialisation mot de passe dans une fiche cabinet ─────────────────────
const ResetPassword = ({ token, cabinet }) => {
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await resetPasswordAdmin(token, cabinet.id, email, mdp);
      setMsg({ ok: true, texte: 'Mot de passe mis à jour' });
      setEmail(''); setMdp('');
    } catch (err) {
      setMsg({ ok: false, texte: err?.response?.data?.message || 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-100 mt-2 pt-2">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        <KeyRound size={12} /> Réinitialiser mot de passe admin
        {ouvert ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
      </button>
      {ouvert && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          {msg && (
            <p className={`text-xs flex items-center gap-1 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {msg.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {msg.texte}
            </p>
          )}
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email de l'utilisateur" required
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="password" value={mdp} onChange={(e) => setMdp(e.target.value)}
            placeholder="Nouveau mot de passe" required
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Enregistrer
          </button>
        </form>
      )}
    </div>
  );
};

// ── Liste des cabinets ────────────────────────────────────────────────────────
const ListeCabinets = ({ token }) => {
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(true);

  const charger = async () => {
    try {
      const data = await listerCabinets(token);
      setCabinets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-green-600 w-5 h-5" /></div>;

  return (
    <div className="space-y-2">
      {cabinets.map((c) => (
        <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-gray-900">{c.nom}</p>
              <p className="text-xs text-gray-400 font-mono">{c.domaine}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {c.actif ? 'Actif' : 'Suspendu'}
            </span>
          </div>
          <ResetPassword token={token} cabinet={c} />
        </div>
      ))}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const SuperAdminPage = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [onglet, setOnglet] = useState('abonnement');
  const [refreshCabinets, setRefreshCabinets] = useState(0);

  const charger = async (tok) => {
    setLoading(true);
    setErreur('');
    try {
      const d = await getAbonnement(tok);
      setData(d);
    } catch (err) {
      if (err?.response?.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
      } else {
        setErreur(err?.response?.data?.message || 'Erreur de chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) charger(token);
  }, [token]);

  const handleLogin = (tok) => {
    sessionStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setData(null);
  };

  if (!token) return <LoginForm onLogin={handleLogin} />;

  const ONGLETS = [
    { id: 'abonnement', label: 'Abonnement', icone: Shield },
    { id: 'cabinets',   label: 'Cabinets',   icone: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-none">Super-Admin</h1>
              <p className="text-xs text-gray-500 mt-0.5">ZEZEPAGNON</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-6">
          {ONGLETS.map(({ id, label, icone: Icone }) => (
            <button
              key={id}
              onClick={() => setOnglet(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${onglet === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icone size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Onglet Abonnement */}
        {onglet === 'abonnement' && (
          <>
            {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-green-600" /></div>}
            {erreur && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={15} />{erreur}</div>}
            {data && !loading && (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cabinet</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{data.nom_cabinet || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{window.location.hostname}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {badgeStatut(data.actif, data.expire_le)}
                    <button onClick={() => charger(token)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                      <RefreshCw size={11} /> Actualiser
                    </button>
                  </div>
                </div>
                <FormulaireAbonnement data={data} token={token} onSaved={() => charger(token)} />
              </>
            )}
          </>
        )}

        {/* Onglet Cabinets */}
        {onglet === 'cabinets' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><PlusCircle size={16} className="text-green-600" /> Nouveau cabinet</h2>
              <FormulaireCabinet token={token} onCreated={() => setRefreshCabinets(r => r + 1)} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building2 size={16} className="text-green-600" /> Cabinets existants</h2>
              <ListeCabinets key={refreshCabinets} token={token} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPage;
