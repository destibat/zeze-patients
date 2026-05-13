# Fiche technique — ZEZEPAGNON Dossiers Patients

**Version 2.0 — Mai 2026**

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Modèle de données](#4-modèle-de-données)
5. [API Backend — endpoints](#5-api-backend--endpoints)
6. [Rôles et permissions](#6-rôles-et-permissions)
7. [Règles métier critiques](#7-règles-métier-critiques)
8. [Authentification et sécurité](#8-authentification-et-sécurité)
9. [Infrastructure et déploiement](#9-infrastructure-et-déploiement)
10. [Composants frontend clés](#10-composants-frontend-clés)

---

## 1. Architecture générale

```
Navigateur
    │
    ▼
Nginx (reverse proxy HTTPS)
    ├── /api/*  ──────▶  Backend Node.js (Express) :3000
    ├── /uploads/* ───▶  Backend Node.js (Express) :3000 (fichiers statiques)
    └── /*  ──────────▶  Frontend Nginx (React SPA) :80
                              │
                              ▼
                         MariaDB 10.11
```

L'application est une **SPA (Single Page Application)** React servie par Nginx, communiquant avec un backend Express via une API REST JSON. La base de données est MariaDB.

---

## 2. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | React | 18 |
| Build frontend | Vite | 5 |
| Routing frontend | React Router | v6 |
| État serveur | TanStack React Query | v5 |
| Formulaires | React Hook Form | v7 |
| Styles | Tailwind CSS | v3 |
| Zoom/pan images | react-zoom-pan-pinch | v3 |
| Icônes | Lucide React | — |
| HTTP client | Axios | — |
| Backend | Node.js | 20 LTS |
| Framework backend | Express | 4 |
| ORM | Sequelize | v6 |
| Base de données | MariaDB | 10.11 |
| Authentification | JWT (access + refresh token) | — |
| Hachage mot de passe | bcrypt | coût 12 |
| Génération PDF | PDFKit | — |
| OCR analyses NFS | Tesseract.js | — |
| Logging | Winston + winston-daily-rotate-file | — |
| Conteneurisation | Docker + Docker Compose | — |
| Reverse proxy | Nginx | alpine |

---

## 3. Structure du projet

```
zeze_patients/
├── backend/
│   ├── src/
│   │   ├── config/          # database.js, env.js, logger.js
│   │   ├── controllers/     # logique métier par ressource
│   │   ├── middlewares/     # authenticate.js, authorize.js, upload.js, errorHandler.js
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # Express routers
│   │   └── services/        # numeroDossierService.js, pdfFichesService.js
│   ├── Dockerfile.prod
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # composants réutilisables (ui/, patients/)
│   │   ├── contexts/        # AuthContext
│   │   ├── hooks/           # hooks React Query par domaine
│   │   ├── pages/           # pages par route
│   │   └── services/        # clients Axios par domaine
│   ├── Dockerfile.prod
│   ├── nginx.conf
│   └── package.json
├── database/
│   └── migrations/          # fichiers Sequelize CLI
├── docker-compose.alice.yml  # tenant alice
├── docker-compose.cisse.yml  # tenant cisse
├── docker-compose.prod.yml   # tenant patients (patients.zezepagnon.solutions)
└── docker-compose.dev.yml    # environnement dev
```

---

## 4. Modèle de données

### Entités principales

| Modèle | Table | Description |
|--------|-------|-------------|
| `User` | `users` | Comptes utilisateurs (admin, stockiste, délégué, secrétaire) |
| `Patient` | `patients` | Dossiers patients |
| `Consultation` | `consultations` | Consultations médicales |
| `Ordonnance` | `ordonnances` | Prescriptions (liées ou non à une consultation) |
| `AnalyseNFS` | `analyses_nfs` | Résultats biologiques NFS |
| `FichierPatient` | `fichiers_patients` | Documents joints aux dossiers |
| `RendezVous` | `rendez_vous` | Agenda |
| `Produit` | `produits` | Catalogue produits |
| `StockMouvement` | `stock_mouvements` | Mouvements du stock central |
| `StockDelegue` | `stock_delegues` | Inventaire personnel des délégués |
| `MouvementDelegue` | `mouvements_delegues` | Transactions stock délégué (achats/ventes) |
| `Facture` | `factures` | Factures patients |
| `FactureAchat` | `factures_achat` | Factures d'achat (délégué → stockiste) |
| `CommandeApprovisionnement` | `commandes_approvisionnement` | Commandes de stock |
| `Exercice` | `exercices` | Périodes comptables MAPA |
| `PretEmprunt` | `prets_emprunts` | Prêts/emprunts de produits |
| `ParametreCabinet` | `parametres_cabinet` | Configuration du cabinet |
| `AuditLog` | `audit_logs` | Journal d'activité |
| `RefreshToken` | `refresh_tokens` | Tokens JWT refresh |

### Champs clés — Patient

```
id              UUID (PK)
numero_dossier  VARCHAR(20) UNIQUE — auto-généré format ZZP-YYYY-NNNNN
nom             VARCHAR(100) NOT NULL
prenom          VARCHAR(100) NOT NULL
sexe            ENUM('masculin','feminin','autre') NULL
date_naissance  DATE NULL
telephone       VARCHAR(20) NULL
allergies       LONGTEXT (JSON array sérialisé)
archive         BOOLEAN DEFAULT false
created_by      UUID FK → users.id
```

### Champs clés — Facture

```
id              UUID (PK)
patient_id      UUID FK → patients.id
ordonnance_id   UUID FK → ordonnances.id (nullable)
montant_total   DECIMAL
montant_paye    DECIMAL DEFAULT 0
statut          ENUM('en_attente','partiellement_payee','payee','annulee')
created_by      UUID FK → users.id
```

### Champs clés — MouvementDelegue

```
id              UUID (PK)
type            ENUM('achat','vente')
statut          ENUM('en_attente','partiellement_payee','valide','refuse')
montant_total   DECIMAL
montant_paye    DECIMAL DEFAULT 0
delegue_id      UUID FK → users.id
stockiste_id    UUID FK → users.id
exercice_id     UUID FK → exercices.id
```

### Champs clés — Exercice

```
id              UUID (PK)
numero          VARCHAR(20) — format EX-YYYY-NNN
statut          ENUM('ouvert','cloture')
date_debut      DATE
date_fin        DATE NULL
motif_reouverture TEXT NULL
```

---

## 5. API Backend — endpoints

### Authentification `POST /api/auth`

| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| POST | `/login` | Public | Connexion email/password → JWT |
| POST | `/refresh` | Public | Renouveler l'access token |
| POST | `/logout` | Authentifié | Invalider le refresh token |
| GET | `/me` | Authentifié | Profil de l'utilisateur connecté |
| PUT | `/changer-mdp` | Authentifié | Changer son mot de passe |

### Patients `GET /api/patients`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste paginée avec filtres |
| GET | `/recherche` | Recherche temps réel (nom, téléphone, dossier) |
| GET | `/:id` | Fiche complète |
| POST | `/` | Créer un patient |
| PUT | `/:id` | Modifier un patient |
| POST | `/:id/photo` | Uploader une photo |
| DELETE | `/:id` | Archiver (soft delete) |

### Consultations `GET /api/patients/:patientId/consultations`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste des consultations du patient |
| POST | `/` | Créer une consultation |
| GET | `/:id` | Détail d'une consultation |
| PUT | `/:id` | Modifier (admin/stockiste) |
| DELETE | `/:id` | Supprimer (admin/stockiste) |

### Ordonnances `GET /api/ordonnances`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste des ordonnances |
| POST | `/directe` | Créer une ordonnance sans consultation |
| GET | `/:id` | Détail |
| PUT | `/:id` | Modifier (brouillon seulement) |
| DELETE | `/:id` | Supprimer |
| POST | `/:id/valider` | Valider l'ordonnance |
| POST | `/:id/renouveler` | Renouveler (copie une nouvelle ordonnance directe) |
| GET | `/:id/pdf` | Générer le PDF |

### Factures `GET /api/factures`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste des factures (filtrées par rôle) |
| GET | `/creanciers` | Liste des créanciers (factures impayées/partielles) |
| GET | `/:id` | Détail |
| POST | `/depuis-ordonnance/:ordonnanceId` | Créer depuis ordonnance |
| POST | `/:id/paiement` | Enregistrer un paiement (partiel ou total) |
| POST | `/:id/annuler` | Annuler |

### Stock central `GET /api/stock`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste produits avec stock |
| GET | `/alertes` | Produits sous seuil |
| GET | `/:produitId/mouvements` | Historique mouvements |
| POST | `/:produitId/mouvements` | Enregistrer un mouvement |
| PUT | `/:produitId/seuil` | Modifier le seuil d'alerte |

### Stock délégué `GET /api/stock-delegue`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Mon stock (délégué) |
| POST | `/acheter` | Demande d'achat au stockiste |
| POST | `/vendre` | Vente directe à un patient |
| GET | `/ventes` | Mes ventes |
| GET | `/gains-delegues` | Gains de tous les délégués (admin/stockiste) |
| GET | `/mon-bilan` | Mon bilan délégué |
| PUT | `/:id/valider` | Valider une vente (stockiste) |
| PUT | `/:id/paiement` | Enregistrer un paiement |
| PUT | `/:id/refuser` | Refuser une vente (stockiste) |

### Exercices `GET /api/exercices`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/actuel` | Exercice ouvert en cours |
| GET | `/` | Liste de tous les exercices |
| GET | `/:id` | Détail |
| GET | `/:id/bilan` | Bilan comptable complet |
| POST | `/ouvrir` | Ouvrir un exercice |
| POST | `/:id/cloturer` | Clôturer |
| POST | `/:id/rouvrir` | Rouvrir (admin) |

### PDF Fiches `GET /api/exercices/:id/fiches`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/mapa.pdf` | Fiche MAPA globale |
| GET | `/detail-produits.pdf` | Top 20 produits |
| GET | `/recap-delegues.pdf` | Synthèse délégués |
| GET | `/stockiste/:stockisteId.pdf` | Bilan individuel stockiste |
| GET | `/delegue/:delegueId.pdf` | Bilan individuel délégué |

### Statistiques `GET /api/stats`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | KPIs dashboard (CA mois, exercice, patients, consultations) |
| GET | `/detaillees` | Stats complètes par période |

---

## 6. Rôles et permissions

### Middleware `authorize.js`

| Middleware | Rôles autorisés |
|-----------|----------------|
| `seulementAdmin` | administrateur |
| `adminOuMedecin` | administrateur, stockiste |
| `adminMedecinOuDelegue` | administrateur, stockiste, délégué |
| `tousLesRoles` | tous (authentifié) |

### Matrice d'accès par module

| Module | Admin | Stockiste | Délégué | Secrétaire |
|--------|-------|-----------|---------|------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Patients (lecture) | ✅ | ✅ | ✅ (ses patients) | ✅ |
| Patients (création/modif) | ✅ | ✅ | ✅ | ✅ |
| Patients (archivage) | ✅ | ✅ | ❌ | ❌ |
| Consultations | ✅ | ✅ | ✅ | ❌ |
| Analyses NFS | ✅ | ✅ | ❌ | ❌ |
| Visualiseur fichiers | ✅ | ✅ | ❌ | ❌ |
| Ordonnances | ✅ | ✅ | ✅ | ❌ |
| Rendez-vous | ✅ | ✅ | ✅ | ✅ |
| Facturation | ✅ | ✅ | ✅ | ✅ |
| Stock central | ✅ (écriture) | ✅ (écriture) | ❌ | ✅ (lecture) |
| Mon stock | ❌ | ❌ | ✅ | ❌ |
| Exercices | ✅ | ✅ | ❌ | ❌ |
| Mon bilan | ❌ | ❌ | ✅ | ❌ |
| Prêts & Emprunts | ✅ | ✅ | ❌ | ❌ |
| Statistiques | ✅ | ❌ | ❌ | ❌ |
| Admin Utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Paramètres | ✅ | ❌ | ❌ | ❌ |

---

## 7. Règles métier critiques

### Génération du numéro de dossier patient

Format : `ZZP-YYYY-NNNNN` (ex : `ZZP-2026-00004`)

- Séquence incrémentale par année calendaire
- Cherche le dernier numéro **tous patients confondus, y compris archivés** (`Patient.scope('avecArchives')`)
- Garantit l'unicité même si des patients archivés ont utilisé des numéros antérieurs

### Statuts des factures et impact CA

```
en_attente          → pas dans le CA, pas dans les commissions
partiellement_payee → pas dans le CA, pas dans les commissions
payee               → comptabilisé dans CA et commissions
annulee             → ignoré partout
```

Cette règle s'applique dans :
- `statsController.js` (KPIs dashboard)
- `exerciceController.js` (bilans)
- `stockDelegueController.js` (gains délégués)
- `FacturationPage.jsx` (VueGains)

### Calcul des commissions

```
Gain délégué     = CA délégué × taux_commission_delegue (défaut 15%)
Commission stockiste = CA délégué × taux_commission_stockiste (négocié)
Montant MAPA     = CA total − Σ commissions stockistes − Σ gains délégués
```

### Exercice unique ouvert

- Un seul exercice peut être en statut `ouvert` à la fois
- La clôture crée automatiquement un nouvel exercice à partir de la date de clôture
- La réouverture exige un motif et l'absence d'un autre exercice ouvert

### Ordonnance sans consultation

Depuis mai 2026, `consultation_id` est nullable sur `ordonnances`. Une ordonnance peut être créée :
- Liée à une consultation (flux classique)
- En direct sur la page Ordonnances (vente directe / renouvellement)

### Renouvellement d'ordonnance

Le renouvellement crée une **nouvelle ordonnance distincte** (en brouillon) avec les mêmes produits, quantités et prix. Le lien avec la consultation d'origine n'est pas conservé.

---

## 8. Authentification et sécurité

### Tokens JWT

| Token | Durée | Stockage frontend |
|-------|-------|-------------------|
| Access token | 15 minutes | Mémoire (état React) |
| Refresh token | 7 jours | HttpOnly cookie |

Le refresh token est renouvelé automatiquement via un intercepteur Axios avant expiration.

### Rate limiting

- Endpoints `/api/auth/*` : limités en production pour prévenir le brute force
- Endpoint global : `RATE_LIMIT_MAX=500` requêtes par fenêtre en dev/staging

### Audit log

Chaque action critique (création patient, consultation, ordonnance…) est tracée dans `audit_logs` avec l'ID utilisateur, l'IP, le user-agent et l'horodatage.

### Uploads

- Les fichiers uploadés sont servis en statique via `/uploads/` (Express `static`)
- Aucune authentification requise pour les URLs `/uploads/*` (accès direct par URL)
- Stockage dans un volume Docker nommé (`uploads_alice`, `uploads_cisse`, `uploads_data`)

---

## 9. Infrastructure et déploiement

### Environnements

| Environnement | Domaine | Compose file | Env file | Images Docker |
|---|---|---|---|---|
| Dev (serveur) | dev.zezepagnon.solutions | docker-compose.dev.yml | .env.dev | dev-backend, dev-frontend |
| Alice (prod) | alice.zezepagnon.solutions | docker-compose.alice.yml | .env.alice | zezepagnon-backend, zezepagnon-frontend |
| Cisse (prod) | cisse.zezepagnon.solutions | docker-compose.cisse.yml | .env.cisse | zezepagnon-backend, zezepagnon-frontend |
| Patients (prod) | patients.zezepagnon.solutions | docker-compose.prod.yml | .env | patients-backend, patients-frontend |

**Note importante :** alice et cisse partagent les mêmes images Docker (`zezepagnon-backend`, `zezepagnon-frontend`). La stack `patients` utilise des images séparées (`patients-backend`, `patients-frontend`) générées automatiquement par Docker Compose depuis le `name: patients`.

### Déploiement production complet

```bash
# 1. Push vers GitHub
git push origin main

# 2. Sur le serveur
ssh utils@212.129.48.6 "
  cd /var/www/zezepagnon &&
  sudo git pull &&
  # Build alice (images partagées alice+cisse)
  sudo docker compose -f docker-compose.alice.yml --env-file .env.alice build --no-cache &&
  sudo docker compose -f docker-compose.alice.yml --env-file .env.alice up -d &&
  sudo docker compose -f docker-compose.cisse.yml --env-file .env.cisse up -d &&
  # Build patients (images séparées)
  sudo docker compose -f docker-compose.prod.yml --env-file .env build --no-cache &&
  sudo docker compose -f docker-compose.prod.yml --env-file .env up -d
"

# 3. Migrations (si nouveaux fichiers dans database/migrations/)
ssh utils@212.129.48.6 "
  sudo docker exec alice_backend npx sequelize-cli db:migrate &&
  sudo docker exec cisse_backend npx sequelize-cli db:migrate &&
  sudo docker exec zezepagnon_backend npx sequelize-cli db:migrate
"
```

**Toujours utiliser `--no-cache`** : sans ça, la couche `RUN npm run build` de Vite peut rester en cache Docker même si les fichiers source ont changé → ancienne version JS servie.

### Containers en production

```
zeze_nginx            # Nginx reverse proxy (partagé entre tous les tenants)
alice_backend         # API + uploads pour alice
alice_frontend        # React SPA pour alice
alice_db              # MariaDB pour alice (zezepagnon_alice)
cisse_backend         # API + uploads pour cisse
cisse_frontend        # React SPA pour cisse
cisse_db              # MariaDB pour cisse (zezepagnon_cisse)
zezepagnon_backend    # API + uploads pour patients
zezepagnon_frontend   # React SPA pour patients
zezepagnon_db         # MariaDB pour patients (zezepagnon_prod)
dev_backend           # API + uploads pour dev
dev_frontend          # React SPA pour dev
dev_db                # MariaDB pour dev (zezepagnon_dev)
```

---

## 10. Composants frontend clés

### Visualiseur de fichiers (`Visualiseur.jsx`)

Overlay plein écran pour consulter les fichiers patients sans téléchargement.

- **PDF** : rendu via `<iframe>` natif (lecteur du navigateur)
- **Images** : `TransformWrapper` / `TransformComponent` de `react-zoom-pan-pinch` — zoom scroll, pan glissé, rotation
- **ErrorBoundary** : classe React isolant les erreurs de rendu pour éviter le crash de l'app
- Hauteurs explicites via `calc(100vh - 44px)` (flex-1 non compatible avec les libs tierces)
- Fullscreen via l'API `requestFullscreen()`

### Génération de numéro de dossier (`numeroDossierService.js`)

```js
Patient.scope('avecArchives').findOne({
  where: { numero_dossier: { [Op.like]: `ZZP-${annee}-%` } },
  order: [['numero_dossier', 'DESC']],
});
```

Le scope `avecArchives` est indispensable : sans lui, le `defaultScope` (`archive = false`) exclut les patients archivés, pouvant générer un doublon si le dernier numéro appartient à un patient archivé.

### Hooks React Query

Chaque domaine dispose de ses propres hooks (`usePatients.js`, `useFichiersPatient.js`, `useFactures.js`, etc.) encapsulant `useQuery` et `useMutation` avec invalidation de cache ciblée (`queryClient.invalidateQueries`).

### ErrorHandler Express (`errorHandler.js`)

```js
if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
  return res.status(422).json({ succes: false, message: 'Données invalides', details: [...] });
}
```

Le message `Données invalides` visible dans l'interface provient toujours d'une erreur Sequelize (contrainte de validation ou d'unicité en base de données).

---

*Fiche technique ZEZEPAGNON Dossiers Patients — Version 2.0 — Mai 2026*
