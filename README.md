# ZEZEPAGNON — Dossiers Patients

> **La richesse des plantes africaines au service du bien-être**  
> Application de gestion de dossiers patients — Cabinet médical, Abidjan, Côte d'Ivoire

---

## Présentation

ZEZEPAGNON Dossiers Patients est une application web de gestion médicale développée pour le réseau MAPA (pharmacopée africaine). Elle permet de centraliser les dossiers patients, gérer les consultations, ordonnances, rendez-vous, facturation en FCFA, stock de produits et exercices comptables.

---

## Documentation

| Document | Public | Contenu |
|----------|--------|---------|
| [MANUEL.md](MANUEL.md) | Utilisateurs finaux | Comment utiliser l'application (patients, stock, exercices…) |
| [TECHNICAL.md](TECHNICAL.md) | Développeurs | Architecture, modèle de données, API, règles métier |
| [INSTALL.md](INSTALL.md) | Administrateurs système | Installation, déploiement, sauvegardes, dépannage |

---

## Démarrage rapide (développement)

### Prérequis

- Docker Engine 24.0+
- Docker Compose plugin 2.20+

### Lancer l'application

```bash
git clone https://github.com/destibat/zeze-patients.git
cd zeze-patients

sudo docker compose up -d
sleep 15
sudo docker compose exec backend npx sequelize-cli db:migrate
sudo docker compose exec backend npx sequelize-cli db:seed:all
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/health |

### Compte administrateur par défaut

| Email | Mot de passe |
|-------|-------------|
| `admin@zezepagnon.local` | `ZezeAdmin2026!` |

> Changer ce mot de passe immédiatement après la première connexion.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Node.js 20 LTS, Express, Sequelize, MariaDB 10.11 |
| Frontend | React 18, Vite, TailwindCSS, TanStack Query |
| Auth | JWT (access 15 min + refresh 7 jours) |
| PDF | PDFKit |
| OCR | Tesseract.js + pdf-parse |
| Logs | Winston + rotation quotidienne |
| Infra | Docker Compose, Nginx (Alpine) |

---

## Environnements

| | Développement | Production |
|--|--------------|------------|
| Commande | `docker compose up -d` | `docker compose -f docker-compose.prod.yml up -d` |
| Base de données | `zezepagnon_dev` | `zezepagnon_prod` |
| URL | http://localhost:5173 | https://patients.zezepagnon.solutions |
| Chemin serveur | — | `/var/www/zezepagnon` |

---

*ZEZEPAGNON — MAPA, Abidjan, Côte d'Ivoire*
