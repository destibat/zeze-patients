# SPEC.md — Projet ZEZEPAGNON

**Application de Gestion de Dossiers Patients**
Marque : *ZEZEPAGNON — La richesse des plantes africaines au service du bien-être*
Entité : *Maître Racine d'Afrique — ZEZEPAGNON Stockiste Alexis Brevet*
Localisation : Abidjan, Côte d'Ivoire
Site web de référence : [https://zezepagnon.com/](https://zezepagnon.com/)

> 📍 **Chemins clés du projet**
> - **Développement local** : `/home/alexis/Applis/Dossiers_patients/zeze_patients`
> - **Production (serveur Debian)** : `/var/www/zezepagnon`
>
> Voir la section **10. Environnements** pour le détail complet.

---

## 1. Présentation générale

**ZEZEPAGNON Dossiers Patients** est une application web de gestion de dossiers patients destinée à un cabinet médical individuel. Elle permet de centraliser les informations patients, gérer les consultations, les ordonnances, les rendez-vous, la facturation, le stock de produits (notamment les tisanes et préparations ZEZEPAGNON), et d'effectuer des analyses biologiques (NFS, hématologie) à partir de fichiers importés.

L'application s'inscrit dans l'univers ZEZEPAGNON fondé par le **Pr Alain Tagro Kalou**, spécialiste en système immunitaire et chercheur en pharmacopée africaine (CEO MAPA Arizona / New York).

L'application sera accessible **en ligne via un navigateur web**, avec une version **mobile prévue en phase ultérieure**.

---

## 2. Objectifs du projet

- Centraliser les dossiers patients de façon sécurisée et accessible à distance
- Faciliter le travail quotidien du médecin et de la secrétaire
- Automatiser la génération d'ordonnances et de factures en FCFA
- Permettre l'analyse assistée de résultats d'examens (NFS, hématologie)
- Gérer un stock de produits/tisanes ZEZEPAGNON disponibles au cabinet
- Proposer une interface moderne, multilingue (français en priorité), et responsive
- Respecter l'identité visuelle et les valeurs de la marque ZEZEPAGNON (pharmacopée africaine, bien-être naturel)

---

## 3. Utilisateurs et rôles

L'application comporte **3 rôles utilisateurs** avec des permissions distinctes :

### 3.1 Administrateur
- Créer, modifier et supprimer les comptes utilisateurs (médecins, secrétaires)
- Gérer le catalogue produits (ajout, modification, prix, stock)
- Consulter toutes les statistiques
- Configurer les paramètres de l'application (paiements, langues, logo, etc.)
- Accéder au backoffice d'administration

### 3.2 Médecin
- Créer et consulter toutes les fiches patients
- Rédiger des consultations, diagnostics, prescriptions
- Générer et imprimer des ordonnances (PDF)
- Importer et analyser des résultats d'examens (NFS, hématologie)
- Consulter l'historique médical complet d'un patient
- Accéder aux rendez-vous

### 3.3 Secrétaire / Accueil
- Créer et modifier les fiches patients (données administratives)
- Gérer l'agenda et les rendez-vous
- Émettre des factures et enregistrer les paiements
- Consulter le stock disponible (pas de modification)
- Ne peut pas accéder aux informations médicales confidentielles

**Nombre d'utilisateurs simultanés estimé : 5**

---

## 4. Fonctionnalités détaillées

### 4.1 Gestion des patients

**Données obligatoires** (champs requis) :
- Nom
- Prénom
- Sexe (Masculin / Féminin / Autre)
- Date de naissance
- Numéro de téléphone

**Données optionnelles** :
- Adresse complète (rue, commune, ville, pays)
- Profession
- Groupe sanguin (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Allergies (texte libre + liste de tags)
- Antécédents médicaux personnels
- Antécédents médicaux familiaux
- Personne à contacter en cas d'urgence (nom + téléphone + lien de parenté)
- Photo du patient (upload image)
- Numéro d'assurance / mutuelle

**Opérations disponibles** :
- Création, consultation, modification, archivage (soft delete)
- Recherche par nom, prénom, téléphone, numéro de dossier
- Filtres (sexe, tranche d'âge, dernière consultation, etc.)
- Export d'un dossier complet en PDF

### 4.2 Gestion des consultations

- Création d'une consultation liée à un patient
- Enregistrement : date, motif, symptômes, diagnostic, traitement prescrit, observations
- Prise de constantes : poids, taille, tension artérielle, température, fréquence cardiaque
- Historique chronologique des consultations par patient
- Possibilité de joindre des documents (PDF, images)

### 4.3 Ordonnances et prescriptions

- Création d'ordonnances avec sélection de produits depuis le catalogue (ou saisie libre)
- Posologie, durée, remarques
- Export PDF avec en-tête personnalisé du cabinet (logo ZEZEPAGNON, infos du médecin)
- Archivage automatique dans le dossier patient
- Possibilité de réimprimer une ordonnance ultérieurement

### 4.4 Gestion des rendez-vous / agenda

- Vue calendrier (jour, semaine, mois)
- Création de RDV : patient, médecin, date, heure, durée, motif
- Statuts : programmé, confirmé, en cours, terminé, annulé, absent
- Notifications visuelles (RDV du jour)
- Envoi de rappels SMS / Email (phase 2, selon budget)

### 4.5 Analyse de résultats d'examens (NFS et hématologie)

**Fonctionnalité spécifique importante** :
- Import de fichiers : **PDF, JPG, JPEG, PNG, GIF**
- Extraction des valeurs biologiques (OCR pour les images, parsing pour PDF)
- Comparaison automatique avec les normes de référence
- Détection et mise en évidence des valeurs anormales
- Suggestion de pathologies possibles selon les anomalies détectées (hors diagnostic définitif)
- Affichage sous forme de tableau avec code couleur (normal / bas / élevé / critique)
- Historisation des résultats dans le dossier patient
- Possibilité de générer un compte-rendu PDF

> ⚠️ Cette fonctionnalité est une **aide à l'analyse**, pas un diagnostic médical. Un avertissement doit être affiché à l'utilisateur.

### 4.6 Facturation et paiements

- Génération de factures en **FCFA (XOF)**
- Items facturables : consultation, produits du stock (tisanes ZEZEPAGNON, etc.), actes médicaux
- Export PDF de la facture avec en-tête du cabinet
- Modes de paiement acceptés :
  - Espèces
  - **Orange Money**
  - **MTN Mobile Money**
  - **Wave**
  - Virement bancaire
  - Chèque
- Suivi des paiements (payé, partiel, impayé)
- Intégration future avec les API Mobile Money pour paiement automatisé

### 4.7 Gestion du stock (backoffice administrateur)

- Catalogue produits : nom, description, catégorie, prix unitaire (FCFA), quantité en stock, seuil d'alerte, image du produit
- Catégories suggérées : Tisanes ZEZEPAGNON, Préparations, Compléments, Matériel médical, Divers
- Ajout, modification, suppression de produits
- Alertes automatiques en cas de stock faible
- Historique des entrées/sorties
- Déduction automatique du stock lors d'une prescription ou vente

### 4.8 Statistiques et tableau de bord

- Nombre de patients actifs
- Nombre de consultations (jour, semaine, mois, année)
- Chiffre d'affaires (FCFA)
- Top produits vendus / prescrits
- Taux de remplissage de l'agenda
- Pathologies les plus fréquentes (basé sur les diagnostics)
- Graphiques interactifs

### 4.9 Multilingue

- Langue par défaut : **Français**
- Langue secondaire : **Anglais** (à l'image du site officiel zezepagnon.com qui propose FR/EN)
- Système i18n permettant l'ajout facile de nouvelles langues

---

## 5. Identité visuelle et charte graphique

### 5.1 Inspiration

La charte graphique s'inspire directement du site officiel [zezepagnon.com](https://zezepagnon.com/), qui reflète l'univers de la pharmacopée africaine, du bien-être naturel et des plantes médicinales.

### 5.2 Palette de couleurs

**Couleurs principales** (inspirées de la nature africaine et des tisanes) :

| Nom | Code HEX | Usage |
|---|---|---|
| Vert ZEZEPAGNON (principal) | `#2E7D32` | Couleur dominante, boutons primaires, en-têtes |
| Vert foncé | `#1B5E20` | Textes importants, hover, navigation |
| Vert clair / naturel | `#81C784` | Accents, badges, survols |
| Or / Jaune miel | `#F9A825` | Accents chauds, CTA secondaires, médailles |
| Terre cuite / Orange africain | `#D84315` | Alertes douces, éléments de rappel |

**Couleurs neutres** :

| Nom | Code HEX | Usage |
|---|---|---|
| Blanc cassé | `#FAFAF7` | Fond principal |
| Beige naturel | `#F5F1E8` | Fond secondaire, cartes |
| Gris anthracite | `#263238` | Textes principaux |
| Gris moyen | `#607D8B` | Textes secondaires |

**Couleurs fonctionnelles** (pour les alertes médicales) :

| État | Code HEX | Usage |
|---|---|---|
| Succès / Normal | `#388E3C` | Valeurs normales, paiement réussi |
| Info | `#0288D1` | Informations neutres |
| Avertissement | `#F57C00` | Valeurs limites, attention |
| Erreur / Critique | `#C62828` | Valeurs critiques, erreurs |

### 5.3 Typographie

- **Titres** : `Poppins` (SemiBold / Bold) — moderne, bien lisible
- **Corps de texte** : `Inter` ou `Open Sans` — sobre et professionnel
- **Accents / citations** : `Merriweather` (optionnel, pour toucher éditorial)

Toutes ces polices sont disponibles gratuitement via **Google Fonts**.

### 5.4 Style général

- **Épuré et professionnel** avec touches naturelles
- **Cartes arrondies** (rayon 8-12 px) et ombres douces
- **Icônes** : `Lucide React` ou `Heroicons` (style trait fin)
- **Illustrations** : motifs végétaux discrets, feuilles, plantes médicinales (SVG)
- **Boutons** : arrondis, pleins pour les actions primaires (vert principal), contournés pour les actions secondaires
- **Respect de l'accessibilité** : contrastes WCAG AA minimum

### 5.5 Logo

- Logo officiel ZEZEPAGNON à récupérer depuis le site officiel (celui utilisé en en-tête)
- Source : https://zezepagnon.com/wp-content/uploads/ (versions disponibles)
- Le logo doit apparaître dans :
  - L'en-tête de toutes les pages
  - La page de connexion
  - Les documents PDF générés (ordonnances, factures)
  - Le favicon du navigateur

### 5.6 Ton éditorial

Chaleureux, professionnel, rassurant, ancré dans les valeurs africaines du bien-être et de la phytothérapie. Les textes doivent refléter le sérieux médical tout en restant accessibles.

---

## 6. Stack technique

### 6.1 Backend
- **Node.js** (v20 LTS)
- **Express.js** (framework web)
- **MariaDB 10.11+** (base de données relationnelle, native sur Debian 12)
- **Sequelize** (ORM, recommandé pour sa maturité)
- **JWT** pour l'authentification
- **bcrypt** pour le hashage des mots de passe
- **Multer** pour l'upload de fichiers
- **PDFKit** ou **Puppeteer** pour la génération de PDF
- **Tesseract.js** pour l'OCR des images d'examens
- **pdf-parse** pour l'extraction de texte des PDF
- **Winston** pour la gestion des logs
- **Joi** ou **Zod** pour la validation des entrées

### 6.2 Frontend
- **React** (v18+)
- **Vite** (build tool)
- **React Router v6** (navigation)
- **TailwindCSS** (styles, avec configuration personnalisée aux couleurs ZEZEPAGNON)
- **shadcn/ui** (composants UI modernes et personnalisables)
- **React Hook Form** + **Zod** (formulaires et validation)
- **TanStack Query** (gestion des requêtes API)
- **react-i18next** (internationalisation)
- **Recharts** (graphiques)
- **FullCalendar** (agenda)
- **Lucide React** (icônes)

### 6.3 Outils et DevOps
- **Git** + **GitHub** / **GitLab** pour le versionnement
- **ESLint** + **Prettier** (qualité du code)
- **PM2** pour la gestion des processus Node.js en production
- **Nginx** comme reverse proxy
- Tests : **Jest** (backend) et **Vitest** (frontend)

---

## 7. Architecture du projet

```
zezepagnon/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration (DB, env, i18n)
│   │   ├── controllers/      # Logique métier
│   │   ├── models/           # Modèles Sequelize
│   │   ├── routes/           # Routes Express
│   │   ├── middlewares/      # Auth, validation, erreurs
│   │   ├── services/         # Services (PDF, OCR, analyse NFS)
│   │   ├── utils/            # Fonctions utilitaires
│   │   └── app.js
│   ├── uploads/              # Fichiers uploadés (examens, photos)
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Composants réutilisables
│   │   ├── pages/            # Pages de l'application
│   │   ├── hooks/            # Hooks personnalisés
│   │   ├── services/         # Appels API
│   │   ├── contexts/         # Contextes React (Auth, etc.)
│   │   ├── locales/          # Fichiers de traduction (fr, en)
│   │   ├── assets/           # Logo, images
│   │   ├── styles/           # Tailwind config, theme ZEZEPAGNON
│   │   └── App.jsx
│   ├── public/
│   └── package.json
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── docs/
│   ├── API.md
│   ├── INSTALLATION.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
│
├── scripts/
│   ├── backup.sh
│   ├── deploy.sh
│   └── install-prerequisites.sh
│
├── README.md
└── SPEC.md                    # Ce fichier
```

---

## 8. Sécurité et conformité

- **Authentification** JWT avec refresh tokens
- **Autorisation** basée sur les rôles (RBAC)
- Mots de passe hashés avec **bcrypt** (coût minimum 12)
- **HTTPS** obligatoire en production (certificat Let's Encrypt)
- Protection **CSRF**, **XSS**, **SQL injection** (validation stricte des entrées)
- **Rate limiting** sur les endpoints sensibles (login, API publiques)
- Logs d'audit (qui a accédé à quel dossier, quand)
- Sauvegardes automatiques quotidiennes de la base de données
- Chiffrement au repos des données médicales sensibles (phase 2)
- Pare-feu (UFW) configuré sur le serveur
- **Fail2Ban** pour protéger SSH et l'application contre les attaques par force brute
- Mises à jour de sécurité régulières du système

---

## 9. Hébergement — Auto-hébergement Debian

### 9.1 Configuration du serveur

**Serveur cible** : machine Debian Linux (auto-hébergement)
**Version recommandée** : **Debian 12 (Bookworm)** — stable, LTS jusqu'en 2028

### 9.2 Prérequis à installer sur la machine Debian

Voici la liste complète des logiciels à installer. Un script `scripts/install-prerequisites.sh` sera fourni pour automatiser l'installation.

#### Paquets système de base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential software-properties-common \
    ca-certificates gnupg lsb-release ufw fail2ban unzip
```

#### Node.js (v20 LTS) via NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # doit afficher v20.x.x
npm --version
```

#### MariaDB
```bash
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

#### Nginx (reverse proxy)
```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

#### PM2 (gestionnaire de processus Node.js)
```bash
sudo npm install -g pm2
pm2 startup systemd
```

#### Certbot (SSL Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### Outils complémentaires
```bash
# Tesseract pour l'OCR (analyse NFS depuis images)
sudo apt install -y tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng

# Chromium (requis pour Puppeteer si utilisé pour les PDF)
sudo apt install -y chromium

# Outils de monitoring (optionnels mais recommandés)
sudo apt install -y htop iotop net-tools
```

### 9.3 Configuration du pare-feu (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 9.4 Architecture de déploiement

```
Internet
   ↓
[Nginx] (ports 80/443) — Reverse proxy + SSL
   ↓
[Backend Node.js via PM2] (port 3000, localhost uniquement)
   ↓
[MariaDB] (port 3306, localhost uniquement)

[Frontend React buildé] → servi en statique par Nginx
```

### 9.5 Configuration Nginx (extrait)

```nginx
server {
    listen 443 ssl http2;
    server_name ton-domaine.com;

    ssl_certificate /etc/letsencrypt/live/ton-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ton-domaine.com/privkey.pem;

    # Frontend React (buildé)
    root /var/www/zezepagnon/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Fichiers uploadés (photos patients, examens)
    location /uploads {
        alias /var/www/zezepagnon/backend/uploads;
        expires 30d;
    }

    client_max_body_size 20M;  # Pour uploads d'examens PDF/images
}

server {
    listen 80;
    server_name ton-domaine.com;
    return 301 https://$server_name$request_uri;
}
```

### 9.6 Sauvegardes

- Script `scripts/backup.sh` automatisé via `cron` (quotidien à 2h du matin)
- Sauvegarde de :
  - Base de données MariaDB (`mysqldump`)
  - Dossier `uploads/`
  - Fichiers de configuration
- Rétention : 30 jours en local, idéalement synchronisé vers un stockage externe (NAS, cloud)

### 9.7 Monitoring

- **PM2** pour surveiller le processus Node.js
- Logs Nginx dans `/var/log/nginx/`
- Logs applicatifs via **Winston** dans `/var/log/zezepagnon/`
- Surveillance manuelle via `htop`, `pm2 monit`, `journalctl`

### 9.8 Ressources serveur recommandées

| Composant | Minimum | Recommandé |
|---|---|---|
| CPU | 2 cœurs | 4 cœurs |
| RAM | 4 Go | 8 Go |
| Disque | 50 Go SSD | 100 Go SSD |
| Bande passante | 10 Mbps symétrique | 50 Mbps symétrique |

---

## 10. Environnements

### 10.1 Développement local (poste Alexis)
- **Chemin du projet** : `/home/alexis/Applis/Dossiers_patients/zeze_patients`
- **Utilisateur système** : `alexis`
- Machine Linux du développeur (PC personnel)
- Base de données MariaDB locale (`zezepagnon_dev`)
- Variables d'environnement dans `.env.development` (non commité)
- Hot reload activé (Vite pour le front, nodemon pour le back)
- Port backend de dev : `3000`
- Port frontend de dev : `5173` (Vite par défaut)

**Structure attendue sur le poste de dev :**
```
/home/alexis/Applis/Dossiers_patients/zeze_patients/
├── backend/
├── frontend/
├── database/
├── docs/
├── scripts/
├── SPEC.md
└── README.md
```

### 10.2 Tests / Staging (optionnel)
- Une VM ou conteneur Docker sur la même machine Debian
- Permet de tester les déploiements avant la mise en production

### 10.3 Production
- **Chemin du projet** : `/var/www/zezepagnon`
- **Utilisateur système dédié** : `zezepagnon` (à créer, sans shell de connexion)
- Machine Debian auto-hébergée décrite en section 9
- Base de données MariaDB (`zezepagnon_prod`)
- Variables d'environnement dans `.env.production` (non commité, droits 600)
- Déploiement via Git (pull depuis le dépôt)
- Build du frontend et redémarrage PM2 du backend
- Script `scripts/deploy.sh` pour automatiser

**Structure attendue sur le serveur de production :**
```
/var/www/zezepagnon/
├── backend/
│   ├── src/
│   ├── uploads/          # Fichiers patients (droits 750, owner zezepagnon)
│   ├── .env.production
│   └── node_modules/
├── frontend/
│   └── dist/             # Build de production servi par Nginx
├── database/
│   └── backups/          # Sauvegardes locales (droits 700)
├── logs/                 # Logs applicatifs
└── scripts/
```

### 10.4 Tableau comparatif des environnements

| Aspect | Développement | Production |
|---|---|---|
| Chemin | `/home/alexis/Applis/Dossiers_patients/zeze_patients` | `/var/www/zezepagnon` |
| Utilisateur | `alexis` | `zezepagnon` (dédié) |
| Base de données | `zezepagnon_dev` | `zezepagnon_prod` |
| Fichier .env | `.env.development` | `.env.production` |
| URL d'accès | `http://localhost:5173` | `https://ton-domaine.com` |
| HTTPS | Non | Oui (Let's Encrypt) |
| Nginx | Non (Vite dev server) | Oui (reverse proxy) |
| PM2 | Non (nodemon) | Oui |
| Logs | Console | Fichiers + Winston |

### 10.5 Synchronisation dev → production

- Le code est versionné sur Git (poste dev pousse, serveur de prod tire)
- Aucun fichier n'est copié directement entre les deux environnements
- Les fichiers `.env` sont **différents** sur chaque environnement (jamais commités)
- Le script `scripts/deploy.sh` exécuté sur le serveur de production doit :
  1. Faire un `git pull` dans `/var/www/zezepagnon`
  2. Installer les dépendances (`npm ci` dans backend et frontend)
  3. Builder le frontend (`npm run build`)
  4. Appliquer les migrations de base de données
  5. Redémarrer le backend via PM2 (`pm2 restart zezepagnon-api`)

---

## 11. Planning de développement

Le développement se fera en **phases progressives**. Claude Code gère le rythme selon ses capacités, avec l'objectif de livrer un MVP fonctionnel le plus rapidement possible, puis d'enrichir l'application.

### Phase 1 — Fondations (MVP partie 1)
1. Initialisation du projet (Git, structure des dossiers, README)
2. Configuration du thème Tailwind aux couleurs ZEZEPAGNON
3. Base de données : schéma et migrations initiales
4. Authentification (login, JWT, rôles)
5. Layout principal (navbar, sidebar, theme ZEZEPAGNON)
6. CRUD utilisateurs (backoffice admin)

### Phase 2 — Patients et consultations (MVP partie 2)
7. CRUD patients (données obligatoires + optionnelles)
8. CRUD consultations
9. Ordonnances + export PDF avec en-tête ZEZEPAGNON
10. Recherche et filtres patients

### Phase 3 — Agenda et stock (MVP partie 3)
11. Agenda / rendez-vous (vue calendrier)
12. Gestion du stock produits (backoffice admin)
13. Catégories de produits avec focus sur tisanes ZEZEPAGNON

### Phase 4 — Facturation
14. Facturation en FCFA
15. Gestion des paiements (manuel au départ)
16. Export PDF des factures

### Phase 5 — Analyse NFS et hématologie
17. Upload des fichiers d'examens (PDF, images)
18. OCR et extraction des valeurs
19. Comparaison avec les normes de référence
20. Affichage avec code couleur et suggestions

### Phase 6 — Statistiques et multilingue
21. Tableau de bord avec graphiques
22. Système i18n (français + anglais)

### Phase 7 — Optimisations et intégrations
23. Rappels SMS/Email pour RDV
24. Intégration paiements Orange Money / MTN / Wave
25. Optimisations performances et accessibilité

### Phase 8 — Mobile (future)
26. Version mobile (PWA d'abord, React Native ensuite)

---

## 12. Livrables attendus

- Code source complet (backend + frontend) versionné sur Git
- Base de données initiale avec schéma et données de test
- **Scripts d'installation** automatisés (`install-prerequisites.sh`)
- **Scripts de déploiement** (`deploy.sh`)
- **Scripts de sauvegarde** (`backup.sh`)
- Documentation technique complète :
  - `README.md` (présentation, démarrage rapide)
  - `docs/INSTALLATION.md` (installation sur Debian)
  - `docs/DEPLOYMENT.md` (déploiement en production)
  - `docs/API.md` (documentation des endpoints)
  - `docs/USER_GUIDE.md` (guide utilisateur en français)
- Un compte administrateur par défaut pour la première connexion
- Configuration Nginx prête à l'emploi
- Fichier `docker-compose.yml` optionnel pour développement

---

## 13. Instructions pour Claude Code

Lors du démarrage du projet, Claude doit :

1. **Résumer sa compréhension** du projet et poser les questions restantes avant de coder
2. **Proposer l'architecture détaillée** et attendre validation
3. **Récupérer le logo ZEZEPAGNON** depuis le site officiel (ou demander à l'utilisateur de le fournir)
4. **Configurer le thème Tailwind** avec les couleurs définies en section 5.2 dès le début
5. **Procéder phase par phase** : commencer par la Phase 1, valider avec le client, puis passer aux phases suivantes
6. **Écrire du code propre, commenté en français**, respectant les bonnes pratiques
7. **Créer des tests** pour les fonctionnalités critiques
8. **Demander confirmation** avant toute action destructive ou majeure
9. **Committer régulièrement** sur Git avec des messages clairs et en français
10. **Fournir les scripts shell** pour l'installation des prérequis sur Debian au fur et à mesure que les dépendances sont introduites
11. **Documenter au fil de l'eau** (pas tout à la fin) dans les fichiers de `docs/`
12. **Privilégier la simplicité** : ne pas sur-concevoir, préférer les solutions éprouvées

---

*Document rédigé le 18 avril 2026 — Version 2.0*
*Inspiration charte graphique : [zezepagnon.com](https://zezepagnon.com/)*
