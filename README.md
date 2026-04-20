# ZEZEPAGNON — Dossiers Patients

> **La richesse des plantes africaines au service du bien-être**  
> Application de gestion de dossiers patients — Cabinet médical, Abidjan, Côte d'Ivoire

---

## Présentation

ZEZEPAGNON Dossiers Patients est une application web de gestion médicale développée pour le cabinet du **Pr Alain Tagro Kalou**, spécialiste en système immunitaire et chercheur en pharmacopée africaine (MAPA — Maximizing American Potential in Africa).

Elle permet de centraliser les dossiers patients, gérer les consultations, ordonnances, rendez-vous, facturation en FCFA et stock de produits ZEZEPAGNON.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Node.js 20, Express.js, Sequelize, MariaDB |
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui |
| Auth | JWT + Refresh Tokens (en base) |
| PDF | PDFKit / Puppeteer |
| OCR | Tesseract.js |
| Logs | Winston |

---

## Démarrage rapide (développement)

### Prérequis
- Node.js v20 LTS
- MariaDB 10.11+
- Docker + Docker Compose (optionnel)

### Avec Docker (recommandé)

```bash
docker-compose up -d
```

L'application est accessible sur :
- Frontend : http://localhost:5173
- Backend API : http://localhost:3000/api

### Sans Docker

**1. Base de données**
```bash
mysql -u root -p < database/schema.sql
```

**2. Backend**
```bash
cd backend
cp .env.example .env.development
# Éditer .env.development avec vos paramètres
npm install
npm run migrate
npm run seed
npm run dev
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Compte administrateur par défaut

| Champ | Valeur |
|-------|--------|
| Email | admin@zezepagnon.local |
| Mot de passe | **ZezeAdmin2026!** |

> ⚠️ **Changer ce mot de passe immédiatement après la première connexion.**

---

## Structure du projet

```
zeze_patients/
├── backend/          # API Express + Sequelize
├── frontend/         # React + Vite + TailwindCSS
├── database/         # Migrations + seeds
├── docs/             # Documentation technique
├── scripts/          # Scripts d'installation et déploiement
├── docker-compose.yml
└── SPEC.md           # Spécifications complètes
```

---

## Documentation

- [Installation sur Debian](docs/INSTALLATION.md)
- [Déploiement en production](docs/DEPLOYMENT.md)
- [Documentation API](docs/API.md)
- [Guide utilisateur](docs/USER_GUIDE.md)

---

## Environnements

| | Développement | Production |
|--|--------------|------------|
| Chemin | `/home/alexis/Applis/Dossiers_patients/zeze_patients` | `/var/www/zezepagnon` |
| DB | `zezepagnon_dev` | `zezepagnon_prod` |
| URL | http://localhost:5173 | https://patients.zezepagnon.solution |

---

*Marque ZEZEPAGNON — MAPA (Maximizing American Potential in Africa)*
