# Documentation technique — ZEZEPAGNON Dossiers Patients

**Version 1.0 — Avril 2026**

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Structure du projet](#2-structure-du-projet)
3. [Modèle de données](#3-modèle-de-données)
4. [API Backend](#4-api-backend)
5. [Règles métier critiques](#5-règles-métier-critiques)
6. [Gestion des rôles et permissions](#6-gestion-des-rôles-et-permissions)
7. [Internationalisation](#7-internationalisation)
8. [Composants frontend réutilisables](#8-composants-frontend-réutilisables)
9. [Hooks personnalisés](#9-hooks-personnalisés)
10. [Tests et qualité](#10-tests-et-qualité)

---

## 1. Vue d'ensemble de l'architecture

### Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | React + Vite | 18+ |
| Routing frontend | React Router | v6 |
| État serveur | TanStack React Query | v5 |
| Formulaires | React Hook Form | v7 |
| Styles | Tailwind CSS | v3 |
| Icônes | Lucide React | — |
| HTTP client | Axios | — |
| i18n | i18next + react-i18next | — |
| Validation frontend | Zod | — |
| Backend | Node.js + Express | 20 LTS |
| ORM | Sequelize | v6 |
| Base de données | MariaDB | 10.11 |
| Authentification | JWT (access + refresh token) | — |
| Hash mots de passe | bcryptjs (coût 12) | — |
| Upload fichiers | Multer | — |
| PDF | PDFKit | — |
| OCR / extraction | Tesseract.js + pdf-parse | — |
| Logs | Winston + winston-daily-rotate-file | — |
| Conteneurisation | Docker + Docker Compose | — |
| Reverse proxy | Nginx (Alpine) | — |

### Schéma des composants

```
                        Internet
                            │
                     ┌──────▼──────┐
                     │    Nginx    │  :80 (→ HTTPS) / :443
                     │  (Alpine)   │
                     └──────┬──────┘
                   ┌────────┴────────┐
                   │                 │
            ┌──────▼──────┐  ┌───────▼──────┐
            │  Frontend   │  │   Backend    │
            │  (Nginx)    │  │  (Node.js)   │
            │  React SPA  │  │  Express API │
            │   :80       │  │   :3000      │
            └─────────────┘  └──────┬───────┘
                                    │
                             ┌──────▼──────┐
                             │   MariaDB   │
                             │   10.11     │
                             │   :3306     │
                             └─────────────┘
```

Nginx route :
- `/api/*` → backend:3000
- `/uploads/*` → backend:3000 (fichiers statiques servis par Express)
- `/*` → frontend:80 (SPA React)

### Flux de données — exemple : création d'une vente délégué

```
Délégué clique "Vendre"
    │
    ▼
useVendreStock().mutate(payload)          [React Query mutation]
    │
    ▼
api.post('/stock-delegue/vendre', payload) [Axios + JWT header auto]
    │
    ▼
Nginx → POST /api/stock-delegue/vendre
    │
    ▼
rateLimiter.limiteurGeneral (skip en dev)
    │
    ▼
authentifier() — vérifie JWT Bearer token
    │
    ▼
autoriser('delegue') — vérifie le rôle
    │
    ▼
stockDelegueController.vendre()
    ├─ Vérifie qu'un exercice est ouvert (getExerciceOuvert())
    ├─ Récupère le taux stockiste parrain (getTauxStockiste())
    ├─ Calcule gain_delegue et commission_stockiste
    ├─ INSERT MouvementDelegue (statut='en_attente', exercice_id)
    ├─ Décrémente StockDelegue.quantite
    └─ journaliser('VENTE_DELEGUE', ...)
    │
    ▼
res.json({ succes: true, data: mouvement })
    │
    ▼
React Query invalide ['stock-delegue', 'ventes-delegue']
    │
    ▼
UI rafraîchie automatiquement
```

---

## 2. Structure du projet

```
zeze_patients/
├── backend/                    # API Node.js/Express
│   ├── src/
│   │   ├── app.js              # Point d'entrée, middlewares, démarrage
│   │   ├── config/
│   │   │   ├── database.js     # Config Sequelize (dev/test/prod)
│   │   │   ├── env.js          # Lecture des variables d'environnement
│   │   │   └── logger.js       # Config Winston
│   │   ├── controllers/        # Logique métier par ressource
│   │   ├── middlewares/
│   │   │   ├── authenticate.js # Vérification JWT
│   │   │   ├── authorize.js    # Contrôle des rôles
│   │   │   ├── errorHandler.js # Gestion globale des erreurs
│   │   │   ├── rateLimiter.js  # Rate limiting (désactivé en dev)
│   │   │   └── upload.js       # Config Multer
│   │   ├── models/             # Modèles Sequelize
│   │   ├── routes/             # Définition des routes Express
│   │   └── services/
│   │       └── pdfFichesService.js  # Génération des 4 fiches PDF
│   ├── uploads/                # Fichiers uploadés (photos, examens)
│   ├── logs/                   # Logs applicatifs (Winston rotate)
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── package.json
│
├── frontend/                   # Application React/Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, Sidebar, TopBar, ProtectedRoute...
│   │   │   ├── ui/             # Button, Badge, Alert (réutilisables)
│   │   │   ├── ordonnances/    # ProduitPicker
│   │   │   └── patients/       # AllergyTagInput
│   │   ├── hooks/              # Hooks React Query par domaine
│   │   ├── locales/
│   │   │   ├── fr/translation.json
│   │   │   └── en/translation.json
│   │   ├── pages/              # Pages React par fonctionnalité
│   │   │   ├── admin/          # UsersPage, UserFormPage
│   │   │   ├── consultations/  # ConsultationFichePage, ...
│   │   │   └── patients/       # PatientFichePage, PatientFormPage, ...
│   │   ├── services/
│   │   │   └── api.js          # Instance Axios + intercepteurs JWT
│   │   ├── App.jsx             # Routeur React Router v6
│   │   └── main.jsx            # Point d'entrée Vite
│   ├── nginx.conf              # Config Nginx pour la SPA (try_files)
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── package.json
│
├── database/
│   ├── migrations/             # 27 migrations Sequelize CLI
│   └── seeds/                  # Données initiales (admin + produits)
│
├── nginx/
│   ├── nginx.conf              # Reverse proxy + SSL
│   └── certs/                  # Certificats Let's Encrypt (non commités)
│
├── scripts/
│   ├── setup-debian.sh         # Installation Docker/UFW sur Debian vierge
│   ├── first-deploy.sh         # Premier déploiement (build + migrate + seed)
│   ├── deploy.sh               # Mises à jour suivantes
│   └── renew-certs.sh          # Renouvellement Let's Encrypt (cron)
│
├── docker-compose.yml          # Environnement de développement
├── docker-compose.prod.yml     # Environnement de production
├── .env.example                # Template variables d'environnement
└── .sequelizerc                # Config chemins Sequelize CLI
```

### Conventions de nommage

| Contexte | Convention | Exemple |
|----------|------------|---------|
| Tables SQL | snake_case pluriel | `mouvements_delegue` |
| Colonnes SQL | snake_case | `date_ouverture`, `commission_rate` |
| Modèles Sequelize | PascalCase | `MouvementDelegue` |
| Fichiers backend | camelCase | `exerciceController.js` |
| Fichiers frontend | PascalCase (composants), camelCase (hooks) | `BilanExercicePage.jsx`, `useExercices.js` |
| Routes API | kebab-case | `/stock-delegue`, `/rendez-vous` |
| Clés i18n | snake_case imbriqué | `nav.tableau_de_bord` |

---

## 3. Modèle de données

### Diagramme des relations

```
User ──────────────────────────────────────────────────────────────┐
 │ (stockiste_id)                                                   │
 │◄────────────── User (délégué rattaché à un stockiste)           │
 │                                                                  │
 ├──── Patient (created_by)                                         │
 │       ├──── Consultation (medecin_id → User)                    │
 │       │       └──── Ordonnance (medecin_id → User)             │
 │       ├──── FichierPatient (uploaded_by → User)                 │
 │       ├──── AnalyseNFS (created_by → User)                      │
 │       └──── RendezVous (medecin_id, created_by → User)         │
 │                                                                  │
 ├──── StockDelegue (delegue_id → User)                            │
 │       └── Produit                                               │
 │                                                                  │
 ├──── MouvementDelegue (delegue_id → User)                        │
 │       ├── Produit (optionnel)                                    │
 │       └── Exercice                                              │
 │                                                                  │
 ├──── Facture (created_by → User)                                 │
 │       ├── Patient                                                │
 │       ├── Ordonnance (optionnel)                                 │
 │       └── Exercice (optionnel)                                  │
 │                                                                  │
 ├──── Exercice (ouvert_par, cloture_par, rouvert_par → User)      │
 │       ├──── MouvementDelegue                                    │
 │       └──── Facture                                             │
 │                                                                  │
 ├──── StockMouvement (user_id → User)                             │
 │       └── Produit                                               │
 │                                                                  │
 ├──── RefreshToken (user_id → User)                               │
 └──── AuditLog (user_id → User)
```

### Table : `users`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | UUIDV4 auto |
| `nom` | VARCHAR(100) | NOT NULL | |
| `prenom` | VARCHAR(100) | NOT NULL | |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Sert de login |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt coût 12, exclu des sérialisations |
| `role` | ENUM | NOT NULL | `administrateur`, `stockiste`, `secretaire`, `delegue` |
| `actif` | BOOLEAN | NOT NULL, défaut `true` | Soft delete |
| `telephone` | VARCHAR(20) | NULL | |
| `ville` | VARCHAR(100) | NULL | |
| `pays` | VARCHAR(100) | NULL | |
| `nom_cabinet` | VARCHAR(200) | NULL | |
| `commission_rate` | DECIMAL(5,2) | NOT NULL, défaut `30.00` | En % |
| `stockiste_id` | UUID | FK → users.id, NULL | Pour les délégués |
| `doit_changer_mdp` | BOOLEAN | NOT NULL, défaut `false` | Force reset au login |
| `derniere_connexion` | DATETIME | NULL | |
| `created_at` | DATETIME | NOT NULL | Auto |
| `updated_at` | DATETIME | NOT NULL | Auto |

### Table : `patients`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `numero_dossier` | VARCHAR(20) | NOT NULL, UNIQUE | |
| `nom` | VARCHAR(100) | NOT NULL | |
| `prenom` | VARCHAR(100) | NOT NULL | |
| `sexe` | ENUM | NOT NULL | `masculin`, `feminin`, `autre` |
| `date_naissance` | DATE | NOT NULL | |
| `telephone` | VARCHAR(20) | NOT NULL | |
| `adresse` | VARCHAR(300) | NULL | |
| `commune` | VARCHAR(100) | NULL | |
| `ville` | VARCHAR(100) | NULL | |
| `pays` | VARCHAR(100) | NULL, défaut `'Côte d'Ivoire'` | |
| `profession` | VARCHAR(150) | NULL | |
| `groupe_sanguin` | ENUM | NULL | `A+`,`A-`,`B+`,`B-`,`AB+`,`AB-`,`O+`,`O-` |
| `allergies` | JSON | NULL | Array de strings |
| `antecedents_personnels` | TEXT | NULL | |
| `antecedents_familiaux` | TEXT | NULL | |
| `contact_urgence_nom` | VARCHAR(200) | NULL | |
| `contact_urgence_telephone` | VARCHAR(20) | NULL | |
| `contact_urgence_lien` | VARCHAR(100) | NULL | |
| `numero_assurance` | VARCHAR(100) | NULL | |
| `photo_url` | VARCHAR(500) | NULL | Chemin relatif `/uploads/...` |
| `archive` | BOOLEAN | NOT NULL, défaut `false` | |
| `created_by` | UUID | FK → users.id, NULL | |

### Table : `consultations`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `patient_id` | UUID | FK → patients.id, NOT NULL | |
| `medecin_id` | UUID | FK → users.id, NOT NULL | |
| `date_consultation` | DATE | NOT NULL | |
| `motif` | VARCHAR(500) | NULL | |
| `symptomes` | TEXT | NULL | |
| `diagnostic` | TEXT | NULL | |
| `traitement_notes` | TEXT | NULL | |
| `tension_systolique` | SMALLINT UNSIGNED | NULL | mmHg |
| `tension_diastolique` | SMALLINT UNSIGNED | NULL | mmHg |
| `frequence_cardiaque` | SMALLINT UNSIGNED | NULL | bpm |
| `temperature` | DECIMAL(4,1) | NULL | °C |
| `poids` | DECIMAL(5,2) | NULL | kg |
| `taille` | SMALLINT UNSIGNED | NULL | cm |
| `saturation_o2` | TINYINT UNSIGNED | NULL | % |

### Table : `ordonnances`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `numero` | VARCHAR(20) | NOT NULL, UNIQUE | |
| `consultation_id` | UUID | FK → consultations.id, NULL | |
| `patient_id` | UUID | FK → patients.id, NOT NULL | |
| `medecin_id` | UUID | FK → users.id, NOT NULL | |
| `date_ordonnance` | DATE | NOT NULL | |
| `lignes` | JSON | NULL | `[{nom_produit, quantite, prix_unitaire, ...}]` |
| `montant_total` | INTEGER | NOT NULL, défaut 0 | FCFA |
| `statut` | ENUM | NOT NULL, défaut `'brouillon'` | `brouillon`, `validee`, `annulee` |
| `notes` | TEXT | NULL | |

### Table : `produits`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `nom` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | NULL | |
| `categorie` | ENUM | NOT NULL, défaut `'autre'` | `antibiotique`, `booster`, `specialise`, `sommeil`, `prevention`, `autre` |
| `prix_unitaire` | INTEGER | NOT NULL | FCFA |
| `quantite_stock` | INTEGER | NOT NULL, défaut 0 | |
| `seuil_alerte` | INTEGER | NULL | NULL = pas d'alerte |
| `actif` | BOOLEAN | NOT NULL, défaut `true` | |

### Table : `factures`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `numero` | VARCHAR(20) | NOT NULL, UNIQUE | |
| `patient_id` | UUID | FK → patients.id, NOT NULL | |
| `ordonnance_id` | UUID | FK → ordonnances.id, NULL | |
| `created_by` | UUID | FK → users.id, NOT NULL | |
| `exercice_id` | UUID | FK → exercices.id, NULL | Rattachée à l'exercice ouvert à la création |
| `date_facture` | DATE | NOT NULL | |
| `montant_total` | INTEGER | NOT NULL, défaut 0 | FCFA |
| `montant_paye` | INTEGER | NOT NULL, défaut 0 | FCFA |
| `mode_paiement` | ENUM | NULL | `especes`, `mobile_money`, `virement`, `cheque`, `autre` |
| `statut` | ENUM | NOT NULL, défaut `'en_attente'` | `en_attente`, `partiellement_payee`, `payee`, `annulee` |
| `lignes` | JSON | NULL | Détail des lignes |
| `notes` | TEXT | NULL | |

### Table : `exercices`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `numero` | VARCHAR(20) | NOT NULL, UNIQUE | Format `EX-YYYY-NNN` |
| `date_ouverture` | DATETIME | NOT NULL | |
| `date_cloture` | DATETIME | NULL | |
| `statut` | ENUM | NOT NULL, défaut `'ouvert'` | `ouvert`, `cloture`, `rouvert` |
| `ouvert_par` | UUID | FK → users.id, NULL | |
| `cloture_par` | UUID | FK → users.id, NULL | |
| `rouvert_par` | UUID | FK → users.id, NULL | |
| `motif_reouverture` | TEXT | NULL | Obligatoire à la réouverture |
| `bilan_snapshot` | JSON | NULL | Bilan figé lors de la clôture |

### Table : `mouvements_delegue`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `delegue_id` | UUID | FK → users.id, NOT NULL | |
| `type` | ENUM | NOT NULL | `achat`, `vente` |
| `produit_id` | UUID | FK → produits.id, NULL | |
| `lignes` | JSON | NULL | Pour les ventes multi-produits |
| `quantite` | INTEGER | NULL | |
| `montant_total` | INTEGER | NOT NULL, défaut 0 | FCFA |
| `commission_stockiste` | INTEGER | NOT NULL, défaut 0 | FCFA |
| `gain_delegue` | INTEGER | NOT NULL, défaut 0 | FCFA |
| `client_nom` | VARCHAR(200) | NULL | |
| `date_mouvement` | DATE | NOT NULL | |
| `statut` | ENUM | NOT NULL, défaut `'en_attente'` | `en_attente`, `valide`, `refuse` |
| `mode_paiement` | VARCHAR(50) | NULL | |
| `exercice_id` | UUID | FK → exercices.id, NULL | |

### Table : `stock_mouvements`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `produit_id` | UUID | FK → produits.id, NOT NULL | |
| `type` | ENUM | NOT NULL | `entree`, `sortie`, `ajustement` |
| `quantite` | INTEGER | NOT NULL | |
| `motif` | VARCHAR(200) | NULL | |
| `ordonnance_id` | UUID | FK → ordonnances.id, NULL | |
| `user_id` | UUID | FK → users.id, NOT NULL | |
| `date_livraison` | DATE | NULL | Pour les entrées |
| `stock_apres` | INTEGER | NOT NULL | Solde post-mouvement |

### Table : `stock_delegue`

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `delegue_id` | UUID | FK → users.id, NOT NULL | |
| `produit_id` | UUID | FK → produits.id, NOT NULL | |
| `quantite` | INTEGER | NOT NULL, défaut 0 | |

Contrainte d'unicité : `(delegue_id, produit_id)`.

### Table : `analyses_nfs`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | UUID PK | |
| `patient_id` | UUID FK | |
| `consultation_id` | UUID FK NULL | |
| `created_by` | UUID FK | |
| `date_analyse` | DATE | |
| `sexe_patient` | ENUM `M`/`F` | |
| `age_patient` | INTEGER | |
| `hemoglobine`, `hematocrite`, `globules_rouges` | DECIMAL | Série rouge |
| `vgm`, `tcmh`, `ccmh`, `rdw` | DECIMAL | Indices érythrocytaires |
| `globules_blancs` | DECIMAL | |
| `neutrophiles_pct`, `neutrophiles_abs` | DECIMAL | Formule leucocytaire |
| `lymphocytes_pct`, `lymphocytes_abs` | DECIMAL | |
| `monocytes_pct`, `monocytes_abs` | DECIMAL | |
| `eosinophiles_pct`, `eosinophiles_abs` | DECIMAL | |
| `basophiles_pct`, `basophiles_abs` | DECIMAL | |
| `plaquettes` | DECIMAL | |
| `interpretations` | JSON | |
| `conclusion` | TEXT | |

### Autres tables

| Table | Rôle |
|-------|------|
| `fichiers_patient` | Fichiers joints au dossier (résultats, imagerie…) |
| `rendez_vous` | Agenda, statuts : `planifie`, `confirme`, `annule`, `honore`, `absent` |
| `parametres_cabinet` | Paires clé/valeur globales (`nom_cabinet`, `adresse`, `commission_delegue`…) |
| `refresh_tokens` | Tokens de renouvellement JWT (TTL 7 jours) |
| `audit_logs` | Trace de toutes les actions utilisateur (action, entité, IP, user_agent) |

---

## 4. API Backend

**Base URL :** `/api`

Toutes les réponses suivent le format :
```json
// Succès
{ "succes": true, "data": ..., "pagination": {...}, "message": "..." }

// Erreur
{ "succes": false, "message": "Description de l'erreur", "code": "CODE_OPTIONNEL" }
```

**Code d'erreur spécial :** `EXERCICE_REQUIS` — retourné avec HTTP 422 quand une vente ou une facture est créée sans exercice ouvert. Le frontend doit afficher un message d'action à l'utilisateur.

**Middlewares globaux (dans l'ordre) :**
1. `helmet()` — headers de sécurité HTTP
2. `cors()` — origines autorisées (FRONTEND_URL en prod, tout le réseau local en dev)
3. `compression()` — gzip
4. `express.json()` — parsing JSON (limite 10 Mo)
5. `morgan` — logs HTTP
6. `limiteurGeneral` — rate limiting (désactivé en dev via `skip`)

---

### Authentification — `/api/auth`

| Méthode | URL | Corps | Réponse | Rôles | Notes |
|---------|-----|-------|---------|-------|-------|
| POST | `/auth/login` | `{email, password}` | `{accessToken, refreshToken, user}` | Public | Rate-limited (anti-brute-force) |
| POST | `/auth/refresh` | `{refreshToken}` | `{accessToken, refreshToken}` | Public | |
| POST | `/auth/logout` | `{refreshToken}` | — | Public | Invalide le refresh token |
| GET | `/auth/me` | — | `{user}` | Tous | Profil de l'utilisateur connecté |
| PUT | `/auth/changer-mdp` | `{ancienMotDePasse, nouveauMotDePasse}` | — | Tous | |

---

### Utilisateurs — `/api/users`

| Méthode | URL | Notes | Rôles |
|---------|-----|-------|-------|
| GET | `/users` | Liste paginée. Params: `role`, `recherche`, `page`, `limite` | Admin |
| POST | `/users` | Crée un utilisateur | Admin |
| GET | `/users/:id` | Détail | Admin |
| PUT | `/users/:id` | Modifie (dont email) | Admin |
| PUT | `/users/:id/reinitialiser-mdp` | Body: `{nouveauMotDePasse}`. Force `doit_changer_mdp=true` | Admin |
| PUT | `/users/:id/reactiver` | Réactive un utilisateur désactivé | Admin |
| DELETE | `/users/:id` | Désactivation (soft) | Admin |
| DELETE | `/users/:id/supprimer` | Suppression définitive (hard). Erreur 409 si données liées | Admin |

---

### Patients — `/api/patients`

| Méthode | URL | Notes | Rôles |
|---------|-----|-------|-------|
| GET | `/patients` | Liste paginée. Params: `recherche`, `sexe`, `archive`, `page`, `limite` | Tous |
| POST | `/patients` | Création. Multipart si photo | Tous |
| GET | `/patients/:id` | Fiche complète | Tous |
| PUT | `/patients/:id` | Modification | Tous |
| DELETE | `/patients/:id` | Archive (archive=true) | Admin, Stockiste |
| POST | `/patients/:id/photo` | Upload photo (multipart) | Tous |

**Consultations :**

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/patients/:id/consultations` | Tous |
| POST | `/patients/:id/consultations` | Admin, Stockiste, Délégué |
| PUT | `/patients/:id/consultations/:cid` | Admin, Stockiste |
| DELETE | `/patients/:id/consultations/:cid` | Admin, Stockiste |

**Fichiers :**

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/patients/:id/fichiers` | Tous |
| POST | `/patients/:id/fichiers` | Tous (multipart) |
| DELETE | `/patients/:id/fichiers/:fid` | Admin, Stockiste |

**Analyses NFS :**

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/patients/:id/analyses-nfs` | Admin, Stockiste |
| POST | `/patients/:id/analyses-nfs` | Admin, Stockiste |
| POST | `/patients/:id/analyses-nfs/extraire` | Admin, Stockiste — OCR depuis PDF/image |
| PUT | `/patients/:id/analyses-nfs/:aid` | Admin, Stockiste |
| DELETE | `/patients/:id/analyses-nfs/:aid` | Admin, Stockiste |

---

### Ordonnances — `/api/ordonnances`

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/ordonnances` | Tous. Params: `recherche`, `statut`, `page` |
| GET | `/ordonnances/:id` | Tous |
| PUT | `/ordonnances/:id` | Admin, Stockiste, Délégué |
| POST | `/ordonnances/:id/valider` | Admin, Stockiste, Délégué |
| DELETE | `/ordonnances/:id` | Admin, Stockiste, Délégué |
| GET | `/ordonnances/:id/pdf` | Tous — PDF généré par PDFKit |

---

### Produits — `/api/produits`

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/produits` | Tous |
| GET | `/produits/:id` | Tous |
| POST | `/produits` | Admin, Stockiste |
| PUT | `/produits/:id` | Admin, Stockiste |

---

### Stock — `/api/stock`

| Méthode | URL | Notes | Rôles |
|---------|-----|-------|-------|
| GET | `/stock` | Liste produits avec quantité. Params: `alerte=true` | Tous |
| GET | `/stock/alertes` | Produits sous seuil | Tous |
| GET | `/stock/:pid/mouvements` | Historique des mouvements | Tous |
| POST | `/stock/:pid/mouvements` | Ajoute entrée/sortie/ajustement | Admin, Stockiste |
| PUT | `/stock/:pid/seuil` | Body: `{seuil_alerte}` | Admin, Stockiste |

---

### Stock délégué — `/api/stock-delegue`

| Méthode | URL | Notes | Rôles |
|---------|-----|-------|-------|
| GET | `/stock-delegue` | Stock personnel du délégué connecté | Délégué |
| POST | `/stock-delegue/acheter` | Demande d'achat au stockiste | Délégué |
| POST | `/stock-delegue/vendre` | Enregistre une vente. Nécessite exercice ouvert | Délégué |
| GET | `/stock-delegue/ventes` | Historique ventes du délégué | Délégué |
| GET | `/stock-delegue/stats` | Stats CA et gains du délégué | Délégué |
| GET | `/stock-delegue/gains-delegues` | Gains de tous les délégués | Admin, Stockiste |
| GET | `/stock-delegue/ventes-directes` | Ventes des délégués rattachés | Admin, Stockiste |
| GET | `/stock-delegue/ventes-en-attente` | Ventes en attente de validation | Admin, Stockiste |
| PUT | `/stock-delegue/:id/valider` | Valide une vente | Admin, Stockiste |
| PUT | `/stock-delegue/:id/refuser` | Refuse une vente | Admin, Stockiste |

---

### Factures — `/api/factures`

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/factures` | Tous |
| GET | `/factures/:id` | Tous |
| POST | `/factures/depuis-ordonnance/:oid` | Crée depuis ordonnance | Tous |
| POST | `/factures/:id/paiement` | Enregistre un paiement | Tous |
| POST | `/factures/:id/annuler` | Admin, Stockiste |

---

### Rendez-vous — `/api/rendez-vous`

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/rendez-vous` | Tous. Params: `debut`, `fin`, `patient_id` |
| POST | `/rendez-vous` | Tous |
| PUT | `/rendez-vous/:id` | Tous |
| DELETE | `/rendez-vous/:id` | Tous |

---

### Exercices — `/api/exercices`

| Méthode | URL | Notes | Rôles |
|---------|-----|-------|-------|
| GET | `/exercices` | Liste paginée | Admin, Stockiste |
| GET | `/exercices/actuel` | Exercice ouvert (CA rapide) | Admin, Stockiste |
| GET | `/exercices/:id` | Détail | Admin, Stockiste |
| GET | `/exercices/:id/bilan` | Bilan complet (snapshot si clôturé, recalcul si ouvert) | Admin, Stockiste |
| POST | `/exercices/ouvrir` | Body: `{date_ouverture?}` | Admin, Stockiste |
| POST | `/exercices/:id/cloturer` | Snapshot le bilan, ouvre automatiquement le suivant | Admin, Stockiste |
| POST | `/exercices/:id/rouvrir` | Body: `{motif}`. Admin uniquement | Admin |
| GET | `/exercices/:id/fiches/mapa.pdf` | Query: `?parrain=Nom`. PDF fiche MAPA | Admin, Stockiste |
| GET | `/exercices/:id/fiches/detail-produits.pdf` | PDF top 20 produits | Admin, Stockiste |
| GET | `/exercices/:id/fiches/recap-delegues.pdf` | PDF récap tous délégués | Admin, Stockiste |
| GET | `/exercices/:id/fiches/delegue/:did.pdf` | PDF bilan individuel. Délégué ne voit que le sien | Admin, Stockiste, Délégué |

---

### Paramètres — `/api/parametres`

| Méthode | URL | Notes | Rôles |
|---------|-----|-------|-------|
| GET | `/parametres` | Retourne `{cle: valeur, ...}` | Tous |
| PUT | `/parametres` | Body: `{cle: valeur, ...}`. Propage `commission_stockiste` aux Users actifs | Admin |
| POST | `/parametres/images-ordonnance` | Upload logo/signature (multipart) | Admin, Stockiste |
| GET | `/parametres/images-ordonnance` | URLs des images | Admin, Stockiste |

---

### Statistiques — `/api/stats`

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/stats` | Stats globales (patients, consultations, CA, top produits) | Tous |
| GET | `/stats/detaillees` | Stats par période ou par exercice | Tous |

---

### Consultations globales — `/api/consultations`

| Méthode | URL | Rôles |
|---------|-----|-------|
| GET | `/consultations` | Liste toutes consultations (pagination, recherche) | Admin, Stockiste, Délégué |

---

### Endpoint de santé

```
GET /health
→ { statut: 'ok', application, version, environnement, horodatage }
```

---

## 5. Règles métier critiques

### Cycle de vie d'un exercice

```
                    POST /ouvrir
                        │
                    [ouvert]
                        │
            POST /:id/cloturer
                        │
              bilan_snapshot sauvegardé
              + nouvel exercice auto-créé
                        │
                    [cloture]
                        │
            POST /:id/rouvrir (admin, motif obligatoire)
                        │
                    [rouvert]
                        │
            POST /:id/cloturer
                        │
                    [cloture]
```

**Contraintes :**
- Un seul exercice en statut `ouvert` ou `rouvert` à la fois
- Un exercice `cloture` ne peut être rouvert que s'il n'y a pas d'exercice `ouvert` ou `rouvert`
- La date d'ouverture du nouvel exercice auto-créé à la clôture = date de clôture du précédent

### Numérotation des exercices

```js
// Format : EX-YYYY-NNN (séquentiel par année)
const annee = new Date().getFullYear();
const prefixe = `EX-${annee}-`;
const dernier = await Exercice.findOne({ where: { numero: { [Op.like]: `${prefixe}%` } }, order: [['numero', 'DESC']] });
const seq = dernier ? parseInt(dernier.numero.split('-')[2], 10) + 1 : 1;
return `${prefixe}${String(seq).padStart(3, '0')}`;
// Exemple : EX-2026-001
```

### Rattachement vente → exercice

- **Facture** : rattachée à l'exercice ouvert au moment de sa création (`exercice_id` sur la facture)
- **Vente délégué** : rattachée à l'exercice ouvert au moment de la vente (`exercice_id` sur le mouvement)
- Si aucun exercice n'est ouvert → HTTP 422 avec `code: 'EXERCICE_REQUIS'`

### Calcul du bilan (`calculerBilan`)

**Comportement selon le statut de l'exercice :**
- `cloture` + `bilan_snapshot` présent → retourne le snapshot figé
- `ouvert` ou `rouvert` → recalcule avec les taux actuels depuis `parametres_cabinet`

**Taux utilisés :**
```
taux_delegue_actuel  = parametres_cabinet['commission_delegue'] / 100   (défaut 0.15)
taux_total_stockiste = user.commission_rate / 100                        (défaut 0.30)
```

**Pour chaque facture directe (créée par stockiste/admin) :**
```
gain_stockiste = ROUND(montant_paye × taux_total_stockiste)
part_mapa      = montant_paye − gain_stockiste
```

**Pour chaque vente délégué validée :**
- Exercice ouvert/rouvert (recalcul) :
```
gain_delegue         = ROUND(montant_total × taux_delegue_actuel)
commission_stockiste = ROUND(montant_total × (taux_total_stockiste − taux_delegue_actuel))
```
- Exercice clôturé (valeurs figées) : lecture de `gain_delegue` et `commission_stockiste` stockés

**Totaux du bilan :**
```
ca_factures_total    = SUM(factures.montant_paye)          -- toutes factures de l'exercice
ca_delegues_total    = SUM(mouvements.montant_total)        -- ventes validées de l'exercice
ca_total             = ca_factures_total + ca_delegues_total

commissions_stockistes = SUM(gain_factures + commission sur ventes délégués)
commissions_delegues   = SUM(gain_delegue)

net_mapa = ca_total − commissions_stockistes − commissions_delegues
```

**Par stockiste :**
```
ca_factures_stockiste   = SUM ventes directes du stockiste
gain_factures           = SUM gains sur ces factures
ca_delegues_stockiste   = SUM ventes des délégués rattachés (validées)
commission_delegues     = SUM commission_stockiste sur ces ventes
commission_totale       = gain_factures + commission_delegues
part_mapa_generee       = (ca_factures - gain_factures) + (ca_delegues - commission_delegues)
```

**Par délégué :**
```
nb_ventes    = COUNT ventes validées
ca           = SUM montant_total
gain_delegue = SUM gain_delegue
commission_stockiste_versee = SUM commission_stockiste
```

**Top 20 produits :**
Agrégation des lignes JSON de factures + mouvements délégués, triée par CA décroissant, limitée à 20.

### Formatage des montants dans les PDF

`Intl.NumberFormat('fr-FR')` génère un espace fine insécable (` `) qui s'affiche en `/` dans PDFKit/Helvetica. La fonction maison évite ce bug :

```js
const fmtMontant = (n) => {
  const entier = Math.round(n ?? 0);
  return entier.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
};
```

---

## 6. Gestion des rôles et permissions

### Matrice rôles × actions

| Action | Admin | Stockiste | Secrétaire | Délégué |
|--------|:-----:|:---------:|:----------:|:-------:|
| Créer/modifier un utilisateur | ✓ | — | — | — |
| Voir liste patients | ✓ | ✓ | ✓ | ✓ |
| Créer/modifier un patient | ✓ | ✓ | ✓ | ✓ |
| Archiver un patient | ✓ | ✓ | — | — |
| Ajouter une consultation | ✓ | ✓ | — | ✓ |
| Modifier/supprimer une consultation | ✓ | ✓ | — | — |
| Créer/valider une ordonnance | ✓ | ✓ | — | ✓ |
| Saisir analyses NFS | ✓ | ✓ | — | — |
| Ajouter mouvement stock central | ✓ | ✓ | — | — |
| Modifier seuil d'alerte | ✓ | ✓ | — | — |
| Acheter/vendre (stock délégué) | — | — | — | ✓ |
| Valider vente délégué | ✓ | ✓ | — | — |
| Ouvrir/clôturer un exercice | ✓ | ✓ | — | — |
| Rouvrir un exercice | ✓ | — | — | — |
| Voir bilan exercice | ✓ | ✓ | — | — |
| Télécharger fiches PDF | ✓ | ✓ | — | (son bilan) |
| Voir statistiques | ✓ | — | — | — |
| Modifier paramètres cabinet | ✓ | — | — | — |

### Middlewares de protection

```js
// authenticate.js — extrait et vérifie le JWT Bearer
const authentifier = (req, res, next) => { ... }

// authorize.js — vérifie que req.utilisateur.role est dans la liste
const autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.utilisateur.role))
    return res.status(403).json({ succes: false, message: 'Accès refusé' });
  next();
};
```

Usage dans les routes :
```js
router.post('/ouvrir', authentifier, autoriser('administrateur', 'stockiste'), asyncHandler(ouvrir));
router.post('/:id/rouvrir', authentifier, autoriser('administrateur'), asyncHandler(rouvrir));
```

---

## 7. Internationalisation

### Structure des fichiers

```
frontend/src/locales/
├── fr/
│   └── translation.json    # Français (langue par défaut)
└── en/
    └── translation.json    # Anglais
```

### Utilisation dans les composants

```jsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// Exemple d'usage
<h1>{t('nav.tableau_de_bord')}</h1>
<button>{t('commun.enregistrer')}</button>
```

### Ajouter une langue

1. Créer `frontend/src/locales/<code>/translation.json` en copiant `fr/translation.json`
2. Traduire toutes les valeurs (ne pas modifier les clés)
3. Enregistrer la nouvelle langue dans le fichier de configuration i18n (`frontend/src/i18n.js` ou similaire)
4. Ajouter l'option dans le sélecteur de langue

---

## 8. Composants frontend réutilisables

### Layout

| Composant | Fichier | Rôle |
|-----------|---------|------|
| `AppLayout` | `components/layout/AppLayout.jsx` | Wrapper principal (sidebar + topbar + zone contenu) |
| `Sidebar` | `components/layout/Sidebar.jsx` | Navigation filtrée par rôle, badge alertes stock |
| `TopBar` | `components/layout/TopBar.jsx` | Barre supérieure, menu utilisateur, déconnexion |
| `BandeauExercice` | `components/layout/BandeauExercice.jsx` | Bandeau persistant affichant l'exercice en cours |
| `ProtectedRoute` | `components/layout/ProtectedRoute.jsx` | HOC : redirige vers `/connexion` si non authentifié, vers `/` si rôle insuffisant |

### UI génériques

| Composant | Props notables | Usage |
|-----------|----------------|-------|
| `Button` | `variante` (`primaire`, `fantome`…), `icone`, `chargement` | Bouton standardisé dans tout le projet |
| `Badge` | `type`, `texte` | Label coloré (statuts, rôles) |
| `Alert` | `type` (`succes`, `erreur`, `info`, `avertissement`), `message` | Message de retour utilisateur |

### Composants métier

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `AllergyTagInput` | `components/patients/AllergyTagInput.jsx` | Saisie d'allergies avec tags (Entrée pour valider) |
| `ProduitPicker` | `components/ordonnances/ProduitPicker.jsx` | Sélecteur de produit dans les formulaires d'ordonnance |

---

## 9. Hooks personnalisés

Tous les hooks utilisent **TanStack React Query**. Ils gèrent cache, refetch et invalidation automatiquement.

| Hook | Fichier | Type | Notes |
|------|---------|------|-------|
| `usePatients(params)` | `usePatients.js` | Query | `params`: recherche, sexe, page, limite |
| `usePatient(id)` | `usePatients.js` | Query | Détail d'un patient |
| `useArchiverPatient()` | `usePatients.js` | Mutation | DELETE → archive=true |
| `useConsultations(params)` | `useConsultations.js` | Query | |
| `useOrdonnances(params)` | `useOrdonnances.js` | Query | |
| `useProduits()` | `useProduits.js` | Query | |
| `useAlertesStock(enabled)` | `useStock.js` | Query | Refetch 5 min, stale 2 min |
| `useMettreAJourSeuil()` | `useStock.js` | Mutation | PUT `/stock/:id/seuil` |
| `useRendezVous(params)` | `useRendezVous.js` | Query | |
| `useAnalysesNFS(params)` | `useAnalysesNFS.js` | Query | |
| `useFichiersPatient(params)` | `useFichiersPatient.js` | Query | |
| `useUsers(params)` | `useUsers.js` | Query | Admin uniquement |
| `useUser(id)` | `useUsers.js` | Query | |
| `useCreerUser()` | `useUsers.js` | Mutation | |
| `useModifierUser()` | `useUsers.js` | Mutation | |
| `useExercices(params)` | `useExercices.js` | Query | |
| `useExercice(id)` | `useExercices.js` | Query | |
| `useExerciceActuel()` | `useExercices.js` | Query | Refetch 2 min, stale 30 s |
| `useBilanExercice(id)` | `useExercices.js` | Query | |
| `useOuvrirExercice()` | `useExercices.js` | Mutation | |
| `useCloturerExercice()` | `useExercices.js` | Mutation | |
| `useRouvrirExercice()` | `useExercices.js` | Mutation | Body: `{motif}` |
| `useStockDelegue(params)` | `useStockDelegue.js` | Query | Stock personnel délégué |
| `useVentesDelegue(params)` | `useStockDelegue.js` | Query | |
| `useAcheterStock()` | `useStockDelegue.js` | Mutation | |
| `useVendreStock()` | `useStockDelegue.js` | Mutation | |

### Intercepteurs Axios (`services/api.js`)

L'instance Axios injecte automatiquement le JWT dans chaque requête :
```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

En cas de 401, le refresh token est utilisé silencieusement. Si le refresh échoue → déconnexion automatique et redirection vers `/connexion`. Les requêtes en attente pendant le refresh sont mises en file et rejouées après renouvellement.

---

## 10. Tests et qualité

### Tests

Aucune suite de tests automatisés n'est en place à ce jour. Les validations sont effectuées manuellement.

[À COMPLÉTER : ajouter Jest + Supertest pour le backend, Vitest + Testing Library pour le frontend]

### Linter / Formateur

[À COMPLÉTER : vérifier si ESLint et/ou Prettier sont configurés dans `package.json`]

### Migrations Sequelize

Les migrations sont le seul mécanisme d'évolution du schéma. **Ne jamais modifier directement la base de données.** Toute modification de schéma doit passer par une nouvelle migration :

```bash
# Créer une migration
cd backend
npx sequelize-cli migration:generate --name description-du-changement

# Appliquer les migrations en dev
docker compose exec backend npx sequelize-cli db:migrate

# Annuler la dernière migration
docker compose exec backend npx sequelize-cli db:migrate:undo
```

Nommage : `YYYYMMDDNNN-description-courte.js` (ex: `20260427028-add-ville-pays-to-users.js`)

### Variables d'environnement sensibles

Ne jamais commiter : `.env`, `.env.development`, `.env.production`. Ces fichiers sont dans `.gitignore`. Utiliser `.env.example` comme template.

### Route de reset développement

`POST /api/dev/reset` — disponible uniquement en `NODE_ENV=development`. Vide toutes les données de test (conserve users, produits, paramètres). Ne jamais exposer en production.
