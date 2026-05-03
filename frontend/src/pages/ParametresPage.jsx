import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { User, Lock, Building2, Save, Percent, Eye, EyeOff, Store, Pencil, X, Check, ImageUp, FileImage, Upload, AlertTriangle, RotateCcw } from 'lucide-react';

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
    queryFn: () => api.get('/parametres').then((r) => r.data),
  });

// ── Zone de dépôt de fichier ──────────────────────────────────────────────
const ZoneFichier = ({ label, fichier, onFichier }) => {
  const inputRef = useRef(null);
  const [survol, setSurvol] = useState(false);

  const traiter = (f) => {
    if (!f) return;
    if (!['image/png', 'image/jpeg'].includes(f.type)) return;
    onFichier(f);
  };

  return (
    <div>
      <p className="text-xs font-medium text-texte-principal mb-1.5">{label}</p>
      <div
        className={`border-2 border-dashed rounded-bouton p-4 text-center cursor-pointer transition-colors ${survol ? 'border-zeze-vert bg-zeze-vert/5' : 'border-bordure hover:border-zeze-vert/40'}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); traiter(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={(e) => traiter(e.target.files[0])} />
        {fichier ? (
          <div className="flex items-center justify-center gap-2 text-sm text-zeze-vert">
            <FileImage size={14} />
            <span className="font-medium truncate max-w-[180px]">{fichier.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onFichier(null); }} className="text-texte-secondaire hover:text-medical-critique">
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-texte-secondaire">PNG ou JPEG — Déposer ou cliquer</p>
        )}
      </div>
    </div>
  );
};

const SectionImagesOrdonnance = () => {
  const [header, setHeader] = useState(null);
  const [footer, setFooter] = useState(null);
  const [succes, setSucces] = useState('');
  const [erreur, setErreur] = useState('');

  const uploader = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (header) fd.append('header', header);
      if (footer) fd.append('footer', footer);
      return api.post('/parametres/images-ordonnance', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      setSucces(`Images mises à jour : ${data.mis_a_jour.join(', ')}`);
      setErreur('');
      setHeader(null);
      setFooter(null);
      setTimeout(() => setSucces(''), 5000);
    },
    onError: (e) => { setErreur(e?.response?.data?.message || 'Erreur lors de l\'envoi'); setSucces(''); },
  });

  return (
    <Section titre="Images d'ordonnance" icone={ImageUp}>
      <p className="text-xs text-texte-secondaire">
        Ces images sont utilisées comme en-tête et pied de page sur toutes les ordonnances PDF générées. Format PNG ou JPEG uniquement.
      </p>
      {succes && <Alert type="succes" message={succes} />}
      {erreur && <Alert type="erreur" message={erreur} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ZoneFichier label="En-tête (header)" fichier={header} onFichier={setHeader} />
        <ZoneFichier label="Pied de page (footer)" fichier={footer} onFichier={setFooter} />
      </div>

      <Button
        variante="primaire"
        icone={uploader.isPending ? undefined : Upload}
        chargement={uploader.isPending}
        onClick={() => uploader.mutate()}
        disabled={!header && !footer}
      >
        Envoyer les images
      </Button>
    </Section>
  );
};

const ZoneDangereuse = () => {
  const qc = useQueryClient();
  const [confirmation, setConfirmation] = useState('');
  const [ouvert, setOuvert]             = useState(false);
  const [succes, setSucces]             = useState(false);
  const [erreur, setErreur]             = useState('');
  const [chargement, setChargement]     = useState(false);

  const handleReset = async () => {
    if (confirmation !== 'RESET') return;
    setChargement(true);
    setErreur('');
    try {
      await api.post('/admin/reset');
      qc.invalidateQueries();
      setSucces(true);
      setOuvert(false);
      setConfirmation('');
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la remise à zéro');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="carte border border-red-200 bg-red-50 space-y-4">
      <h2 className="text-base font-titres font-semibold text-red-700 flex items-center gap-2">
        <AlertTriangle size={16} /> Zone dangereuse
      </h2>

      {succes && <Alert type="succes" message="Remise à zéro complète effectuée. Consultations, ordonnances, factures, commissions, exercices supprimés. Stock remis à 0." />}
      {erreur && <Alert type="erreur" message={erreur} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-texte-principal">Remettre les données à zéro</p>
          <p className="text-xs text-texte-secondaire mt-0.5">
            Supprime toutes les données de test. Remet le stock à 0.
            <br />
            <span className="font-medium text-texte-principal">Conservé :</span> utilisateurs, patients, catalogue produits.
          </p>
        </div>
        <Button
          variante="danger"
          icone={RotateCcw}
          onClick={() => { setOuvert(true); setSucces(false); }}
        >
          Remettre à zéro
        </Button>
      </div>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-fond-principal rounded-carte shadow-xl w-full max-w-md space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-texte-principal">Confirmer la remise à zéro</h3>
                <p className="text-xs text-texte-secondaire">Cette action est irréversible.</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-bouton p-3 text-xs text-red-700 space-y-1">
              <p className="font-semibold">Seront supprimés :</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Consultations et rendez-vous</li>
                <li>Ordonnances et factures de vente</li>
                <li>Factures d'achat et commandes d'approvisionnement</li>
                <li>Mouvements, commissions et stock délégués</li>
                <li>Exercices financiers</li>
                <li>Analyses NFS et fichiers patients</li>
                <li>Stock global remis à 0</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">
                Tapez <span className="font-mono font-bold text-red-600">RESET</span> pour confirmer
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="champ-input font-mono"
                placeholder="RESET"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variante="fantome"
                icone={X}
                onClick={() => { setOuvert(false); setConfirmation(''); }}
                disabled={chargement}
              >
                Annuler
              </Button>
              <Button
                variante="danger"
                icone={RotateCcw}
                onClick={handleReset}
                chargement={chargement}
                disabled={confirmation !== 'RESET' || chargement}
              >
                Remettre à zéro
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ParametresPage = () => {
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const [succes, setSucces] = useState('');
  const [erreur, setErreur] = useState('');

  // Paramètres globaux (commissions + cabinet)
  const { data: parametres = {} } = useParametres();
  const [commissions, setCommissions] = useState({ commission_stockiste: '', commission_delegue: '' });
  const [succesComm, setSuccesComm] = useState('');
  const [erreurComm, setErreurComm] = useState('');
  const estAdmin = utilisateur?.role === 'administrateur';

  // Cabinet
  const [cabinet, setCabinet] = useState({ nom_cabinet: '', adresse: '' });
  const [succesCabinet, setSuccesCabinet] = useState('');
  const [erreurCabinet, setErreurCabinet] = useState('');

  const sauvegarderParametres = useMutation({
    mutationFn: (data) => api.put('/parametres', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parametres'] }); },
  });

  const sauvegarderCommissions = useMutation({
    mutationFn: (data) => api.put('/parametres', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parametres'] });
      setSuccesComm('Commissions mises à jour. Taux propagé à tous les stockistes actifs.');
      setErreurComm('');
      setTimeout(() => setSuccesComm(''), 4000);
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

  const soumettreCabinet = () => {
    const nom = (cabinet.nom_cabinet || parametres.nom_cabinet || '').trim();
    const adr = (cabinet.adresse || parametres.adresse || '').trim();
    if (!nom) { setErreurCabinet('Le nom du cabinet est requis'); return; }
    sauvegarderParametres.mutate(
      { nom_cabinet: nom, adresse: adr },
      {
        onSuccess: () => {
          setSuccesCabinet('Informations cabinet mises à jour');
          setErreurCabinet('');
          setCabinet({ nom_cabinet: '', adresse: '' });
          setTimeout(() => setSuccesCabinet(''), 3000);
        },
        onError: (e) => setErreurCabinet(e?.response?.data?.message || 'Erreur'),
      }
    );
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

  // Cabinets des stockistes (admin uniquement)
  const { data: stockistes = [] } = useQuery({
    queryKey: ['users', { role: 'stockiste' }],
    queryFn: () => api.get('/users', { params: { role: 'stockiste', limite: 100 } }).then((r) => r.data?.data || []),
    enabled: estAdmin,
  });
  const [editionCabinet, setEditionCabinet] = useState(null); // { id, nom_cabinet }
  const [succesStockiste, setSuccesStockiste] = useState('');
  const [erreurStockiste, setErreurStockiste] = useState('');

  const sauvegarderCabinet = useMutation({
    mutationFn: ({ id, nom_cabinet }) => api.put(`/users/${id}`, { nom_cabinet }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', { role: 'stockiste' }] });
      setSuccesStockiste('Nom du cabinet mis à jour');
      setEditionCabinet(null);
      setErreurStockiste('');
      setTimeout(() => setSuccesStockiste(''), 3000);
    },
    onError: (e) => { setErreurStockiste(e?.response?.data?.message || 'Erreur'); },
  });

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
            Les gains sont calculés sur le montant encaissé. Taux par défaut pour les stockistes : <strong>{parametres.commission_stockiste ?? 25}%</strong>. Le taux d'un stockiste peut être ajusté individuellement dans sa fiche. Commission revendeur : <strong>{parametres.commission_delegue ?? 15}%</strong> prélevés sur la part du stockiste.
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
            <Champ label="Commission revendeur (%)">
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

      {/* Cabinets des stockistes (admin uniquement) */}
      {estAdmin && (
        <Section titre="Cabinets des stockistes" icone={Store}>
          {succesStockiste && <Alert type="succes" message={succesStockiste} />}
          {erreurStockiste && <Alert type="erreur" message={erreurStockiste} />}

          {stockistes.length === 0 ? (
            <p className="text-sm text-texte-secondaire italic">Aucun stockiste enregistré.</p>
          ) : (
            <div className="space-y-3">
              {stockistes.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-fond-secondaire rounded-bouton">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-texte-principal">{s.prenom} {s.nom}</p>
                    {editionCabinet?.id === s.id ? (
                      <input
                        autoFocus
                        className="champ-input mt-1 text-sm"
                        value={editionCabinet.nom_cabinet}
                        onChange={(e) => setEditionCabinet({ ...editionCabinet, nom_cabinet: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sauvegarderCabinet.mutate(editionCabinet);
                          if (e.key === 'Escape') setEditionCabinet(null);
                        }}
                        placeholder="Nom du cabinet"
                      />
                    ) : (
                      <p className="text-sm text-texte-secondaire mt-0.5">
                        {s.nom_cabinet || <span className="italic">Aucun nom de cabinet</span>}
                      </p>
                    )}
                  </div>

                  {editionCabinet?.id === s.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => sauvegarderCabinet.mutate(editionCabinet)}
                        disabled={sauvegarderCabinet.isPending}
                        className="p-1.5 text-zeze-vert hover:bg-white rounded"
                        title="Enregistrer"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditionCabinet(null)}
                        className="p-1.5 text-texte-secondaire hover:bg-white rounded"
                        title="Annuler"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditionCabinet({ id: s.id, nom_cabinet: s.nom_cabinet || '' })}
                      className="p-1.5 text-texte-secondaire hover:text-zeze-vert flex-shrink-0 rounded hover:bg-white"
                      title="Modifier le nom du cabinet"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Images d'ordonnance (admin + stockiste) */}
      {['administrateur', 'stockiste'].includes(utilisateur?.role) && (
        <SectionImagesOrdonnance />
      )}

      {/* Zone dangereuse — admin uniquement */}
      {estAdmin && <ZoneDangereuse />}

      {/* Informations cabinet */}
      <Section titre="Cabinet ZEZEPAGNON" icone={Building2}>
        {estAdmin ? (
          <>
            {succesCabinet && <Alert type="succes" message={succesCabinet} />}
            {erreurCabinet && <Alert type="erreur" message={erreurCabinet} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Champ label="Nom du cabinet">
                <input
                  type="text"
                  className="champ-input"
                  placeholder={parametres.nom_cabinet || 'ZEZEPAGNON — Pharmacopée africaine'}
                  value={cabinet.nom_cabinet}
                  onChange={(e) => setCabinet({ ...cabinet, nom_cabinet: e.target.value })}
                />
              </Champ>
              <Champ label="Adresse">
                <input
                  type="text"
                  className="champ-input"
                  placeholder={parametres.adresse || 'Abidjan, Côte d\'Ivoire'}
                  value={cabinet.adresse}
                  onChange={(e) => setCabinet({ ...cabinet, adresse: e.target.value })}
                />
              </Champ>
            </div>
            <Button
              variante="primaire"
              icone={Save}
              chargement={sauvegarderParametres.isPending}
              onClick={soumettreCabinet}
            >
              Enregistrer les informations
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-bordure">
              {[
                ['Domaine', 'patients.zezepagnon.solution'],
                ['Version', 'v1.0 — Phase 6'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-texte-principal">{val}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['Cabinet', parametres.nom_cabinet || 'ZEZEPAGNON — Pharmacopée africaine'],
              ['Adresse', parametres.adresse || 'Abidjan, Côte d\'Ivoire'],
              ['Domaine', 'patients.zezepagnon.solution'],
              ['Version', 'v1.0 — Phase 6'],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-texte-principal">{val}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default ParametresPage;
