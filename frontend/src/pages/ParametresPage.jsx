import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { User, Lock, Building2, Save, Percent, Eye, EyeOff } from 'lucide-react';

const Section = ({ titre, icone: Icone, children }) => (
  <div className="carte space-y-4">
    <h2 className="text-base font-titres font-semibold text-texte-principal flex items-center gap-2">
      <Icone size={16} className="text-zeze-vert" /> {titre}
    </h2>
    {children}
  </div>
);

const ChampMotDePasse = ({ label, value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-texte-principal mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className="champ-input pr-10"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-texte-secondaire hover:text-texte-principal p-1 rounded"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

const Champ = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-texte-principal mb-1">{label}</label>
    {children}
  </div>
);

const useParametres = () =>
  useQuery({
    queryKey: ['parametres'],
    queryFn: () =>
      api.get('/parametres').then((r) =>
        r.data.reduce((acc, p) => ({ ...acc, [p.cle]: p.valeur }), {})
      ),
  });

const ParametresPage = () => {
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const [succes, setSucces] = useState('');
  const [erreur, setErreur] = useState('');

  // Commissions
  const { data: parametres = {} } = useParametres();
  const [commissions, setCommissions] = useState({ commission_stockiste: '', commission_delegue: '' });
  const [succesComm, setSuccesComm] = useState('');
  const [erreurComm, setErreurComm] = useState('');
  const estAdmin = utilisateur?.role === 'administrateur';

  const sauvegarderCommissions = useMutation({
    mutationFn: (data) => api.put('/parametres', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parametres'] });
      setSuccesComm('Commissions mises à jour');
      setErreurComm('');
      setTimeout(() => setSuccesComm(''), 3000);
    },
    onError: (e) => { setErreurComm(e?.response?.data?.message || 'Erreur'); },
  });

  const soumettreCommissions = () => {
    const s = parseFloat(commissions.commission_stockiste || parametres.commission_stockiste);
    const d = parseFloat(commissions.commission_delegue || parametres.commission_delegue);
    if (isNaN(s) || s < 0 || s > 100 || isNaN(d) || d < 0 || d > 100) {
      setErreurComm('Les taux doivent être entre 0 et 100'); return;
    }
    sauvegarderCommissions.mutate({ commission_stockiste: s, commission_delegue: d });
  };

  // Profil
  const [profil, setProfil] = useState({
    nom: utilisateur?.nom || '',
    prenom: utilisateur?.prenom || '',
    telephone: utilisateur?.telephone || '',
  });

  const mettreAJourProfil = useMutation({
    mutationFn: (data) => api.put(`/users/${utilisateur.id}`, data).then((r) => r.data),
    onSuccess: () => { setSucces('Profil mis à jour'); setErreur(''); setTimeout(() => setSucces(''), 3000); },
    onError: (e) => { setErreur(e?.response?.data?.message || 'Erreur'); setSucces(''); },
  });

  // Mot de passe
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmer: '' });
  const [erreurMdp, setErreurMdp] = useState('');
  const [succesMdp, setSuccesMdp] = useState('');

  const changerMdp = useMutation({
    mutationFn: (data) => api.put('/auth/changer-mdp', data).then((r) => r.data),
    onSuccess: () => {
      setSuccesMdp('Mot de passe modifié'); setErreurMdp('');
      setMdp({ ancien: '', nouveau: '', confirmer: '' });
      setTimeout(() => setSuccesMdp(''), 3000);
    },
    onError: (e) => { setErreurMdp(e?.response?.data?.message || 'Erreur'); setSuccesMdp(''); },
  });

  const soumettreParfil = () => {
    setErreur(''); setSucces('');
    mettreAJourProfil.mutate(profil);
  };

  const soumettreMdp = () => {
    setErreurMdp('');
    if (!mdp.ancien || !mdp.nouveau) { setErreurMdp('Tous les champs sont requis'); return; }
    if (mdp.nouveau.length < 8) { setErreurMdp('Le nouveau mot de passe doit contenir au moins 8 caractères'); return; }
    if (mdp.nouveau !== mdp.confirmer) { setErreurMdp('Les mots de passe ne correspondent pas'); return; }
    changerMdp.mutate({ ancienMotDePasse: mdp.ancien, nouveauMotDePasse: mdp.nouveau });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-titres font-bold text-texte-principal">Paramètres</h1>

      {/* Profil utilisateur */}
      <Section titre="Mon profil" icone={User}>
        {succes && <Alert type="succes" message={succes} />}
        {erreur && <Alert type="erreur" message={erreur} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Prénom">
            <input className="champ-input" value={profil.prenom} onChange={(e) => setProfil({ ...profil, prenom: e.target.value })} />
          </Champ>
          <Champ label="Nom">
            <input className="champ-input" value={profil.nom} onChange={(e) => setProfil({ ...profil, nom: e.target.value })} />
          </Champ>
          <Champ label="Téléphone">
            <input type="tel" className="champ-input" value={profil.telephone} onChange={(e) => setProfil({ ...profil, telephone: e.target.value })} />
          </Champ>
          <Champ label="Rôle">
            <input className="champ-input bg-fond-secondaire" value={utilisateur?.role || ''} disabled />
          </Champ>
          <Champ label="E-mail">
            <input className="champ-input bg-fond-secondaire" value={utilisateur?.email || ''} disabled />
          </Champ>
        </div>

        <Button variante="primaire" icone={Save} chargement={mettreAJourProfil.isPending} onClick={soumettreParfil}>
          Enregistrer le profil
        </Button>
      </Section>

      {/* Changement mot de passe */}
      <Section titre="Changer le mot de passe" icone={Lock}>
        {succesMdp && <Alert type="succes" message={succesMdp} />}
        {erreurMdp && <Alert type="erreur" message={erreurMdp} />}

        <div className="space-y-3">
          <ChampMotDePasse label="Mot de passe actuel" value={mdp.ancien} onChange={(e) => setMdp({ ...mdp, ancien: e.target.value })} />
          <ChampMotDePasse label="Nouveau mot de passe" value={mdp.nouveau} onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })} placeholder="Minimum 8 caractères" />
          <ChampMotDePasse label="Confirmer le nouveau mot de passe" value={mdp.confirmer} onChange={(e) => setMdp({ ...mdp, confirmer: e.target.value })} />
        </div>

        <Button variante="secondaire" icone={Lock} chargement={changerMdp.isPending} onClick={soumettreMdp}>
          Changer le mot de passe
        </Button>
      </Section>

      {/* Commissions (admin uniquement) */}
      {estAdmin && (
        <Section titre="Commissions sur ventes" icone={Percent}>
          {succesComm && <Alert type="succes" message={succesComm} />}
          {erreurComm && <Alert type="erreur" message={erreurComm} />}

          <p className="text-xs text-texte-secondaire">
            Les gains sont calculés sur le montant encaissé. Taux par défaut pour les stockistes : <strong>{parametres.commission_stockiste ?? 25}%</strong>. Le taux d'un stockiste peut être ajusté individuellement dans sa fiche. Commission délégué : <strong>{parametres.commission_delegue ?? 15}%</strong> prélevés sur la part du stockiste.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Champ label="Commission stockiste par défaut (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="champ-input"
                placeholder={parametres.commission_stockiste ?? '25'}
                value={commissions.commission_stockiste}
                onChange={(e) => setCommissions({ ...commissions, commission_stockiste: e.target.value })}
              />
            </Champ>
            <Champ label="Commission délégué (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="champ-input"
                placeholder={parametres.commission_delegue ?? '15'}
                value={commissions.commission_delegue}
                onChange={(e) => setCommissions({ ...commissions, commission_delegue: e.target.value })}
              />
            </Champ>
          </div>

          <Button variante="primaire" icone={Save} chargement={sauvegarderCommissions.isPending} onClick={soumettreCommissions}>
            Enregistrer les taux
          </Button>
        </Section>
      )}

      {/* Informations cabinet */}
      <Section titre="Cabinet ZEZEPAGNON" icone={Building2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            ['Cabinet', 'ZEZEPAGNON — Pharmacopée africaine'],
            ['Adresse', 'Abidjan, Côte d\'Ivoire'],
            ['Domaine', 'patients.zezepagnon.solution'],
            ['Version', 'v1.0 — Phase 6'],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-texte-principal">{val}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default ParametresPage;
