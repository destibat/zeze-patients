import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import {
  Receipt, CreditCard, CheckCircle, Clock, AlertCircle,
  XCircle, Plus, X, ChevronDown, ChevronUp, Bell, Phone, User, TrendingUp, ShoppingBag, Check,
} from 'lucide-react';
import { useVentesDirectesDelegues, useVentesEnAttente, useValiderVente, useRefuserVente } from '../hooks/useStockDelegue';

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

const parseLignes = (raw) => {
  if (!raw) return [];
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  return Array.isArray(raw) ? raw : [];
};

const LigneFacture = ({ facture, onPayer, onAnnuler }) => {
  const [ouverte, setOuverte] = useState(false);
  const cfg = STATUT[facture.statut] || STATUT.en_attente;
  const Icone = cfg.icone;
  const restant = facture.montant_total - facture.montant_paye;
  const lignes = parseLignes(facture.lignes);

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

const LigneTotal = ({ label, montant, couleur = 'text-texte-principal', petit = false }) => (
  <div className={`flex items-center justify-between ${petit ? 'py-1' : 'py-2'}`}>
    <p className={`${petit ? 'text-xs text-texte-secondaire' : 'text-sm text-texte-principal'}`}>{label}</p>
    <p className={`font-semibold font-mono ${petit ? 'text-xs' : 'text-sm'} ${couleur}`}>{formatMontant(montant)}</p>
  </div>
);

// Vue gains simplifiée pour le revendeur — uniquement ses propres 15%
const VueGainsDelegue = ({ totalEncaisse, tauxDelegue = 15 }) => {
  if (totalEncaisse <= 0) return null;
  const gainDelegue = Math.round(totalEncaisse * tauxDelegue / 100);
  return (
    <div className="carte border-l-4 border-l-orange-400 space-y-3">
      <p className="font-semibold text-texte-principal">
        Mes gains
        <span className="ml-2 text-xs font-normal text-texte-secondaire bg-orange-50 px-1.5 py-0.5 rounded">
          {tauxDelegue}% de commission
        </span>
      </p>
      <div className="bg-fond-secondaire rounded-bouton px-3 divide-y divide-bordure">
        <LigneTotal label="Total encaissé (vos ordonnances)" montant={totalEncaisse} />
        <LigneTotal label={`Vos gains (${tauxDelegue}%)`} montant={gainDelegue} couleur="text-orange-600" />
      </div>
    </div>
  );
};

const VueGains = ({ factures, ventesDirectes = [], parametres, estAdmin }) => {
  const tauxDelegue = parametres.commission_delegue ?? 15;

  // Agréger les ventes par créateur (ordonnances)
  const parCreateur = {};
  factures.forEach((f) => {
    if (f.statut === 'annulee' || !f.createur) return;
    const cId = f.createur.id;
    if (!parCreateur[cId]) {
      parCreateur[cId] = {
        createur: f.createur,
        encaisse: 0,
        encaisseOrdonnance: 0,
        encaisseDirect: 0,
        gainDelegateDirect: 0,
        gainStockisteDirect: 0,
      };
    }
    parCreateur[cId].encaisse += f.montant_paye;
    parCreateur[cId].encaisseOrdonnance += f.montant_paye;
  });

  // Fusionner les ventes directes des revendeurs (mouvements_delegue)
  ventesDirectes.forEach(({ delegue, ventes_total, gain_delegue, commission_stockiste }) => {
    const cId = delegue.id;
    if (!parCreateur[cId]) {
      parCreateur[cId] = {
        createur: {
          id: delegue.id,
          nom: delegue.nom,
          prenom: delegue.prenom,
          role: 'delegue',
          stockiste_id: delegue.stockiste_id,
          stockiste: delegue.stockiste,
        },
        encaisse: 0,
        encaisseOrdonnance: 0,
        encaisseDirect: 0,
        gainDelegateDirect: 0,
        gainStockisteDirect: 0,
      };
    }
    parCreateur[cId].encaisse += ventes_total;
    parCreateur[cId].encaisseDirect += ventes_total;
    parCreateur[cId].gainDelegateDirect += gain_delegue;
    parCreateur[cId].gainStockisteDirect += commission_stockiste;
  });

  // Regrouper revendeurs sous leurs stockistes
  const stockistes = {};
  Object.values(parCreateur).forEach(({ createur, encaisse, encaisseOrdonnance, encaisseDirect, gainDelegateDirect, gainStockisteDirect }) => {
    if (createur.role === 'stockiste' || createur.role === 'administrateur') {
      if (!stockistes[createur.id]) stockistes[createur.id] = { createur, venteDirecte: 0, delegues: [] };
      stockistes[createur.id].venteDirecte += encaisse;
    } else if (createur.role === 'delegue' && createur.stockiste_id) {
      const sId = createur.stockiste_id;
      const stockisteInfo = createur.stockiste || null;
      if (!stockistes[sId]) stockistes[sId] = { createur: stockisteInfo, venteDirecte: 0, delegues: [] };
      else if (!stockistes[sId].createur && stockisteInfo) stockistes[sId].createur = stockisteInfo;
      const tauxS = parseFloat(stockisteInfo?.commission_rate) || 25;

      // Gains ordonnance calculés au %, gains directs pris depuis la BDD (déjà calculés à la vente)
      const gainDelegue = Math.round(encaisseOrdonnance * tauxDelegue / 100) + gainDelegateDirect;
      const gainStockisteNet = Math.round(encaisseOrdonnance * (tauxS - tauxDelegue) / 100) + gainStockisteDirect;
      const montantMapa = Math.round(encaisseOrdonnance * (100 - tauxS) / 100)
        + (encaisseDirect - gainDelegateDirect - gainStockisteDirect);

      stockistes[sId].delegues.push({
        createur,
        encaisse,
        encaisseOrdonnance,
        encaisseDirect,
        gainDelegue,
        gainStockisteNet,
        montantMapa,
        tauxStockiste: tauxS,
      });
    }
  });

  const groupes = Object.values(stockistes);

  if (groupes.length === 0) {
    return <p className="text-sm text-texte-secondaire italic">Aucune donnée de gains disponible.</p>;
  }

  // Totaux globaux pour l'admin
  let totalEncaisseGlobal = 0;
  let totalCommissionsGlobal = 0;
  let totalMapaGlobal = 0;

  groupes.forEach(({ createur, venteDirecte, delegues }) => {
    const taux = createur ? (parseFloat(createur.commission_rate) || 25) : 25;
    const totalStockiste = venteDirecte + delegues.reduce((s, d) => s + d.encaisse, 0);
    totalEncaisseGlobal += totalStockiste;
    totalCommissionsGlobal += Math.round(venteDirecte * taux / 100)
      + delegues.reduce((s, d) => s + d.gainDelegue + d.gainStockisteNet, 0);
    totalMapaGlobal += Math.round(venteDirecte * (100 - taux) / 100)
      + delegues.reduce((s, d) => s + d.montantMapa, 0);
  });

  return (
    <div className="space-y-4">
      {/* Résumé global — admin uniquement */}
      {estAdmin && (
        <div className="carte bg-gray-50 border-2 border-gray-200 space-y-2">
          <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide">Résumé global</p>
          <div className="divide-y divide-bordure">
            <LigneTotal label="Total encaissé (tous stockistes)" montant={totalEncaisseGlobal} couleur="text-texte-principal" />
            <LigneTotal label="Total commissions versées aux stockistes et revendeurs" montant={totalCommissionsGlobal} couleur="text-blue-600" />
            <LigneTotal label="Montant dû à MAPA ZEZEPAGNON (maison mère)" montant={totalMapaGlobal} couleur="text-zeze-vert" />
          </div>
        </div>
      )}

      {/* Détail par stockiste */}
      {groupes.map(({ createur, venteDirecte, delegues }, idx) => {
        const taux = createur ? (parseFloat(createur.commission_rate) || 25) : 25;
        const totalVenteStockiste = venteDirecte + delegues.reduce((s, d) => s + d.encaisse, 0);
        const gainDirectNet = Math.round(venteDirecte * taux / 100);
        const gainDeleguesTotal = delegues.reduce((s, d) => s + d.gainDelegue, 0);
        const gainStockisteNetDelegues = delegues.reduce((s, d) => s + d.gainStockisteNet, 0);
        const gainStockisteTotal = gainDirectNet + gainStockisteNetDelegues;
        const mapaStockiste = Math.round(venteDirecte * (100 - taux) / 100)
          + delegues.reduce((s, d) => s + d.montantMapa, 0);

        return (
          <div key={createur?.id || idx} className="carte border-l-4 border-l-blue-500 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-texte-principal">
                  {createur ? `${createur.prenom} ${createur.nom}` : 'Stockiste non identifié'}
                  <span className="ml-2 text-xs font-normal text-texte-secondaire bg-blue-50 px-1.5 py-0.5 rounded">
                    commission {taux}%
                  </span>
                </p>
                <p className="text-xs text-texte-secondaire mt-0.5">
                  Total vendu (lui + revendeurs) : {formatMontant(totalVenteStockiste)}
                </p>
              </div>
            </div>

            <div className="bg-fond-secondaire rounded-bouton px-3 divide-y divide-bordure">
              {venteDirecte > 0 && (
                <LigneTotal
                  label={`Ventes directes stockiste (${taux}%)`}
                  montant={gainDirectNet}
                  couleur="text-blue-600"
                  petit
                />
              )}
              {delegues.map((d) => (
                <div key={d.createur.id}>
                  <div className="py-1">
                    <p className="text-xs font-medium text-texte-principal">
                      Revendeur : {d.createur.prenom} {d.createur.nom}
                      <span className="ml-1 text-texte-secondaire font-normal">— {formatMontant(d.encaisse)} vendus</span>
                    </p>
                    {d.encaisseDirect > 0 && (
                      <p className="text-xs text-texte-secondaire pl-2 mt-0.5">
                        <span className="text-texte-secondaire">Ordonnances : {formatMontant(d.encaisseOrdonnance)}</span>
                        <span className="mx-1.5">·</span>
                        <span className="text-orange-600 font-medium">Ventes directes : {formatMontant(d.encaisseDirect)}</span>
                      </p>
                    )}
                    <div className="pl-3 mt-0.5 space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-texte-secondaire">Part revendeur ({tauxDelegue}%)</span>
                        <span className="font-semibold text-orange-600">{formatMontant(d.gainDelegue)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-texte-secondaire">Part stockiste ({d.tauxStockiste - tauxDelegue}%)</span>
                        <span className="font-semibold text-blue-600">{formatMontant(d.gainStockisteNet)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between py-2">
                <p className="text-xs font-semibold text-texte-principal">Gain net stockiste</p>
                <p className="text-sm font-bold text-blue-700">{formatMontant(gainStockisteTotal)}</p>
              </div>
              {delegues.length > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <p className="text-xs font-semibold text-orange-700">Total revendeurs</p>
                  <p className="text-sm font-bold text-orange-600">{formatMontant(gainDeleguesTotal)}</p>
                </div>
              )}
              {estAdmin && (
                <div className="flex items-center justify-between py-1.5">
                  <p className="text-xs font-semibold text-zeze-vert-fonce">Dû à MAPA ZEZEPAGNON</p>
                  <p className="text-sm font-bold text-zeze-vert">{formatMontant(mapaStockiste)}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MODE_PAIEMENT_DELEGUE = {
  especes:      'Espèces',
  mobile_money: 'Mobile Money',
  virement:     'Virement',
  cheque:       'Chèque',
};

// ── Vue validation ventes revendeurs ────────────────────────────────────────────
const VueValidationDelegues = () => {
  const { data: ventes = [], isLoading } = useVentesEnAttente(true);
  const valider = useValiderVente();
  const refuser = useRefuserVente();
  const [modes, setModes] = useState({});
  const [erreur, setErreur] = useState('');

  const handleValider = async (id) => {
    const mode_paiement = modes[id] || 'especes';
    setErreur('');
    try {
      await valider.mutateAsync({ id, mode_paiement });
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de la validation');
    }
  };

  const handleRefuser = async (id) => {
    if (!window.confirm('Refuser cette vente ? Le stock du revendeur sera restauré.')) return;
    setErreur('');
    try {
      await refuser.mutateAsync(id);
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors du refus');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>;
  }

  if (ventes.length === 0) {
    return (
      <div className="carte text-center py-12 text-texte-secondaire">
        <CheckCircle size={32} className="mx-auto mb-3 text-zeze-vert opacity-60" />
        <p className="font-medium text-texte-principal">Aucune vente en attente</p>
        <p className="text-sm mt-1">Toutes les ventes de vos revendeurs ont été traitées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {erreur && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-carte">{erreur}</div>}
      <p className="text-sm text-texte-secondaire">
        {ventes.length} vente{ventes.length > 1 ? 's' : ''} en attente de validation — enregistrez le mode de paiement reçu par le revendeur.
      </p>
      {ventes.map((v) => {
        const lignes = parseLignes(v.lignes);
        return (
          <div key={v.id} className="carte border-l-4 border-l-yellow-400 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-texte-principal">
                  {v.delegue?.prenom} {v.delegue?.nom}
                  <span className="ml-2 text-xs font-normal text-texte-secondaire">
                    {new Date(v.date_mouvement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </p>
                {v.client_nom && <p className="text-xs text-texte-secondaire">Client : {v.client_nom}</p>}
              </div>
              <p className="text-sm font-bold text-texte-principal font-mono">{formatMontant(v.montant_total)}</p>
            </div>

            {lignes.length > 0 && (
              <div className="bg-fond-secondaire rounded-bouton px-3 py-2 text-xs text-texte-secondaire">
                {lignes.map((l) => `${l.nom_produit} ×${l.quantite} = ${formatMontant(l.prix_unitaire * l.quantite)}`).join(' · ')}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-texte-principal mb-1">Mode de paiement reçu</label>
                <select
                  className="champ-input text-sm"
                  value={modes[v.id] || 'especes'}
                  onChange={(e) => setModes({ ...modes, [v.id]: e.target.value })}
                >
                  {Object.entries(MODE_PAIEMENT_DELEGUE).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  variante="primaire"
                  icone={Check}
                  chargement={valider.isPending}
                  onClick={() => handleValider(v.id)}
                >
                  Valider
                </Button>
                <Button
                  variante="fantome"
                  onClick={() => handleRefuser(v.id)}
                  chargement={refuser.isPending}
                >
                  Refuser
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const FacturationPage = () => {
  const { utilisateur } = useAuth();
  const estAdmin = utilisateur?.role === 'administrateur';
  const estDelegue = utilisateur?.role === 'delegue';
  const estStockisteOuAdmin = ['administrateur', 'stockiste'].includes(utilisateur?.role);
  const navigate = useNavigate();
  const [vue, setVue] = useState('factures');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [modalPaiement, setModalPaiement] = useState(null);
  const annuler = useAnnulerFacture();

  const { data: factures = [], isLoading } = useFactures(
    vue === 'factures' && filtreStatut ? { statut: filtreStatut } : {}
  );
  const { data: parametres = {} } = useParametres();
  const { data: ventesDirectes = [] } = useVentesDirectesDelegues(estStockisteOuAdmin);
  const { data: ventesAttente = [] } = useVentesEnAttente(estStockisteOuAdmin);
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

  const totalVentesDirectes = ventesDirectes.reduce((s, v) => s + v.ventes_total, 0);

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
      <div className="flex rounded-bouton overflow-hidden border border-bordure w-fit flex-wrap">
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
        {estStockisteOuAdmin && (
          <button
            onClick={() => setVue('delegues')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${vue === 'delegues' ? 'bg-yellow-500 text-white font-medium' : 'text-texte-secondaire hover:bg-fond-secondaire'}`}
          >
            <ShoppingBag size={14} /> Ventes revendeurs
            {ventesAttente.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${vue === 'delegues' ? 'bg-white text-yellow-600' : 'bg-yellow-100 text-yellow-700'}`}>
                {ventesAttente.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Résumé financier */}
      <div className={`grid grid-cols-1 gap-4 ${estStockisteOuAdmin && totalVentesDirectes > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
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
        {estStockisteOuAdmin && totalVentesDirectes > 0 && (
          <div className="carte text-center border-l-4 border-l-orange-400">
            <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Ventes directes revendeurs</p>
            <p className="text-xl font-titres font-bold text-orange-600">{formatMontant(totalVentesDirectes)}</p>
            <p className="text-xs text-texte-secondaire mt-0.5">Hors ordonnance</p>
          </div>
        )}
      </div>

      {/* Gains */}
      {(totaux.paye > 0 || totalVentesDirectes > 0) && (
        <div className="space-y-3">
          <button
            onClick={() => setGainsVisibles((v) => !v)}
            className="flex items-center gap-2 text-sm text-zeze-vert hover:underline font-medium"
          >
            <TrendingUp size={14} />
            {gainsVisibles ? '▲ Masquer les gains' : '▼ Voir vos gains'}
          </button>
          {gainsVisibles && (
            estDelegue ? (
              <VueGainsDelegue totalEncaisse={totaux.paye} tauxDelegue={parametres.commission_delegue ?? 15} />
            ) : (
              <VueGains
                factures={factures}
                ventesDirectes={ventesDirectes}
                parametres={parametres}
                estAdmin={estAdmin}
              />
            )
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
      {vue === 'delegues' ? (
        <VueValidationDelegues />
      ) : isLoading ? (
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
