import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatient } from '../../hooks/usePatients';
import { useConsultations, useSupprimerConsultation } from '../../hooks/useConsultations';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { ArrowLeft, Pencil, User, HeartPulse, Phone, Stethoscope, Plus, Trash2, FileText, FolderOpen, FlaskConical, Pill, Activity, Clock } from 'lucide-react';

const FREQUENCES_SUIVI_LABEL = {
  mensuel:     'Mensuel',
  trimestriel: 'Trimestriel',
  semestriel:  'Semestriel',
  annuel:      'Annuel',
  libre:       'Sur besoin',
};
import SectionFichiers from './components/SectionFichiers';
import SectionAnalyseBio from './components/SectionAnalyseBio';

const Onglet = ({ actif, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      actif ? 'border-zeze-vert text-zeze-vert' : 'border-transparent text-texte-secondaire hover:text-texte-principal'
    }`}
  >
    {children}
  </button>
);

const Champ = ({ label, valeur }) => (
  <div>
    <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm text-texte-principal">{valeur || <span className="italic text-texte-secondaire">Non renseigné</span>}</p>
  </div>
);

const sexeLabel = { masculin: 'Masculin', feminin: 'Féminin', autre: 'Autre' };

const PatientFichePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { aLeRole } = useAuth();
  const [ongletActif, setOngletActif] = useState('identite');
  const { data: patient, isLoading, isError } = usePatient(id);
  const { data: consultations = [] } = useConsultations(id);
  const supprimerConsultation = useSupprimerConsultation(id);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" /></div>;
  if (isError || !patient) return <div className="p-6"><Alert type="erreur" message="Dossier patient introuvable" /></div>;

  const peutVoirMedical = aLeRole('administrateur', 'stockiste');
  const peutCreerConsultation = aLeRole('administrateur', 'stockiste', 'delegue');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/patients')} className="p-2 text-texte-secondaire hover:text-zeze-vert rounded-bouton hover:bg-fond-secondaire">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-titres font-bold text-texte-principal">
                {patient.prenom} {patient.nom}
              </h1>
              {patient.archive && <Badge couleur="rouge">Archivé</Badge>}
            </div>
            <span className="font-mono text-xs font-semibold text-zeze-vert bg-green-50 px-2 py-0.5 rounded">
              {patient.numero_dossier}
            </span>
          </div>
        </div>
        {!patient.archive && (
          <Button variante="secondaire" icone={Pencil} onClick={() => navigate(`/patients/${id}/modifier`)}>
            Modifier
          </Button>
        )}
      </div>

      {/* Photo + infos rapides */}
      <div className="carte flex flex-col sm:flex-row gap-6">
        <div className="flex-shrink-0">
          {patient.photo_url ? (
            <img src={patient.photo_url} alt="" className="w-24 h-24 rounded-carte object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-carte bg-zeze-vert-clair/20 flex items-center justify-center text-zeze-vert text-3xl font-semibold">
              {patient.prenom[0]}{patient.nom[0]}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
          <Champ label="Sexe" valeur={sexeLabel[patient.sexe]} />
          <Champ label="Âge" valeur={`${patient.age} ans`} />
          <Champ label="Date de naissance" valeur={new Date(patient.date_naissance).toLocaleDateString('fr-FR')} />
          <Champ label="Téléphone" valeur={patient.telephone} />
          <Champ label="Groupe sanguin" valeur={patient.groupe_sanguin} />
          <Champ label="Profession" valeur={patient.profession} />
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 flex gap-1">
        <Onglet actif={ongletActif === 'identite'} onClick={() => setOngletActif('identite')}>
          <span className="flex items-center gap-1.5"><User size={14} /> Identité</span>
        </Onglet>
        {peutVoirMedical && (
          <Onglet actif={ongletActif === 'medical'} onClick={() => setOngletActif('medical')}>
            <span className="flex items-center gap-1.5"><HeartPulse size={14} /> Médical</span>
          </Onglet>
        )}
        <Onglet actif={ongletActif === 'urgence'} onClick={() => setOngletActif('urgence')}>
          <span className="flex items-center gap-1.5"><Phone size={14} /> Urgence</span>
        </Onglet>
        <Onglet actif={ongletActif === 'consultations'} onClick={() => setOngletActif('consultations')}>
          <span className="flex items-center gap-1.5"><Stethoscope size={14} /> Consultations {consultations.length > 0 && <span className="ml-0.5 bg-zeze-vert text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{consultations.length}</span>}</span>
        </Onglet>
        <Onglet actif={ongletActif === 'documents'} onClick={() => setOngletActif('documents')}>
          <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Documents</span>
        </Onglet>
        {peutVoirMedical && (
          <Onglet actif={ongletActif === 'nfs'} onClick={() => setOngletActif('nfs')}>
            <span className="flex items-center gap-1.5"><FlaskConical size={14} /> Analyse NFS</span>
          </Onglet>
        )}
      </div>

      {/* Contenu onglet Identité */}
      {ongletActif === 'identite' && (
        <div className="carte grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Champ label="Adresse" valeur={patient.adresse} />
          <Champ label="Commune" valeur={patient.commune} />
          <Champ label="Ville" valeur={patient.ville} />
          <Champ label="Pays" valeur={patient.pays} />
          <Champ label="N° assurance / mutuelle" valeur={patient.numero_assurance} />
        </div>
      )}

      {/* Contenu onglet Médical */}
      {ongletActif === 'medical' && peutVoirMedical && (
        <div className="space-y-4">

          {/* Suivi médical actif */}
          {(patient.maladies_chroniques?.length > 0 || patient.traitements_en_cours?.length > 0 || patient.frequence_suivi) && (
            <div className="carte space-y-5">
              <h3 className="text-sm font-semibold text-texte-principal flex items-center gap-2">
                <Activity size={14} className="text-zeze-vert" /> Suivi médical actif
              </h3>

              {/* Fréquence de suivi */}
              {patient.frequence_suivi && (
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-texte-secondaire" />
                  <span className="text-xs text-texte-secondaire">Fréquence de suivi :</span>
                  <span className="px-2 py-0.5 bg-zeze-vert/10 text-zeze-vert text-xs font-medium rounded-full border border-zeze-vert/20">
                    {FREQUENCES_SUIVI_LABEL[patient.frequence_suivi] || patient.frequence_suivi}
                  </span>
                </div>
              )}

              {/* Maladies chroniques */}
              {patient.maladies_chroniques?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2 flex items-center gap-1">
                    <HeartPulse size={12} /> Maladies chroniques
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {patient.maladies_chroniques.map((m, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-bouton">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-texte-principal">{m.nom}</p>
                          {m.depuis && <p className="text-xs text-texte-secondaire">Depuis {m.depuis}</p>}
                          {m.notes  && <p className="text-xs italic text-texte-secondaire mt-0.5">{m.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traitements en cours */}
              {patient.traitements_en_cours?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-texte-secondaire uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Pill size={12} /> Traitements en cours
                  </p>
                  <div className="divide-y divide-bordure border border-bordure rounded-bouton overflow-hidden">
                    {patient.traitements_en_cours.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-fond-principal hover:bg-fond-secondaire">
                        <Pill size={14} className="text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-texte-principal">{t.medicament}</span>
                          {t.dosage && <span className="text-xs text-texte-secondaire ml-2">{t.dosage}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-texte-secondaire shrink-0">
                          {t.frequence && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                              {t.frequence}
                            </span>
                          )}
                          {t.depuis && <span>depuis {t.depuis}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Allergies + antécédents */}
          <div className="carte space-y-6">
            <div>
              <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-2">Allergies</p>
              {patient.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a) => (
                    <span key={a} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">{a}</span>
                  ))}
                </div>
              ) : <p className="text-sm italic text-texte-secondaire">Aucune allergie connue</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Antécédents personnels</p>
                <p className="text-sm text-texte-principal whitespace-pre-wrap">{patient.antecedents_personnels || <span className="italic text-texte-secondaire">Non renseigné</span>}</p>
              </div>
              <div>
                <p className="text-xs text-texte-secondaire uppercase tracking-wide mb-1">Antécédents familiaux</p>
                <p className="text-sm text-texte-principal whitespace-pre-wrap">{patient.antecedents_familiaux || <span className="italic text-texte-secondaire">Non renseigné</span>}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu onglet Urgence */}
      {ongletActif === 'urgence' && (
        <div className="carte grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Champ label="Nom du contact" valeur={patient.contact_urgence_nom} />
          <Champ label="Téléphone" valeur={patient.contact_urgence_telephone} />
          <Champ label="Lien de parenté" valeur={patient.contact_urgence_lien} />
        </div>
      )}

      {/* Contenu onglet Consultations */}
      {ongletActif === 'consultations' && (
        <div className="space-y-3">
          {peutCreerConsultation && !patient.archive && (
            <div className="flex justify-end">
              <Button variante="primaire" icone={Plus} onClick={() => navigate(`/patients/${id}/consultations/nouvelle`)}>
                Nouvelle consultation
              </Button>
            </div>
          )}

          {consultations.length === 0 ? (
            <div className="carte text-center py-12 text-texte-secondaire">
              <Stethoscope size={32} className="mx-auto mb-3 opacity-30" />
              <p>Aucune consultation enregistrée</p>
            </div>
          ) : (
            consultations.map((c) => (
              <div key={c.id} className="carte hover:border-zeze-vert/40 transition-colors cursor-pointer" onClick={() => navigate(`/patients/${id}/consultations/${c.id}`)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-texte-secondaire">
                        {new Date(c.date_consultation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      {c.ordonnances?.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-zeze-vert">
                          <FileText size={11} /> {c.ordonnances.length} ordonnance{c.ordonnances.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-texte-principal truncate">{c.motif}</p>
                    {c.medecin && (
                      <p className="text-xs text-texte-secondaire">{c.medecin.prenom} {c.medecin.nom}</p>
                    )}
                  </div>
                  {peutVoirMedical && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Supprimer cette consultation ?')) {
                          supprimerConsultation.mutate(c.id);
                        }
                      }}
                      className="p-1 text-texte-secondaire hover:text-medical-critique rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Onglet Documents */}
      {ongletActif === 'documents' && (
        <div className="carte">
          <SectionFichiers patientId={id} peutSupprimer={peutVoirMedical} />
        </div>
      )}

      {/* Onglet Analyses biologiques */}
      {ongletActif === 'nfs' && peutVoirMedical && (
        <SectionAnalyseBio patientId={id} patient={patient} />
      )}
    </div>
  );
};

export default PatientFichePage;
