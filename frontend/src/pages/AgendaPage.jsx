import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRendezVous, useCreerRendezVous, useModifierRendezVous, useSupprimerRendezVous } from '../hooks/useRendezVous';
import { usePatients } from '../hooks/usePatients';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, User,
  CheckCircle, XCircle, AlertCircle, Calendar, LayoutGrid,
  Rows3, UserCheck, UserX, Hourglass,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const debutSemaine = (date) => {
  const d = new Date(date);
  const jour = d.getDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const debutMois = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const finMois   = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const addJours = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const addMois = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  return d;
};

const memeJour = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const formatHeure = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDateCourte = (date) =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const maintenant = () => new Date();

// ── Configs ───────────────────────────────────────────────────────────────────

const STATUT_CONFIG = {
  planifie: { label: 'Planifié',  couleur: 'bg-blue-100 text-blue-800 border-blue-200',      icone: Clock      },
  confirme: { label: 'Confirmé',  couleur: 'bg-green-100 text-green-800 border-green-200',   icone: CheckCircle },
  honore:   { label: 'Présent',   couleur: 'bg-gray-100 text-gray-600 border-gray-200',      icone: CheckCircle },
  annule:   { label: 'Annulé',    couleur: 'bg-red-100 text-red-700 border-red-200',         icone: XCircle    },
  absent:   { label: 'Absent',    couleur: 'bg-orange-100 text-orange-700 border-orange-200', icone: AlertCircle },
};

const TYPE_CONFIG = {
  consultation: { label: 'Consultation', bord: 'border-l-blue-500',    puce: 'bg-blue-500'    },
  suivi:        { label: 'Suivi',        bord: 'border-l-emerald-500', puce: 'bg-emerald-500' },
  urgence:      { label: 'Urgence',      bord: 'border-l-red-500',     puce: 'bg-red-500'     },
  analyse:      { label: 'Analyse',      bord: 'border-l-amber-500',   puce: 'bg-amber-500'   },
  autre:        { label: 'Autre',        bord: 'border-l-gray-400',    puce: 'bg-gray-400'    },
};

// ── Formulaire RDV ────────────────────────────────────────────────────────────

const FormulaireRDV = ({ rdv, jourSelectionne, onFermer }) => {
  const { data: patientsData } = usePatients({ limite: 200 });
  const patients = patientsData?.data || [];
  const creer   = useCreerRendezVous();
  const modifier = useModifierRendezVous();
  const supprimer = useSupprimerRendezVous();
  const modeEdition = Boolean(rdv);

  const defaultDate = jourSelectionne
    ? `${jourSelectionne.toISOString().slice(0, 10)}T08:00`
    : new Date().toISOString().slice(0, 16);

  const [form, setForm] = useState({
    patient_id:     rdv?.patient_id    || '',
    date_heure:     rdv?.date_heure    ? new Date(rdv.date_heure).toISOString().slice(0, 16) : defaultDate,
    duree_minutes:  rdv?.duree_minutes || 30,
    motif:          rdv?.motif         || '',
    type_rdv:       rdv?.type_rdv      || 'consultation',
    statut:         rdv?.statut        || 'planifie',
    notes:          rdv?.notes         || '',
  });
  const [erreur, setErreur]   = useState('');
  const [recherche, setRecherche] = useState(
    rdv?.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : ''
  );
  const [showPatients, setShowPatients] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const patientsFiltres = useMemo(() =>
    recherche.length >= 2
      ? patients.filter((p) =>
          `${p.prenom} ${p.nom}`.toLowerCase().includes(recherche.toLowerCase())
        ).slice(0, 6)
      : [],
    [patients, recherche]
  );

  const soumettre = async () => {
    if (!form.patient_id)  { setErreur('Sélectionnez un patient');    return; }
    if (!form.motif.trim()) { setErreur('Le motif est requis');        return; }
    if (!form.date_heure)   { setErreur('La date/heure est requise'); return; }
    setErreur('');
    try {
      if (modeEdition) await modifier.mutateAsync({ id: rdv.id, ...form });
      else             await creer.mutateAsync(form);
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer ce rendez-vous ?')) return;
    await supprimer.mutateAsync(rdv.id);
    onFermer();
  };

  const en_cours = creer.isPending || modifier.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-fond-principal rounded-carte shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-bordure">
          <h2 className="font-titres font-semibold text-texte-principal">
            {modeEdition ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onFermer} className="p-1 rounded hover:bg-fond-secondaire">
            <X size={18} className="text-texte-secondaire" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {erreur && <Alert type="erreur" message={erreur} />}

          {/* Patient */}
          <div className="relative">
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Patient *</label>
            <input
              className="champ-input"
              placeholder="Rechercher un patient..."
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); set('patient_id', ''); setShowPatients(true); }}
              onFocus={() => setShowPatients(true)}
            />
            {showPatients && patientsFiltres.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-fond-principal border border-bordure rounded-bouton shadow-lg mt-1 max-h-40 overflow-y-auto">
                {patientsFiltres.map((p) => (
                  <button key={p.id} type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-fond-secondaire"
                    onClick={() => {
                      set('patient_id', p.id);
                      setRecherche(`${p.prenom} ${p.nom}`);
                      setShowPatients(false);
                    }}>
                    {p.prenom} {p.nom}
                    {p.numero_dossier && <span className="text-xs text-texte-secondaire ml-2">#{p.numero_dossier}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date + Durée */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-texte-secondaire mb-1">Date et heure *</label>
              <input type="datetime-local" className="champ-input"
                value={form.date_heure} onChange={(e) => set('date_heure', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-texte-secondaire mb-1">Durée</label>
              <select className="champ-input" value={form.duree_minutes}
                onChange={(e) => set('duree_minutes', parseInt(e.target.value))}>
                {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-texte-secondaire mb-1">Type</label>
              <select className="champ-input" value={form.type_rdv}
                onChange={(e) => set('type_rdv', e.target.value)}>
                {Object.entries(TYPE_CONFIG).map(([k, { label }]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {modeEdition && (
              <div>
                <label className="block text-xs font-medium text-texte-secondaire mb-1">Statut</label>
                <select className="champ-input" value={form.statut}
                  onChange={(e) => set('statut', e.target.value)}>
                  {Object.entries(STATUT_CONFIG).map(([k, { label }]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Motif */}
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Motif *</label>
            <input className="champ-input" placeholder="ex: Suivi diabète, Consultation initiale..."
              value={form.motif} onChange={(e) => set('motif', e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-texte-secondaire mb-1">Notes (optionnel)</label>
            <textarea rows={2} className="champ-input resize-none"
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            <Button variante="primaire" chargement={en_cours} onClick={soumettre}>
              {modeEdition ? 'Enregistrer' : 'Créer le RDV'}
            </Button>
            <Button variante="fantome" icone={X} disabled={en_cours} onClick={onFermer}>
              Annuler
            </Button>
            {modeEdition && (
              <Button variante="fantome" icone={XCircle}
                className="ml-auto text-red-600 hover:text-red-700"
                disabled={en_cours} onClick={handleSupprimer}>
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Carte RDV (mini — vue semaine/mois) ───────────────────────────────────────

const CarteRDV = ({ rdv, onClick }) => {
  const type = TYPE_CONFIG[rdv.type_rdv] || TYPE_CONFIG.consultation;
  const statut = STATUT_CONFIG[rdv.statut] || STATUT_CONFIG.planifie;
  return (
    <div
      onClick={() => onClick(rdv)}
      className={`text-xs p-1.5 rounded border-l-4 border border-bordure cursor-pointer hover:opacity-80 transition-opacity bg-fond-principal ${type.bord}`}
    >
      <p className="font-semibold text-texte-principal truncate">
        {formatHeure(rdv.date_heure)} {rdv.patient?.prenom} {rdv.patient?.nom}
      </p>
      <p className="truncate text-texte-secondaire">{rdv.motif}</p>
      <span className={`inline-block mt-0.5 px-1.5 rounded-full text-[10px] border ${statut.couleur}`}>
        {statut.label}
      </span>
    </div>
  );
};

// ── Vue Semaine ───────────────────────────────────────────────────────────────

const VueSemaine = ({ semaine, setSemaine, rdvs, onOuvrirFormulaire, jourSelectionne, setJourSelectionne }) => {
  const jours = Array.from({ length: 7 }, (_, i) => addJours(semaine, i));
  const fin = addJours(semaine, 6);
  const aujourd_hui = maintenant();

  const rdvDuJour = (jour) =>
    rdvs.filter((r) => memeJour(new Date(r.date_heure), jour))
      .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));

  return (
    <>
      {/* Navigation semaine */}
      <div className="flex items-center gap-2">
        <button onClick={() => setSemaine(addJours(semaine, -7))}
          className="p-1.5 rounded hover:bg-fond-secondaire text-texte-secondaire">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setSemaine(debutSemaine(new Date()))}
          className="px-3 py-1 text-sm font-medium text-zeze-vert hover:bg-green-50 rounded-bouton">
          Aujourd'hui
        </button>
        <button onClick={() => setSemaine(addJours(semaine, 7))}
          className="p-1.5 rounded hover:bg-fond-secondaire text-texte-secondaire">
          <ChevronRight size={18} />
        </button>
        <span className="text-sm font-medium text-texte-secondaire">
          {semaine.getDate()} — {fin.getDate()} {MOIS[fin.getMonth()]} {fin.getFullYear()}
        </span>
      </div>

      {/* Grille */}
      <div className="carte p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-bordure">
          {jours.map((jour, i) => {
            const estAujourdhui = memeJour(jour, aujourd_hui);
            const selectionne   = jourSelectionne && memeJour(jour, jourSelectionne);
            return (
              <div key={i}
                className={`p-2 text-center border-r border-bordure last:border-0 cursor-pointer hover:bg-fond-secondaire transition-colors
                  ${estAujourdhui ? 'bg-green-50' : ''}
                  ${selectionne   ? 'ring-2 ring-inset ring-zeze-vert' : ''}`}
                onClick={() => { setJourSelectionne(jour); onOuvrirFormulaire('nouveau', jour); }}>
                <p className="text-xs text-texte-secondaire">{JOURS_COURT[i]}</p>
                <p className={`text-lg font-titres font-bold ${estAujourdhui ? 'text-zeze-vert' : 'text-texte-principal'}`}>
                  {jour.getDate()}
                </p>
                <p className="text-xs text-texte-secondaire">{MOIS[jour.getMonth()].slice(0, 3)}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 divide-x divide-bordure min-h-48">
          {jours.map((jour, i) => {
            const rdvsJour = rdvDuJour(jour);
            const estAujourdhui = memeJour(jour, aujourd_hui);
            return (
              <div key={i} className={`p-1.5 space-y-1 ${estAujourdhui ? 'bg-green-50/30' : ''}`}>
                {rdvsJour.length === 0 ? (
                  <div className="h-full min-h-12 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => { setJourSelectionne(jour); onOuvrirFormulaire('nouveau', jour); }}>
                    <Plus size={14} className="text-texte-secondaire" />
                  </div>
                ) : (
                  rdvsJour.map((rdv) => (
                    <CarteRDV key={rdv.id} rdv={rdv} onClick={(r) => { setJourSelectionne(jour); onOuvrirFormulaire(r); }} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ── Vue Mois ──────────────────────────────────────────────────────────────────

const VueMois = ({ mois, setMois, rdvs, onOuvrirFormulaire, jourSelectionne, setJourSelectionne }) => {
  const aujourd_hui = maintenant();
  const premierJour = debutMois(mois);
  const grille = Array.from({ length: 42 }, (_, i) => addJours(debutSemaine(premierJour), i));

  const rdvDuJour = (jour) =>
    rdvs.filter((r) => memeJour(new Date(r.date_heure), jour))
      .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));

  return (
    <>
      {/* Navigation mois */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMois(addMois(mois, -1))}
          className="p-1.5 rounded hover:bg-fond-secondaire text-texte-secondaire">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setMois(debutMois(new Date()))}
          className="px-3 py-1 text-sm font-medium text-zeze-vert hover:bg-green-50 rounded-bouton">
          Ce mois
        </button>
        <button onClick={() => setMois(addMois(mois, 1))}
          className="p-1.5 rounded hover:bg-fond-secondaire text-texte-secondaire">
          <ChevronRight size={18} />
        </button>
        <span className="text-sm font-medium text-texte-secondaire">
          {MOIS[mois.getMonth()]} {mois.getFullYear()}
        </span>
      </div>

      <div className="carte p-0 overflow-hidden">
        {/* En-tête jours */}
        <div className="grid grid-cols-7 border-b border-bordure bg-fond-secondaire">
          {JOURS_COURT.map((j) => (
            <div key={j} className="py-2 text-center text-xs font-semibold text-texte-secondaire border-r border-bordure last:border-0">
              {j}
            </div>
          ))}
        </div>
        {/* Grille 6 semaines */}
        <div className="grid grid-cols-7">
          {grille.map((jour, i) => {
            const hors      = jour.getMonth() !== mois.getMonth();
            const estAujd   = memeJour(jour, aujourd_hui);
            const selectionne = jourSelectionne && memeJour(jour, jourSelectionne);
            const rdvsJour  = rdvDuJour(jour);
            const max       = 3;

            return (
              <div key={i}
                className={`min-h-[80px] p-1 border-r border-b border-bordure last:border-r-0 cursor-pointer
                  transition-colors hover:bg-fond-secondaire
                  ${hors       ? 'bg-fond-secondaire/50 opacity-50' : ''}
                  ${selectionne ? 'ring-2 ring-inset ring-zeze-vert' : ''}`}
                onClick={() => setJourSelectionne(jour)}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                    ${estAujd ? 'bg-zeze-vert text-white' : 'text-texte-principal'}`}>
                    {jour.getDate()}
                  </span>
                  {rdvsJour.length > 0 && (
                    <button type="button"
                      className="text-[10px] text-texte-secondaire hover:text-zeze-vert"
                      onClick={(e) => { e.stopPropagation(); onOuvrirFormulaire('nouveau', jour); }}>
                      <Plus size={11} />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {rdvsJour.slice(0, max).map((rdv) => {
                    const type = TYPE_CONFIG[rdv.type_rdv] || TYPE_CONFIG.consultation;
                    return (
                      <div key={rdv.id}
                        className={`flex items-center gap-1 text-[10px] rounded px-1 py-0.5 cursor-pointer hover:opacity-80 bg-fond-principal border border-bordure border-l-2 ${type.bord}`}
                        onClick={(e) => { e.stopPropagation(); onOuvrirFormulaire(rdv); }}>
                        <span className="font-medium text-texte-secondaire shrink-0">{formatHeure(rdv.date_heure)}</span>
                        <span className="truncate text-texte-principal">{rdv.patient?.prenom} {rdv.patient?.nom}</span>
                      </div>
                    );
                  })}
                  {rdvsJour.length > max && (
                    <p className="text-[10px] text-texte-secondaire pl-1">+{rdvsJour.length - max} autre{rdvsJour.length - max > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ── Salle d'attente ───────────────────────────────────────────────────────────

const SalleAttente = ({ rdvs }) => {
  const modifier = useModifierRendezVous();
  const navigate = useNavigate();
  const maintenant_dt = maintenant();

  const enAttente = rdvs
    .filter((r) =>
      memeJour(new Date(r.date_heure), maintenant_dt) &&
      (r.statut === 'planifie' || r.statut === 'confirme')
    )
    .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));

  if (enAttente.length === 0) return null;

  const changerStatut = (rdv, statut) =>
    modifier.mutateAsync({ id: rdv.id, statut });

  return (
    <div className="carte border-amber-200 bg-amber-50/30">
      <h2 className="text-sm font-semibold text-texte-principal mb-3 flex items-center gap-2">
        <Hourglass size={15} className="text-amber-600" />
        Salle d'attente
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
          {enAttente.length}
        </span>
      </h2>
      <div className="space-y-2">
        {enAttente.map((rdv) => {
          const type = TYPE_CONFIG[rdv.type_rdv] || TYPE_CONFIG.consultation;
          return (
            <div key={rdv.id}
              className={`flex items-center justify-between p-3 rounded-bouton bg-fond-principal border border-l-4 border-bordure ${type.bord}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-center w-12 shrink-0">
                  <p className="text-sm font-bold text-zeze-vert">{formatHeure(rdv.date_heure)}</p>
                  <p className="text-[10px] text-texte-secondaire">{rdv.duree_minutes}min</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texte-principal truncate">
                    {rdv.patient?.prenom} {rdv.patient?.nom}
                  </p>
                  <p className="text-xs text-texte-secondaire truncate">{rdv.motif}</p>
                  <span className="text-[10px] text-texte-secondaire">{type.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => navigate(`/patients/${rdv.patient_id}`)}
                  className="p-1.5 rounded text-texte-secondaire hover:text-zeze-vert hover:bg-green-50 transition-colors"
                  title="Dossier patient">
                  <User size={14} />
                </button>
                <button
                  onClick={() => changerStatut(rdv, 'honore')}
                  className="flex items-center gap-1 px-2 py-1 rounded-bouton text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  title="Marquer présent">
                  <UserCheck size={13} /> Présent
                </button>
                <button
                  onClick={() => changerStatut(rdv, 'absent')}
                  className="flex items-center gap-1 px-2 py-1 rounded-bouton text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                  title="Marquer absent">
                  <UserX size={13} /> Absent
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Liste du jour (jour sélectionné) ─────────────────────────────────────────

const ListeDuJour = ({ jour, rdvs, onEditer }) => {
  const navigate = useNavigate();
  const modifier = useModifierRendezVous();

  const rdvsJour = rdvs
    .filter((r) => memeJour(new Date(r.date_heure), jour))
    .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));

  if (rdvsJour.length === 0) return (
    <div className="carte text-center py-6">
      <Calendar size={24} className="mx-auto text-texte-secondaire/30 mb-2" />
      <p className="text-sm text-texte-secondaire">Aucun rendez-vous le {formatDateCourte(jour)}</p>
    </div>
  );

  return (
    <div className="carte">
      <h2 className="text-sm font-semibold text-texte-principal mb-3 flex items-center gap-2">
        <Calendar size={15} className="text-zeze-vert" />
        {formatDateCourte(jour)}
        <span className="text-xs font-normal text-texte-secondaire">({rdvsJour.length} RDV)</span>
      </h2>
      <div className="space-y-2">
        {rdvsJour.map((rdv) => {
          const cfg  = STATUT_CONFIG[rdv.statut] || STATUT_CONFIG.planifie;
          const type = TYPE_CONFIG[rdv.type_rdv] || TYPE_CONFIG.consultation;
          const enAttente = rdv.statut === 'planifie' || rdv.statut === 'confirme';
          return (
            <div key={rdv.id}
              className={`flex items-center justify-between p-3 rounded-bouton bg-fond-secondaire border-l-4 ${type.bord} cursor-pointer hover:bg-fond-secondaire/70`}
              onClick={() => onEditer(rdv)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-center w-12 shrink-0">
                  <p className="text-sm font-bold text-zeze-vert">{formatHeure(rdv.date_heure)}</p>
                  <p className="text-[10px] text-texte-secondaire">{rdv.duree_minutes}min</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texte-principal truncate">
                    {rdv.patient?.prenom} {rdv.patient?.nom}
                  </p>
                  <p className="text-xs text-texte-secondaire truncate">{rdv.motif}</p>
                  <span className="text-[10px] text-texte-secondaire">{type.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.couleur}`}>{cfg.label}</span>
                <button onClick={() => navigate(`/patients/${rdv.patient_id}`)}
                  className="p-1 text-texte-secondaire hover:text-zeze-vert rounded" title="Dossier patient">
                  <User size={13} />
                </button>
                {enAttente && (
                  <>
                    <button onClick={() => modifier.mutateAsync({ id: rdv.id, statut: 'honore' })}
                      className="p-1 rounded text-green-600 hover:bg-green-50" title="Marquer présent">
                      <UserCheck size={14} />
                    </button>
                    <button onClick={() => modifier.mutateAsync({ id: rdv.id, statut: 'absent' })}
                      className="p-1 rounded text-orange-600 hover:bg-orange-50" title="Marquer absent">
                      <UserX size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const AgendaPage = () => {
  const [vue, setVue]             = useState('semaine'); // 'semaine' | 'mois'
  const [semaine, setSemaine]     = useState(debutSemaine(new Date()));
  const [mois, setMois]           = useState(debutMois(new Date()));
  const [jourSelectionne, setJourSelectionne] = useState(new Date());
  const [formulaire, setFormulaire]           = useState(null); // null | 'nouveau' | rdv object
  const [jourNouveauRDV, setJourNouveauRDV]   = useState(null);

  // Calcul de la plage de dates à charger selon la vue
  const { debut, fin } = useMemo(() => {
    if (vue === 'semaine') {
      const f = addJours(semaine, 6);
      f.setHours(23, 59, 59, 999);
      return { debut: semaine.toISOString(), fin: f.toISOString() };
    } else {
      const grilleDeb = debutSemaine(debutMois(mois));
      const grilleFin = addJours(grilleDeb, 41);
      grilleFin.setHours(23, 59, 59, 999);
      return { debut: grilleDeb.toISOString(), fin: grilleFin.toISOString() };
    }
  }, [vue, semaine, mois]);

  const { data: rdvs = [] } = useRendezVous({ debut, fin });
  const aujourd_hui = maintenant();

  const onOuvrirFormulaire = (rdvOuNouveau, jour = null) => {
    setJourNouveauRDV(jour);
    setFormulaire(rdvOuNouveau);
  };

  const basculerVue = (nouvelleVue) => {
    setVue(nouvelleVue);
    if (nouvelleVue === 'mois')    setMois(debutMois(semaine));
    if (nouvelleVue === 'semaine') setSemaine(debutSemaine(mois));
  };

  // Résumé : compte par statut sur la période visible
  const resumeStatuts = Object.entries(STATUT_CONFIG).map(([statut, { label, couleur, icone: Icone }]) => {
    const n = rdvs.filter((r) => r.statut === statut).length;
    return { statut, label, couleur, Icone, n };
  }).filter(({ n }) => n > 0);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-titres font-bold text-texte-principal">Agenda</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue */}
          <div className="flex rounded-bouton border border-bordure overflow-hidden">
            <button
              onClick={() => basculerVue('semaine')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors
                ${vue === 'semaine' ? 'bg-zeze-vert text-white' : 'text-texte-secondaire hover:bg-fond-secondaire'}`}>
              <Rows3 size={13} /> Semaine
            </button>
            <button
              onClick={() => basculerVue('mois')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-bordure
                ${vue === 'mois' ? 'bg-zeze-vert text-white' : 'text-texte-secondaire hover:bg-fond-secondaire'}`}>
              <LayoutGrid size={13} /> Mois
            </button>
          </div>
          <Button variante="primaire" icone={Plus}
            onClick={() => { setJourNouveauRDV(null); setFormulaire('nouveau'); }}>
            Nouveau RDV
          </Button>
        </div>
      </div>

      {/* Légende types */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_CONFIG).map(([k, { label, puce }]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-texte-secondaire">
            <span className={`w-2.5 h-2.5 rounded-full ${puce}`} />
            {label}
          </div>
        ))}
        {resumeStatuts.length > 0 && <span className="text-bordure">|</span>}
        {resumeStatuts.map(({ statut, label, couleur, Icone, n }) => (
          <div key={statut} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${couleur}`}>
            <Icone size={11} /> {n} {label.toLowerCase()}
          </div>
        ))}
      </div>

      {/* Vue principale */}
      {vue === 'semaine' ? (
        <VueSemaine
          semaine={semaine} setSemaine={setSemaine}
          rdvs={rdvs}
          onOuvrirFormulaire={onOuvrirFormulaire}
          jourSelectionne={jourSelectionne}
          setJourSelectionne={setJourSelectionne}
        />
      ) : (
        <VueMois
          mois={mois} setMois={setMois}
          rdvs={rdvs}
          onOuvrirFormulaire={onOuvrirFormulaire}
          jourSelectionne={jourSelectionne}
          setJourSelectionne={setJourSelectionne}
        />
      )}

      {/* Salle d'attente (uniquement si aujourd'hui dans la plage visible) */}
      <SalleAttente rdvs={rdvs} />

      {/* Liste du jour sélectionné */}
      <ListeDuJour
        jour={jourSelectionne}
        rdvs={rdvs}
        onEditer={(rdv) => onOuvrirFormulaire(rdv)}
      />

      {/* Modal formulaire */}
      {formulaire && (
        <FormulaireRDV
          rdv={formulaire === 'nouveau' ? null : formulaire}
          jourSelectionne={jourNouveauRDV}
          onFermer={() => setFormulaire(null)}
        />
      )}
    </div>
  );
};

export default AgendaPage;
