# Plateforme d'analyse biologique IA multi-paramètres

**État** : exploration enrichie (octobre 2026), non implémenté
**Priorité** : moyenne, à faire après stabilisation production
**Ampleur** : module complet, plusieurs semaines de développement

---

## 1. Vision

Transformer le simple bouton "Analyse NFS" actuel en une 
**plateforme d'analyse biologique assistée par IA**, capable de :

- Traiter plusieurs panels d'analyses biologiques simultanément
- Extraire automatiquement les valeurs depuis un PDF ou une image 
  (résultats de laboratoire scannés)
- Fonctionner en multi-cabinet (chaque cabinet utilise sa propre 
  clé API, configurée par son administrateur)
- Conserver un historique complet des analyses pour suivi 
  longitudinal du patient

## 2. Panels d'analyse à supporter

| Panel | Paramètres typiques |
|-------|---------------------|
| **NFS** | Hb, VGM, GR, GB, plaquettes, formule leucocytaire |
| **Bilan rénal** | Créatinine, urée, clairance, DFG estimé |
| **Bilan glycémique** | Glycémie à jeun, postprandiale, HbA1c |
| **Bilan lipidique** | Cholestérol total, LDL, HDL, triglycérides |
| **Ionogramme** | Sodium, potassium, chlore, calcium, magnésium, 
  phosphore, bicarbonates |

Le médecin coche les panels au cas par cas. Les panels peuvent être 
**combinés** (NFS + Rénal, ou Glycémie + Lipidique + NFS, etc.) pour 
permettre à l'IA de produire une **analyse intégrée** avec 
corrélations inter-panels.

## 3. Workflow utilisateur

1. Médecin ouvre la fiche patient
2. Clique "Nouvelle analyse biologique"
3. Coche les panels à analyser (UI avec checkboxes)
4. Choisit le mode de saisie :
   - **Saisie manuelle** : formulaire structuré pour les panels cochés
   - **Upload** : PDF, JPEG ou PNG du résultat de laboratoire
5. Si upload : extraction automatique des valeurs (à valider/corriger)
6. Lance l'analyse IA
7. Reçoit un rapport structuré
8. Valide ou corrige avant enregistrement final

## 4. Architecture technique

### Backend Node.js/Express

Nouveaux endpoints :
- POST /api/analyses-bio/upload — upload fichier, extraction valeurs
- POST /api/analyses-bio/analyser — analyse IA des valeurs validées
- GET /api/analyses-bio/patient/:patient_id — historique patient
- GET /api/analyses-bio/:id — détail d'une analyse
- DELETE /api/analyses-bio/:id — suppression (admin uniquement)
- GET/POST/PUT /api/admin/config-ia — gestion config IA du cabinet 
  (admin uniquement)

### Modèle de données

**Nouvelle table `analyses_biologiques`** (remplace ou étend l'actuel 
modèle `AnalyseNFS`)
- id (PK)
- patient_id (FK)
- exercice_id (FK, pour suivi temporel par exercice)
- medecin_id (FK users.id, qui a créé l'analyse)
- cabinet_id (FK ou stockiste_id selon modèle métier — pour pouvoir 
  rattacher à la bonne config IA)
- panels_demandes (JSON : ["nfs", "renal", "glycemie"])
- valeurs_brutes (JSON structuré par panel)
- source : ENUM('manuelle', 'upload_pdf', 'upload_image')
- fichier_original (chemin vers fichier uploadé, ou null)
- analyse_ia_texte (TEXT, Markdown formaté)
- analyse_ia_modele (varchar, ex: "claude-sonnet-4-6")
- tokens_consommes_input (INT)
- tokens_consommes_output (INT)
- cout_estime_usd (DECIMAL, calculé)
- valide_par_medecin (BOOLEAN, default false)
- date_validation (DATETIME, null tant que non validé)
- created_at, updated_at

**Nouvelle table `cabinets_config_ia`** (configuration par cabinet)
- id (PK)
- cabinet_id (FK, UNIQUE — un cabinet = une seule config IA)
- cle_api_chiffree (TEXT, AES-256, jamais en clair)
- modele_par_defaut (varchar, "claude-sonnet-4-6" / "claude-haiku-4-5")
- limite_quotidienne_analyses (INT, default 100)
- compteur_analyses_jour (INT, reset minuit)
- date_dernier_reset (DATE)
- budget_mensuel_usd (DECIMAL, optionnel — alerte si dépassement)
- consommation_mois_usd (DECIMAL, calculée en temps réel)
- actif (BOOLEAN, default true)
- configure_par (FK users.id, l'admin qui a configuré)
- date_derniere_modification
- created_at, updated_at

**Note structurelle** : selon votre modèle métier actuel, "cabinet" 
peut correspondre à :
- Une entité dédiée (table `cabinets`)
- L'utilisateur stockiste (chaque stockiste = un cabinet)
- Une autre logique d'organisation

À clarifier lors de l'implémentation en regardant la structure 
existante du projet.

### Sécurité des clés API

- **Chiffrement AES-256** des clés en base
- **Master key** stockée dans variable d'environnement 
  `IA_ENCRYPTION_KEY` (jamais dans le code, jamais dans Git)
- **Rotation possible** : l'admin peut changer la clé à tout moment
- **Audit log** de toutes les utilisations (qui, quand, quelle 
  analyse, quel coût)
- **Désactivation sans suppression** : flag `actif` permet de couper 
  temporairement sans perdre la config

## 5. Configuration cabinet (admin uniquement)

**Page "Paramètres → Configuration IA"** (visible admin uniquement)

### Section "Clé API du cabinet"
- Champ de saisie (mode password, masqué par défaut)
- Bouton "Tester la connexion" (valide la clé avant sauvegarde)
- Bouton "Sauvegarder" (chiffre et stocke en base)
- Bouton "Supprimer la clé" (désactive l'IA pour tout le cabinet)
- Indicateur visuel : ✅ Active / ❌ Inactive / ⚠️ Erreur

### Section "Préférences"
- Modèle par défaut : Sonnet (qualité) ou Haiku (économie)
- Limite globale d'analyses par jour pour le cabinet
- Budget mensuel maximum (alerte par email si dépassement)
- Possibilité d'autoriser/restreindre certains panels

### Section "Suivi de consommation"
- Graphique des analyses du mois en cours
- Coût total estimé du mois
- Top 5 médecins du cabinet par usage
- Top 10 patients ayant nécessité le plus d'analyses (anonymisés)
- Export CSV de l'historique pour comptabilité

### Section "Permissions par utilisateur"
- Liste des utilisateurs du cabinet
- Pour chacun : autorisation d'utiliser l'IA (ON/OFF)
- Limite quotidienne par utilisateur (peut être inférieure à la 
  limite globale du cabinet)

### Lien "Comment obtenir une clé Anthropic ?"
- Documentation pas à pas pour l'admin qui n'a jamais configuré 
  d'API Anthropic
- Lien vers console.anthropic.com
- Captures d'écran et explications

## 6. Extraction des valeurs depuis fichiers

**Approche** : laisser Claude Code décider lors de l'implémentation 
selon ce qui marche le mieux dans le contexte réel.

**Pistes à explorer** :
- Claude vision (Sonnet) directement sur images et PDF
- Tesseract OCR (gratuit, local) + post-traitement par LLM
- Approche hybride

**Décision à valider lors de l'implémentation après tests réels** sur 
des résultats de laboratoires types Côte d'Ivoire (formats variables 
selon les labos).

**Étape de validation utilisateur** : après extraction automatique, 
le médecin voit les valeurs extraites dans un formulaire pré-rempli 
et peut **corriger** avant de lancer l'analyse IA. C'est important 
car aucun OCR n'est parfait à 100%.

## 7. Anonymisation systématique

**Avant tout envoi à l'API IA, le système retire** :
- Nom, prénom du patient
- Numéro de dossier patient
- Adresse, téléphone, email
- Photo si présente
- Numéro de sécurité sociale ou équivalent

**Garde pour le contexte médical** :
- Sexe (M/F)
- Âge (calculé depuis date de naissance, pas la date elle-même)
- Antécédents médicaux pertinents (si saisis dans le dossier)
- Traitements en cours (si saisis)
- Motif de consultation actuel (si saisi)

**Implémentation** : l'anonymisation se fait **côté backend** (jamais 
côté frontend) pour garantir qu'aucune donnée nominative ne quitte 
le serveur.

**Validation** : log de chaque payload envoyé à l'IA (avec horodatage 
et user_id), pour audit. Le contenu logué doit lui-même être 
anonymisé.

## 8. Disclaimer médical (obligatoire)

À afficher systématiquement avec chaque analyse :

⚠️ **ANALYSE GÉNÉRÉE PAR INTELLIGENCE ARTIFICIELLE**

Cette analyse est fournie à titre indicatif uniquement. Elle ne 
remplace pas le jugement clinique du médecin et n'a aucune valeur 
diagnostique. Le médecin demeure seul responsable de 
l'interprétation des résultats biologiques, du diagnostic et des 
décisions thérapeutiques.

Aucune information nominative du patient n'a été transmise à 
l'intelligence artificielle. Seules les valeurs biologiques et le 
contexte médical anonymisé (sexe, âge, antécédents, traitements) 
ont été utilisés.

Validé par : [Nom du médecin] le [date] : ✓ / ✗

## 9. Coût estimé

**Par analyse simple (saisie manuelle, 1 panel)** :
- Sonnet : ~0,02 USD = 12 FCFA
- Haiku : ~0,005 USD = 3 FCFA

**Par analyse multi-panels (3 panels combinés, saisie manuelle)** :
- Sonnet : ~0,04 USD = 25 FCFA
- Haiku : ~0,01 USD = 6 FCFA

**Par analyse avec upload PDF/image** :
- Sonnet vision : ~0,08 USD = 50 FCFA
- Tesseract + Sonnet : ~0,03 USD = 18 FCFA

**Estimation pour un cabinet moyen (5 médecins actifs)** :
- 100-200 analyses/mois en moyenne
- Coût mensuel : 5 à 20 USD selon mix manuel/upload et modèle
- Très accessible

## 10. Plan d'implémentation suggéré (5 phases)

**Phase 1 — Refonte des fondations**
- Migration de `AnalyseNFS` vers `analyses_biologiques` multi-panels
- UI de saisie manuelle multi-panels avec checkboxes
- Tests sur saisie manuelle pure (sans IA)
- Migration des données existantes

**Phase 2 — Configuration cabinet (multi-tenant)**
- Table `cabinets_config_ia` avec chiffrement
- Page admin "Paramètres → Configuration IA"
- Bouton "Tester la connexion"
- Stockage chiffré et lecture sécurisée
- Master key dans variable d'environnement

**Phase 3 — IA simple (saisie manuelle)**
- Endpoint d'analyse IA depuis valeurs saisies
- Construction du prompt structuré (anonymisation côté backend)
- Récupération de la bonne clé API (selon le cabinet du médecin)
- Affichage du résultat avec disclaimer
- Validation médecin obligatoire
- Stockage en base avec consommation tokens
- Limite quotidienne par cabinet

**Phase 4 — Upload et extraction automatique**
- Upload de fichiers PDF/JPEG/PNG
- Extraction des valeurs (méthode décidée selon tests)
- Workflow validation médecin avant analyse IA
- Gestion des erreurs OCR

**Phase 5 — Optimisations et reporting**
- Cache des analyses (éviter recomputations sur mêmes données)
- Page de suivi de consommation par cabinet (admin)
- Alertes de dépassement budget par email
- Export PDF des analyses validées
- Permissions par utilisateur (autoriser/restreindre l'IA dans 
  le cabinet)

## 11. Prérequis avant implémentation

- [ ] Bugs dashboards/commissions corrigés et déployés en production
- [ ] App stable en production depuis au moins 1 mois
- [ ] Modèle "cabinet" clarifié dans le code 
      (table dédiée vs stockiste = cabinet)
- [ ] Avis juridique RGPD si déploiement en France/UE
- [ ] Politique de confidentialité du cabinet mise à jour
- [ ] Plan de test pilote avec au moins 2 médecins du cabinet 
      ZEZEPAGNON
- [ ] Budget initial pour les tests (clé API ZEZEPAGNON dédiée 
      aux tests)

## 12. Points de vigilance majeurs

1. **Qualité de l'extraction OCR variable** : tester avec différents 
   formats de résultats de labo. Les laboratoires en Côte d'Ivoire 
   ont des formats hétérogènes. Prévoir validation manuelle des 
   valeurs extraites.

2. **Coût d'analyse d'images** : Claude vision consomme beaucoup 
   plus de tokens qu'une analyse texte. Surveiller pour ne pas 
   exploser les budgets cabinet. Considérer Haiku par défaut 
   pour les uploads.

3. **Validation médecin systématique** : aucune analyse ne doit 
   être considérée comme "officielle" sans validation explicite. 
   Différencier visuellement les analyses validées (badge vert) 
   des non-validées (badge orange).

4. **Audit trail médico-légal** : qui a demandé quoi, quand, à 
   quelle IA, avec quel résultat. Indispensable en cas de problème 
   futur.

5. **Performance UX** : l'extraction d'image peut prendre 5-15 
   secondes. Loader explicite, ne pas bloquer l'interface, 
   permettre l'annulation.

6. **Sécurité des clés** : chiffrement obligatoire, jamais de clé 
   en clair dans les logs ou dans les retours API.

7. **Limite quotidienne anti-abus** : protéger contre une utilisation 
   abusive ou un bug qui ferait des centaines d'appels. Limite 
   stricte par défaut, ajustable par l'admin du cabinet jusqu'à un 
   maximum (ex: 500/jour pour le cabinet entier).

8. **Modèle de données existant** : examiner la table `AnalyseNFS` 
   actuelle et décider de la stratégie (étendre vs nouvelle table). 
   Migration des données historiques nécessaire.

9. **Notion de "cabinet"** : clarifier dans le code comment est 
   représenté un cabinet. Si chaque stockiste = un cabinet, c'est 
   simple. Sinon il peut falloir créer une table `cabinets` 
   dédiée avant d'implémenter cette fonctionnalité.

10. **Disponibilité de l'IA** : prévoir le cas où l'API Anthropic 
    est indisponible (rare mais possible). Fallback : afficher 
    un message clair, proposer de réessayer plus tard, ne pas 
    bloquer le reste de l'application.

## 13. Modèle économique potentiel

Cette fonctionnalité peut être un **levier de valeur stratégique** :

### Scénario 1 : Inclus dans l'abonnement de base
- Argument commercial fort
- Pas de barrière à l'usage
- Le cabinet paie sa propre consommation Anthropic (transparent)
- ZEZEPAGNON ne porte aucun risque financier

### Scénario 2 : Module premium
- Tarif d'abonnement plus élevé pour les cabinets qui veulent l'IA
- Justification : valeur ajoutée significative pour le diagnostic
- Permet de monétiser la complexité de développement

### Scénario 3 : ZEZEPAGNON gère les clés (avec marge)
- Le cabinet paie ZEZEPAGNON un forfait incluant les analyses IA
- ZEZEPAGNON utilise sa propre clé maître Anthropic
- Plus simple pour l'utilisateur (pas besoin de créer une clé)
- Modèle plus rentable mais nécessite gestion comptable précise
- ⚠️ Risque : dépendance commerciale d'Anthropic
- ⚠️ Risque : si un cabinet abuse, ZEZEPAGNON paie

**Recommandation initiale** : Scénario 1 ou 2 pour démarrer 
(simplicité juridique, pas de risque financier pour ZEZEPAGNON). 
Évoluer vers 3 si demande forte des utilisateurs et volonté de 
capter plus de valeur.

## 14. Référence

- Discussion détaillée : conversation Claude.ai du [date du jour]
- Version initiale (NFS seul) : conversation antérieure
- Documents liés : MANUEL.md (à mettre à jour lors de 
  l'implémentation), TECHNICAL.md (idem)
