import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRendezVous, useCreerRendezVous, useModifierRendezVous, useSupprimerRendezVous } from '../hooks/useRendezVous';
import { usePatients } from '../hooks/usePatients';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, User,
  CheckCircle, XCircle, AlertCircle, Calendar,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const debutSemaine = (date) => {
  const d = new Date(date);
  const jour = d.getDay();
  const diff = (jour === 0 ? -6 : 1 - jour);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addJours = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const memeJour = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatHeure = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const STATUT_CONFIG = {
  planifie:  { label: 'Planifié',  couleur: 'bg-blue-100 text-blue-800 border-blue-200',   icone: Clock },
  confirme:  { label: 'Confirmé',  couleur: 'bg-green-100 text-green-800 border-green-200', icone: CheckCircle },
  honore:    { label: 'Honoré',    couleur: 'bg-gray-100 text-gray-600 border-gray-200',    icone: CheckCircle },
  annule:    { label: 'Annulé',    couleur: 'bg-red-100 text-red-700 border-red-200',       icone: XCircle },
  absent:    { label: 'Absent',    couleur: 'bg-orange-100 text-orange-700 border-orange-200', icone: AlertCircle },
};

// ── Formulaire RDV ────────────────────────────────────────────────────────────

const FormulaireRDV = ({ rdv, jourSelectionne, onFermer }) => {
  const { data: patientsData } = usePatients({ limite: 200 });
  const patients = patientsData?.data || [];
  const creer = useCreerRendezVous();
  const modifier = useModifierRendezVous();
  const modeEdition = Boolean(rdv);

  const defaultDate = jourSelectionne
    ? new Date(jourSelectionne).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const [form, setForm] = useState({
    patient_id: rdv?.patient_id || '',
    date_heure: rdv ? new Date(rdv.date_heure).toISOString().slice(0, 16) : defaultDate,
    duree_minutes: rdv?.duree_minutes || 30,
    motif: rdv?.motif || '',
    statut: rdv?.statut || 'planifie',
    notes: rdv?.notes || '',
  });
  const [erreur, setErreur] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (!form.patient_id) { setErreur('Sélectionnez un patient'); return; }
    if (!form.motif.trim()) { setErreur('Le motif est requis'); return; }
    setErreur('');
    try {
      if (modeEdition) {
        await modifier.mutateAsync({ id: rdv.id, ...form });
      } else {
        await creer.mutateAsync(form);
      }
      onFermer();
    } catch (e) {
      setErreur(e?.response?.data?.message || 'Erreur');
    }
  };

  const en_cours = creer.isPending || modifier.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-carte shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-bordure">
          <h2 className="font-semibold text-texte-principal">
            {modeEdition ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onFermer} className="p-1 text-texte-secondaire hover:text-texte-principal">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {erreur && <Alert type="erreur" message={erreur} />}

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Patient <span className="text-medical-critique">*</span></label>
            <select className="champ-input" value={form.patient_id} onChange={(e) => set('patient_id', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.numero_dossier}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">Date et heure <span className="text-medical-critique">*</span></label>
              <input type="datetime-local" className="champ-input" value={form.date_heure} onChange={(e) => set('date_heure', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">Durée (min)</label>
              <select className="champ-input" value={form.duree_minutes} onChange={(e) => set('duree_minutes', parseInt(e.target.value))}>
                {[15, 20, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Motif <span className="text-medical-critique">*</span></label>
            <input className="champ-input" placeholder="ex: Suivi diabète, Consultation initiale..." value={form.motif} onChange={(e) => set('motif', e.target.value)} />
          </div>

          {modeEdition && (
            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">Statut</label>
              <select className="champ-input" value={form.statut} onChange={(e) => set('statut', e.target.value)}>
                {Object.entries(STATUT_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-texte-principal mb-1">Notes</label>
            <textarea rows={2} className="champ-input resize-none" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variante="primaire" chargement={en_cours} onClick={soumettre}>
              {modeEdition ? 'Enregistrer' : 'Créer le rendez-vous'}
            </Button>
            <Button variante="fantome" onClick={onFermer}>Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Carte RDV ─────────────────────────────────────────────────────────────────

const CarteRDV = ({ rdv, onClick }) => {
  const cfg = STATUT_CONFIG[rdv.statut] || STATUT_CONFIG.planifie;
  return (
    <div
      onClick={() => onClick(rdv)}
      className={`text-xs p-1.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${cfg.couleur}`}
    >
      <p className="font-semibold truncate">{formatHeure(rdv.date_heure)} — {rdv.patient?.prenom} {rdv.patient?.nom}</p>
      <p className="truncate opacity-75">{rdv.motif}</p>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const AgendaPage = () => {
  const navigate = useNavigate();
  const [semaine, setSemaine] = useState(debutSemaine(new Date()));
  const [formulaire, setFormulaire] = useState(null); // null | 'nouveau' | rdv object
  const [jourNouveauRDV, setJourNouveauRDV] = useState(null);
  const supprimer = useSupprimerRendezVous();

  const fin = addJours(semaine, 6);
  fin.setHours(23, 59, 59, 999);

  const { data: rdvs = [] } = useRendezVous({
    debut: semaine.toISOString(),
    fin: fin.toISOString(),
  });

  const jours = Array.from({ length: 7 }, (_, i) => addJours(semaine, i));
  const aujourd_hui = new Date();

  const rdvDuJour = (jour) => rdvs.filter((r) => memeJour(new Date(r.date_heure), jour))
    .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));

  const handleSupprimerRDV = async (rdv) => {
    if (!window.confirm(`Supprimer le RDV de ${rdv.patient?.prenom} ${rdv.patient?.nom} ?`)) return;
    await supprimer.mutateAsync(rdv.id);
    setFormulaire(null);
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-titres font-bold text-texte-principal">Agenda</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setSemaine(addJours(semaine, -7))} className="p-1.5 rounded hover:bg-fond-secondaire text-texte-secondaire">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setSemaine(debutSemaine(new Date()))} className="px-3 py-1 text-sm font-medium text-zeze-vert hover:bg-green-50 rounded-bouton">
              Aujourd'hui
            </button>
            <button onClick={() => setSemaine(addJours(semaine, 7))} className="p-1.5 rounded hover:bg-fond-secondaire text-texte-secondaire">
              <ChevronRight size={18} />
            </button>
          </div>
          <span className="text-sm font-medium text-texte-secondaire">
            {semaine.getDate()} — {fin.getDate()} {MOIS[fin.getMonth()]} {fin.getFullYear()}
          </span>
          <Button variante="primaire" icone={Plus} onClick={() => { setJourNouveauRDV(null); setFormulaire('nouveau'); }}>
            Nouveau RDV
          </Button>
        </div>
      </div>

      {/* Résumé semaine */}
      <div className="flex gap-4 text-sm">
        {Object.entries(STATUT_CONFIG).map(([statut, { label, couleur, icone: Icone }]) => {
          const n = rdvs.filter((r) => r.statut === statut).length;
          if (n === 0) return null;
          return (
            <div key={statut} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs ${couleur}`}>
              <Icone size={12} /> {n} {label.toLowerCase()}{n > 1 ? 's' : ''}
            </div>
          );
        })}
        {rdvs.length === 0 && <p className="text-texte-secondaire text-sm">Aucun rendez-vous cette semaine</p>}
      </div>

      {/* Grille semaine */}
      <div className="carte p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-bordure">
          {jours.map((jour, i) => {
            const estAujourdhui = memeJour(jour, aujourd_hui);
            return (
              <div
                key={i}
                className={`p-2 text-center border-r border-bordure last:border-0 cursor-pointer hover:bg-fond-secondaire transition-colors ${estAujourdhui ? 'bg-green-50' : ''}`}
                onClick={() => { setJourNouveauRDV(jour); setFormulaire('nouveau'); }}
              >
                <p className="text-xs text-texte-secondaire">{JOURS[i]}</p>
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
              <div key={i} className={`p-2 space-y-1 ${estAujourdhui ? 'bg-green-50/30' : ''}`}>
                {rdvsJour.length === 0 ? (
                  <div
                    className="h-full min-h-12 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => { setJourNouveauRDV(jour); setFormulaire('nouveau'); }}
                  >
                    <Plus size={14} className="text-texte-secondaire" />
                  </div>
                ) : (
                  rdvsJour.map((rdv) => (
                    <CarteRDV key={rdv.id} rdv={rdv} onClick={setFormulaire} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste du jour */}
      {rdvDuJour(aujourd_hui).length > 0 && (
        <div className="carte">
          <h2 className="text-sm font-semibold text-texte-principal mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-zeze-vert" /> Rendez-vous aujourd'hui
          </h2>
          <div className="space-y-2">
            {rdvDuJour(aujourd_hui).map((rdv) => {
              const cfg = STATUT_CONFIG[rdv.statut];
              return (
                <div
                  key={rdv.id}
                  className="flex items-center justify-between p-3 rounded-bouton bg-fond-secondaire cursor-pointer hover:bg-fond-secondaire/70"
                  onClick={() => setFormulaire(rdv)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12">
                      <p className="text-sm font-bold text-zeze-vert">{formatHeure(rdv.date_heure)}</p>
                      <p className="text-xs text-texte-secondaire">{rdv.duree_minutes}min</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-texte-principal">{rdv.patient?.prenom} {rdv.patient?.nom}</p>
                      <p className="text-xs text-texte-secondaire">{rdv.motif}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.couleur}`}>{cfg.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/patients/${rdv.patient_id}`); }}
                      className="p-1 text-texte-secondaire hover:text-zeze-vert rounded"
                      title="Voir le dossier"
                    >
                      <User size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
