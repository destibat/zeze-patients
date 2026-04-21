import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCreerOrdonnance } from '../../hooks/useConsultations';
import { telechargerPDF, useValiderOrdonnance } from '../../hooks/useOrdonnances';
import { useAuth } from '../../contexts/AuthContext';
import ProduitPicker from '../../components/ordonnances/ProduitPicker';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import api from '../../services/api';
import {
  ArrowLeft, FileText, Download, Plus, X, HeartPulse,
  Thermometer, Activity, Weight, Ruler, Droplets, Receipt, CheckCircle,
} from 'lucide-react';

const fetchConsultation = (patientId, id) =>
  api.get(`/patients/${patientId}/consultations/${id}`).then((r) => r.data);

const Constante = ({ label, valeur, unite, icone: Icone }) =>
  valeur ? (
    <div className="flex items-center gap-2">
      {Icone && <Icone size={14} className="text-zeze-vert" />}
      <div>
        <p className="text-xs text-texte-secondaire">{label}</p>
        <p className="text-sm font-semibold text-texte-principal">{valeur} <span className="font-normal text-xs">{unite}</span></p>
      </div>
    </div>
  ) : null;

const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const ConsultationFichePage = () => {
  const { id: patientId, consultationId } = useParams();
  const navigate = useNavigate();
  const { aLeRole } = useAuth();
  const peutPrescrire = aLeRole('administrateur', 'stockiste', 'delegue');

  const { data: consultation, isLoading, isError } = useQuery({
    queryKey: ['consultation', patientId, consultationId],
    queryFn: () => fetchConsultation(patientId, consultationId),
    enabled: Boolean(patientId && consultationId),
  });

  const creerOrdonnance = useCreerOrdonnance(patientId);
  const validerOrd = useValiderOrdonnance();

  const [afficherFormulaireOrd, setAfficherFormulaireOrd] = useState(false);
  const [lignes, setLignes] = useState([]);
  const [notesOrd, setNotesOrd] = useState('');
  const [erreurOrd, setErreurOrd] = useState('');
  const [telechargement, setTelechargement] = useState(null);
  const [validation, setValidation] = useState(null);
  const [facturation, setFacturation] = useState(null);

  const creerFacture = async (ord) => {
    try {
      await api.post(`/factures/depuis-ordonnance/${ord.id}`, { montant_paye: 0 });
      navigate('/facturation');
    } catch (e) {
      alert(e?.response?.data?.message || 'Erreur lors de la création de la facture');
    }
  };

  const soumettrOrdonnance = async () => {
    if (lignes.length === 0) { setErreurOrd('Ajoutez au moins un produit.'); return; }
    setErreurOrd('');
    try {
      await creerOrdonnance.mutateAsync({ consultationId, lignes, notes: notesOrd });
      setAfficherFormulaireOrd(false);
      setLignes([]);
      setNotesOrd('');
    } catch (e) {
      setErreurOrd(e?.response?.data?.message || 'Erreur lors de la création.');
    }
  };

  const handleTelechargerPDF = async (ord) => {
    setTelechargement(ord.id);
    try { await telechargerPDF(ord.id, ord.numero); }
    finally { setTelechargement(null); }
  };

  const handleValider = async (ord) => {
    if (!window.confirm(`Valider l'ordonnance ${ord.numero} ? Cette action est irréversible.`)) return;
    setValidation(ord.id);
    try { await validerOrd.mutateAsync(ord.id); }
    catch (e) { alert(e?.response?.data?.message || 'Erreur lors de la validation'); }
    finally { setValidation(null); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>;
  if (isError || !consultation) return <div className="p-6"><Alert type="erreur" message="Consultation introuvable" /></div>;

  const { patient } = consultation;
  const posologie = consultation.posologie_suggeree;

  const imc = consultation.poids && consultation.taille
    ? (consultation.poids / Math.pow(consultation.taille / 100, 2)).toFixed(1)
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/patients/${patientId}?onglet=consultations`)} className="p-2 text-texte-secondaire hover:text-zeze-vert rounded-bouton hover:bg-fond-secondaire">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-titres font-bold text-texte-principal">
            Consultation du {new Date(consultation.date_consultation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </h1>
          {patient && <p className="text-sm text-texte-secondaire">{patient.prenom} {patient.nom} — {patient.numero_dossier}</p>}
        </div>
      </div>

      {/* Motif + diagnostic */}
      <div className="carte space-y-4">
        <div>
          <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Motif</p>
          <p className="text-sm font-medium text-texte-principal">{consultation.motif}</p>
        </div>
        {consultation.symptomes && (
          <div>
            <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Symptômes</p>
            <p className="text-sm text-texte-principal whitespace-pre-wrap">{consultation.symptomes}</p>
          </div>
        )}
        {consultation.diagnostic && (
          <div>
            <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Diagnostic</p>
            <p className="text-sm text-texte-principal whitespace-pre-wrap">{consultation.diagnostic}</p>
          </div>
        )}
        {consultation.traitement_notes && (
          <div>
            <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Notes de traitement</p>
            <p className="text-sm text-texte-principal whitespace-pre-wrap">{consultation.traitement_notes}</p>
          </div>
        )}
        {consultation.medecin && (
          <p className="text-xs text-texte-secondaire">Stockiste : {consultation.medecin.prenom} {consultation.medecin.nom}</p>
        )}
      </div>

      {/* Constantes vitales */}
      {(consultation.tension_systolique || consultation.temperature || consultation.poids) && (
        <div className="carte">
          <h2 className="text-sm font-semibold text-texte-principal mb-4 flex items-center gap-2">
            <HeartPulse size={16} className="text-zeze-vert" /> Constantes vitales
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {consultation.tension_systolique && consultation.tension_diastolique && (
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-zeze-vert" />
                <div>
                  <p className="text-xs text-texte-secondaire">Tension</p>
                  <p className="text-sm font-semibold">{consultation.tension_systolique}/{consultation.tension_diastolique} <span className="font-normal text-xs">mmHg</span></p>
                </div>
              </div>
            )}
            <Constante label="Fréq. cardiaque" valeur={consultation.frequence_cardiaque} unite="bpm" icone={Activity} />
            <Constante label="Température" valeur={consultation.temperature} unite="°C" icone={Thermometer} />
            <Constante label="Poids" valeur={consultation.poids} unite="kg" icone={Weight} />
            <Constante label="Taille" valeur={consultation.taille} unite="cm" icone={Ruler} />
            <Constante label="Saturation O₂" valeur={consultation.saturation_o2} unite="%" icone={Droplets} />
            {imc && (
              <div>
                <p className="text-xs text-texte-secondaire">IMC</p>
                <p className="text-sm font-semibold">{imc}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posologie suggérée */}
      {posologie && (
        <div className="bg-green-50 border border-green-200 rounded-carte px-4 py-3">
          <p className="text-xs font-semibold text-zeze-vert-fonce mb-1">Posologie recommandée — {posologie.libelle}</p>
          <p className="text-sm text-texte-principal">{posologie.instructions}</p>
        </div>
      )}

      {/* Ordonnances */}
      <div className="carte space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
            <FileText size={16} className="text-zeze-vert" /> Ordonnances
          </h2>
          {peutPrescrire && !afficherFormulaireOrd && (
            <Button variante="secondaire" icone={Plus} onClick={() => setAfficherFormulaireOrd(true)}>
              Nouvelle ordonnance
            </Button>
          )}
        </div>

        {/* Formulaire nouvelle ordonnance */}
        {afficherFormulaireOrd && (
          <div className="border border-zeze-vert/30 rounded-carte p-4 space-y-4 bg-fond-secondaire">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-texte-principal">Nouvelle ordonnance</p>
              <button type="button" onClick={() => { setAfficherFormulaireOrd(false); setLignes([]); }} className="text-texte-secondaire hover:text-medical-critique">
                <X size={16} />
              </button>
            </div>

            {erreurOrd && <Alert type="erreur" message={erreurOrd} />}

            <ProduitPicker lignes={lignes} onChange={setLignes} posologie={posologie} />

            <div>
              <label className="block text-sm font-medium text-texte-principal mb-1">Notes</label>
              <textarea
                rows={2}
                className="champ-input resize-none"
                placeholder="Instructions supplémentaires..."
                value={notesOrd}
                onChange={(e) => setNotesOrd(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variante="primaire" chargement={creerOrdonnance.isPending} onClick={soumettrOrdonnance}>
                Créer l'ordonnance
              </Button>
              <Button variante="fantome" onClick={() => { setAfficherFormulaireOrd(false); setLignes([]); }}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Liste ordonnances existantes */}
        {consultation.ordonnances?.length === 0 && !afficherFormulaireOrd && (
          <p className="text-sm text-texte-secondaire italic text-center py-4">Aucune ordonnance pour cette consultation</p>
        )}
        {consultation.ordonnances?.map((ord) => (
          <div key={ord.id} className="flex items-center justify-between px-3 py-2 bg-fond-secondaire rounded-bouton">
            <div>
              <p className="text-sm font-mono font-semibold text-zeze-vert">{ord.numero}</p>
              <p className="text-xs text-texte-secondaire">
                {ord.statut === 'validee' ? 'Validée' : ord.statut === 'annulee' ? 'Annulée' : 'Brouillon'}
                {ord.montant_total > 0 && ` · ${formatMontant(ord.montant_total)}`}
              </p>
            </div>
            <div className="flex gap-2">
              {peutPrescrire && ord.statut === 'brouillon' && (
                <Button
                  variante="secondaire"
                  icone={CheckCircle}
                  chargement={validation === ord.id}
                  onClick={() => handleValider(ord)}
                >
                  Valider
                </Button>
              )}
              <Button
                variante="secondaire"
                icone={Download}
                chargement={telechargement === ord.id}
                onClick={() => handleTelechargerPDF(ord)}
              >
                PDF
              </Button>
              {ord.montant_total > 0 && ord.statut !== 'annulee' && (
                <Button
                  variante="secondaire"
                  icone={Receipt}
                  onClick={() => creerFacture(ord)}
                >
                  Facturer
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsultationFichePage;
