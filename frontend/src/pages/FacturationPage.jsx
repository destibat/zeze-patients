import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import {
  Receipt, CreditCard, CheckCircle, Clock, AlertCircle,
  XCircle, Plus, X, ChevronDown, ChevronUp, Bell, Phone, User, TrendingUp,
} from 'lucide-react';

// ── Hooks ─────────────────────────────────────────────────────────────────────

const useFactures = (params = {}) =>
  useQuery({
    queryKey: ['factures', params],
    queryFn: () => api.get('/factures', { params }).then((r) => r.data),
  });

const useParametres = () =>
  useQuery({
    queryKey: ['parametres'],
    queryFn: () =>
      api.get('/parametres').then((r) =>
        r.data.reduce((acc, p) => ({ ...acc, [p.cle]: parseFloat(p.valeur) }), {})
      ),
    staleTime: 5 * 60 * 1000,
  });

const useEnregistrerPaiement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.post(`/factures/${id}/paiement`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factures'] }),
  });
};

const useAnnulerFacture = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/factures/${id}/annuler`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factures'] }),
  });
};

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUT = {
  en_attente:           { label: 'En attente',          couleur: 'bg-yellow-100 text-yellow-800 border-yellow-200', icone: Clock },
  partiellement_payee:  { label: 'Partiellement payée', couleur: 'bg-blue-100 text-blue-800 border-blue-200',       icone: AlertCircle },
  payee:                { label: 'Payée',                couleur: 'bg-green-100 text-green-800 border-green-200',    icone: CheckCircle },
  annulee:              { label: 'Annulée',              couleur: 'bg-gray-100 text-gray-500 border-gray-200',       icone: XCircle },
};

const MODE_PAIEMENT = {
  especes:      'Espèces',
  mobile_money: 'Mobile Money',
  virement:     'Virement',
  cheque:       'Chèque',
  autre:        'Autre',
};

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

// ── Modal paiement ────────────────────────────────────────────────────────────

const ModalPaiement = ({ facture, onFermer }) => {
  const restant = facture.montant_total - facture.montant_paye;
  const [montant, setMontant] = useState(restant);
  const [mode, setMode] = useState(facture.mode_paiement || 'especes');
  const [erreur, setErreur] = useState('');
  const enregistrer = useEnregistrerPaiement();

  const soumettre = async () => {
    if (!montant || montant <= 0) { setErreur('Montant invalide'); return; }
    setErreur('');
    try {
      await enregistrer.mutateAsync({ id: facture.id, montant: parseInt(montant), mode_paiement: mode });
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-bordure">
          <h2 className="font-semibold text-texte-principal">Enregistrer un paiement</h2>
          <button onClick={onFermer}><X size={18} className="text-texte-secondaire" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-fond-secondaire rounded-bouton p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-texte-secondaire">Facture</span><span className="font-mono font-semibold">{facture.numero}</span></div>
            <div className="flex justify-between"><span className="text-texte-secondaire">Total</span><span>{formatMontant(facture.montant_total)}</span></div>
            <div className="flex justify-between"><span className="text-texte-secondaire">Déjà payé</span><span className="text-zeze-vert">{formatMontant(facture.montant_paye)}</span></div>
            <div className="flex justify-between font-semibold border-t border-bordure pt-1 mt-1"><span>Restant</span><span className="text-medical-critique">{formatMontant(restant)}</span></div>
          </div>

          {erreur && <Alert type="erreur" message={erreur} />}

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Montant reçu (FCFA)</label>
            <input type="number" min={1} max={restant} value={montant} onChange={(e) => setMontant(e.target.value)} className="champ-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Mode de paiement</label>
            <select className="champ-input" value={mode} onChange={(e) => setMode(e.target.value)}>
              {Object.entries(MODE_PAIEMENT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variante="primaire" chargement={enregistrer.isPending} onClick={soumettre}>Valider</Button>
            <Button variante="fantome" onClick={onFermer}>Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Ligne facture ─────────────────────────────────────────────────────────────

const LigneFacture = ({ facture, onPayer, onAnnuler }) => {
  const [ouverte, setOuverte] = useState(false);
  const cfg = STATUT[facture.statut] || STATUT.en_attente;
  const Icone = cfg.icone;
  const restant = facture.montant_total - facture.montant_paye;
  const lignes = facture.lignes || [];

  return (
    <div className="border border-bordure rounded-carte overflow-hidden">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-fond-secondaire/50"
        onClick={() => setOuverte(!ouverte)}
      >
        <div className="flex items-center gap-3">
          <Receipt size={16} className="text-zeze-vert flex-shrink-0" />
          <div>
            <p className="text-sm font-mono font-semibold text-texte-principal">{facture.numero}</p>
            <p className="text-xs text-texte-secondaire">
              {facture.patient?.prenom} {facture.patient?.nom} · {new Date(facture.date_facture).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-7 sm:ml-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-texte-principal">{formatMontant(facture.montant_total)}</p>
            {restant > 0 && facture.statut !== 'annulee' && (
              <p className="text-xs text-medical-critique">Reste : {formatMontant(restant)}</p>
            )}
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border whitespace-nowrap ${cfg.couleur}`}>
            <Icone size={11} /> {cfg.label}
          </span>
          {ouverte ? <ChevronUp size={14} className="text-texte-secondaire" /> : <ChevronDown size={14} className="text-texte-secondaire" />}
        </div>
      </div>

      {ouverte && (
        <div className="border-t border-bordure bg-fond-secondaire/30 p-4 space-y-3">
          {lignes.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-texte-secondaire">
                  <th className="text-left pb-1">Produit</th>
                  <th className="text-center pb-1 w-12">Qté</th>
                  <th className="text-right pb-1">Prix unit.</th>
                  <th className="text-right pb-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bordure">
                {lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1 text-texte-principal">{l.nom_produit}</td>
                    <td className="py-1 text-center">{l.quantite}</td>
                    <td className="py-1 text-right font-mono">{formatMontant(l.prix_unitaire)}</td>
                    <td className="py-1 text-right font-mono font-semibold">{formatMontant(l.prix_unitaire * l.quantite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-texte-secondaire">
            {facture.mode_paiement && <span>Mode : <strong>{MODE_PAIEMENT[facture.mode_paiement]}</strong></span>}
            {facture.montant_paye > 0 && <span>Payé : <strong className="text-zeze-vert">{formatMontant(facture.montant_paye)}</strong></span>}
            {facture.notes && <span>Notes : {facture.notes}</span>}
          </div>

          <div className="flex gap-2">
            {facture.statut !== 'payee' && facture.statut !== 'annulee' && (
              <Button variante="primaire" icone={CreditCard} onClick={(e) => { e.stopPropagation(); onPayer(facture); }}>
                Paiement
              </Button>
            )}
            {facture.statut !== 'annulee' && (
              <Button variante="fantome" onClick={(e) => { e.stopPropagation(); onAnnuler(facture); }}>
                Annuler la facture
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Vue Relances ──────────────────────────────────────────────────────────────

const PatientRelance = ({ patient, factures, onPayer, onAnnuler }) => {
  const [ouverte, setOuverte] = useState(false);
  const totalRestant = factures.reduce((s, f) => s + (f.montant_total - f.montant_paye), 0);
  const totalFacture = factures.reduce((s, f) => s + f.montant_total, 0);

  return (
    <div className="border border-bordure rounded-carte overflow-hidden">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-fond-secondaire/50"
        onClick={() => setOuverte(!ouverte)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-texte-principal">
              {patient.prenom} {patient.nom}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs font-mono text-texte-secondaire">{patient.numero_dossier}</span>
              {patient.telephone && (
                <a
                  href={`tel:${patient.telephone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-zeze-vert hover:underline"
                >
                  <Phone size={11} /> {patient.telephone}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-11 sm:ml-0">
          <div className="text-right">
            <p className="text-xs text-texte-secondaire">{factures.length} facture{factures.length > 1 ? 's' : ''}</p>
            <p className="text-sm font-bold text-medical-critique">{formatMontant(totalRestant)} restants</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 whitespace-nowrap">
            / {formatMontant(totalFacture)}
          </span>
          {ouverte ? <ChevronUp size={14} className="text-texte-secondaire" /> : <ChevronDown size={14} className="text-texte-secondaire" />}
        </div>
      </div>

      {ouverte && (
        <div className="border-t border-bordure bg-fond-secondaire/30 p-4 space-y-2">
          {factures.map((f) => {
            const restant = f.montant_total - f.montant_paye;
            const cfg = STATUT[f.statut];
            const Icone = cfg.icone;
            return (
              <div key={f.id} className="flex items-center justify-between gap-3 bg-white rounded-bouton border border-bordure px-3 py-2">
                <div>
                  <p className="text-xs font-mono font-semibold text-texte-principal">{f.numero}</p>
                  <p className="text-xs text-texte-secondaire">{new Date(f.date_facture).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-texte-secondaire">{formatMontant(f.montant_total)}</p>
                    <p className="text-xs font-semibold text-medical-critique">Reste : {formatMontant(restant)}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.couleur}`}>
                    <Icone size={10} /> {cfg.label}
                  </span>
                  <Button variante="primaire" icone={CreditCard} onClick={() => onPayer(f)}>
                    Payer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const VueRelances = ({ factures, onPayer, onAnnuler }) => {
  const aRelancer = factures.filter((f) => f.statut === 'en_attente' || f.statut === 'partiellement_payee');

  const parPatient = aRelancer.reduce((acc, f) => {
    const id = f.patient_id;
    if (!acc[id]) acc[id] = { patient: f.patient, factures: [] };
    acc[id].factures.push(f);
    return acc;
  }, {});

  const groupes = Object.values(parPatient).sort((a, b) => {
    const restantA = a.factures.reduce((s, f) => s + (f.montant_total - f.montant_paye), 0);
    const restantB = b.factures.reduce((s, f) => s + (f.montant_total - f.montant_paye), 0);
    return restantB - restantA;
  });

  const totalRestant = aRelancer.reduce((s, f) => s + (f.montant_total - f.montant_paye), 0);

  if (groupes.length === 0) {
    return (
      <div className="carte text-center py-12 text-texte-secondaire">
        <CheckCircle size={32} className="mx-auto mb-3 text-zeze-vert opacity-60" />
        <p className="font-medium text-texte-principal">Aucun patient à relancer</p>
        <p className="text-sm mt-1">Toutes les factures sont soldées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-carte px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-red-600" />
          <span className="text-sm text-red-800 font-medium">
            {groupes.length} patient{groupes.length > 1 ? 's' : ''} avec impayés
          </span>
        </div>
        <span className="text-sm font-bold text-red-700">{formatMontant(totalRestant)} restants</span>
      </div>

      <div className="space-y-3">
        {groupes.map(({ patient, factures: facs }) => (
          <PatientRelance
            key={patient.id}
            patient={patient}
            factures={facs}
            onPayer={onPayer}
            onAnnuler={onAnnuler}
          />
        ))}
      </div>
    </div>
  );
};

// ── Gains ─────────────────────────────────────────────────────────────────────

const VueGains = ({ factures, parametres }) => {
  // Regroupe les factures payées par créateur
  const parCreateur = {};
  factures.forEach((f) => {
    if (f.statut === 'annulee' || !f.createur) return;
    const cId = f.createur.id;
    if (!parCreateur[cId]) parCreateur[cId] = { createur: f.createur, encaisse: 0 };
    parCreateur[cId].encaisse += f.montant_paye;
  });

  const tauxDelegue = parametres.commission_delegue ?? 15;

  // Regroupe les délégués sous leurs stockistes
  const stockistes = {};
  Object.values(parCreateur).forEach(({ createur, encaisse }) => {
    if (createur.role === 'stockiste' || createur.role === 'administrateur') {
      if (!stockistes[createur.id]) stockistes[createur.id] = { createur, encaisse: 0, delegues: [] };
      stockistes[createur.id].encaisse += encaisse;
    } else if (createur.role === 'delegue' && createur.stockiste_id) {
      const sId = createur.stockiste_id;
      if (!stockistes[sId]) {
        // Stockiste sans ventes directes — on crée un groupe vide
        stockistes[sId] = { createur: null, encaisse: 0, delegues: [] };
      }
      const tauxStockiste = parseFloat(createur.commission_rate) || 25;
      const gainDelegue = Math.round(encaisse * tauxDelegue / 100);
      const gainStockisteNet = Math.round(encaisse * (tauxStockiste - tauxDelegue) / 100);
      stockistes[sId].delegues.push({ createur, encaisse, gainDelegue, gainStockisteNet, tauxStockiste });
      stockistes[sId].encaisse += encaisse;
    }
  });

  const groupes = Object.values(stockistes);
  if (groupes.length === 0) {
    return <p className="text-sm text-texte-secondaire">Aucune donnée de gains disponible.</p>;
  }

  return (
    <div className="space-y-3">
      {groupes.map(({ createur, encaisse, delegues }, idx) => {
        const tauxStockiste = createur ? (parseFloat(createur.commission_rate) || 25) : 25;
        const gainDirectStockiste = Math.round(encaisse * tauxStockiste / 100);
        const gainDeleguesTotal = delegues.reduce((s, d) => s + d.gainDelegue, 0);
        const gainEncaisseDelegues = delegues.reduce((s, d) => s + d.encaisse, 0);
        const gainNetStockiste = gainDirectStockiste - gainDeleguesTotal
          + delegues.reduce((s, d) => s + d.gainStockisteNet, 0);

        return (
          <div key={createur?.id || idx} className="carte border-l-4 border-l-blue-400 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-texte-principal">
                  {createur ? `${createur.prenom} ${createur.nom}` : 'Stockiste inconnu'}
                  <span className="ml-2 text-xs text-texte-secondaire">({tauxStockiste}%)</span>
                </p>
                <p className="text-xs text-texte-secondaire">
                  {formatMontant(encaisse)} encaissés · gain net stockiste
                </p>
              </div>
              <p className="text-xl font-titres font-bold text-blue-600">
                {formatMontant(gainNetStockiste)}
              </p>
            </div>

            {delegues.length > 0 && (
              <div className="space-y-1 border-t border-bordure pt-2">
                {delegues.map((d) => (
                  <div key={d.createur.id} className="flex items-center justify-between bg-fond-secondaire rounded-bouton px-3 py-2">
                    <div>
                      <p className="text-sm text-texte-principal">
                        {d.createur.prenom} {d.createur.nom}
                        <span className="ml-1 text-xs text-texte-secondaire">(délégué · {tauxDelegue}%)</span>
                      </p>
                      <p className="text-xs text-texte-secondaire">{formatMontant(d.encaisse)} encaissés</p>
                    </div>
                    <p className="text-sm font-semibold text-orange-600">{formatMontant(d.gainDelegue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const FacturationPage = () => {
  const navigate = useNavigate();
  const [vue, setVue] = useState('factures');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [modalPaiement, setModalPaiement] = useState(null);
  const annuler = useAnnulerFacture();

  const { data: factures = [], isLoading } = useFactures(
    vue === 'factures' && filtreStatut ? { statut: filtreStatut } : {}
  );
  const { data: parametres = {} } = useParametres();
  const [gainsVisibles, setGainsVisibles] = useState(false);

  const totaux = factures.reduce(
    (acc, f) => {
      if (f.statut !== 'annulee') {
        acc.total += f.montant_total;
        acc.paye += f.montant_paye;
      }
      return acc;
    },
    { total: 0, paye: 0 }
  );

  const nbRelances = factures.filter((f) => f.statut === 'en_attente' || f.statut === 'partiellement_payee').length;

  const handleAnnuler = async (facture) => {
    if (!window.confirm(`Annuler la facture ${facture.numero} ?`)) return;
    await annuler.mutateAsync(facture.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Facturation</h1>
          <p className="text-sm text-texte-secondaire mt-1">{factures.length} facture{factures.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {vue === 'factures' && (
            <select className="champ-input sm:w-48" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUT).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex rounded-bouton overflow-hidden border border-bordure w-fit">
        <button
          onClick={() => setVue('factures')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${vue === 'factures' ? 'bg-zeze-vert text-white font-medium' : 'text-texte-secondaire hover:bg-fond-secondaire'}`}
        >
          <Receipt size={14} /> Factures
        </button>
        <button
          onClick={() => setVue('relances')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${vue === 'relances' ? 'bg-red-600 text-white font-medium' : 'text-texte-secondaire hover:bg-fond-secondaire'}`}
        >
          <Bell size={14} /> Relances
          {nbRelances > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${vue === 'relances' ? 'bg-white text-red-600' : 'bg-red-100 text-red-700'}`}>
              {nbRelances}
            </span>
          )}
        </button>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="carte text-center">
          <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Total facturé</p>
          <p className="text-xl font-titres font-bold text-texte-principal">{formatMontant(totaux.total)}</p>
        </div>
        <div className="carte text-center">
          <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Total encaissé</p>
          <p className="text-xl font-titres font-bold text-zeze-vert">{formatMontant(totaux.paye)}</p>
        </div>
        <div className="carte text-center">
          <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Restant dû</p>
          <p className={`text-xl font-titres font-bold ${totaux.total - totaux.paye > 0 ? 'text-medical-critique' : 'text-texte-secondaire'}`}>
            {formatMontant(totaux.total - totaux.paye)}
          </p>
        </div>
      </div>

      {/* Gains */}
      {totaux.paye > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setGainsVisibles((v) => !v)}
            className="flex items-center gap-2 text-sm text-zeze-vert hover:underline font-medium"
          >
            <TrendingUp size={14} />
            {gainsVisibles ? '▲ Masquer les gains' : '▼ Voir vos gains'}
          </button>
          {gainsVisibles && (
            <VueGains factures={factures} parametres={parametres} />
          )}
        </div>
      )}

      {/* Info création facture */}
      {vue === 'factures' && (
        <div className="bg-blue-50 border border-blue-200 rounded-carte px-4 py-3 flex items-start gap-2">
          <Plus size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Pour créer une facture, ouvrez le dossier d'un patient → onglet Consultations → fiche consultation → bouton <strong>Facturer</strong> à côté de l'ordonnance.
          </p>
        </div>
      )}

      {/* Contenu */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>
      ) : vue === 'relances' ? (
        <VueRelances factures={factures} onPayer={setModalPaiement} onAnnuler={handleAnnuler} />
      ) : factures.length === 0 ? (
        <div className="carte text-center py-12 text-texte-secondaire">
          <Receipt size={32} className="mx-auto mb-3 opacity-30" />
          <p>Aucune facture</p>
        </div>
      ) : (
        <div className="space-y-3">
          {factures.map((f) => (
            <LigneFacture key={f.id} facture={f} onPayer={setModalPaiement} onAnnuler={handleAnnuler} />
          ))}
        </div>
      )}

      {modalPaiement && (
        <ModalPaiement facture={modalPaiement} onFermer={() => setModalPaiement(null)} />
      )}
    </div>
  );
};

export default FacturationPage;
