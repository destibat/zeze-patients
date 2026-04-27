# Guide d'installation et de déploiement — ZEZEPAGNON Dossiers Patients

**Version 1.0 — Avril 2026**

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Installation en local (développement)](#2-installation-en-local-développement)
3. [Création du premier utilisateur admin](#3-création-du-premier-utilisateur-admin)
4. [Sauvegardes](#4-sauvegardes)
5. [Mise à jour](#5-mise-à-jour)
6. [Mise en production](#6-mise-en-production)
7. [Monitoring et logs](#7-monitoring-et-logs)
8. [Dépannage](#8-dépannage)

---

## 1. Prérequis

### Système d'exploitation

| Environnement | OS supporté |
|---------------|-------------|
| Développement | Linux, macOS, Windows (WSL2 recommandé) |
| Production | Debian 12+ (recommandé), Ubuntu 22.04+ |

### Docker

| Logiciel | Version minimale | Vérification |
|----------|-----------------|--------------|
| Docker Engine | 24.0 | `docker --version` |
| Docker Compose plugin | 2.20 | `docker compose version` |

> Sur Debian/Ubuntu : installer via le dépôt officiel Docker, **pas** via `apt install docker.io` (version trop ancienne).

### Ressources serveur (production)

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| RAM | 1 Go | 2 Go |
| CPU | 1 vCPU | 2 vCPU |
| Disque | 10 Go | 20 Go |
| Réseau | Port 80 et 443 ouverts | — |

### Accès réseau

- Le serveur doit pouvoir accéder à internet (téléchargement des images Docker)
- Ports à ouvrir en entrée : **22** (SSH), **80** (HTTP), **443** (HTTPS)

---

## 2. Installation en local (développement)

### Cloner le projet

```bash
git clone https://github.com/destibat/zeze-patients.git
cd zeze-patients
```

### Variables d'environnement

Le fichier `backend/.env.development` est déjà pré-rempli pour le développement local et **n'est pas à modifier** pour un démarrage rapide.

Voici le rôle de chaque variable :

| Variable | Rôle | Valeur dev par défaut |
|----------|------|-----------------------|
| `NODE_ENV` | Environnement applicatif | `development` |
| `PORT` | Port du serveur Express | `3000` |
| `DB_HOST` | Hôte MariaDB (nom du service Docker) | `localhost` |
| `DB_PORT` | Port MariaDB | `3306` |
| `DB_NAME` | Nom de la base de données | `zezepagnon_dev` |
| `DB_USER` | Utilisateur MariaDB | `root` |
| `DB_PASSWORD` | Mot de passe MariaDB | `P@ssW0rd` |
| `JWT_SECRET` | Secret pour signer les access tokens | *(valeur dev, changer en prod)* |
| `JWT_EXPIRES_IN` | Durée de vie des access tokens | `15m` |
| `JWT_REFRESH_SECRET` | Secret pour signer les refresh tokens | *(valeur dev, changer en prod)* |
| `JWT_REFRESH_EXPIRES_IN` | Durée de vie des refresh tokens | `7d` |
| `FRONTEND_URL` | URL du frontend (CORS) | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Fenêtre du rate limiter (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Requêtes max par fenêtre | `2000` *(désactivé en dev)* |
| `AUTH_RATE_LIMIT_MAX` | Tentatives de login max | `50` *(désactivé en dev)* |
| `LOG_LEVEL` | Niveau de log Winston | `debug` |

> Le fichier `.env` à la **racine** du projet est utilisé par `docker-compose.yml` en dev. Il contient `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Ces valeurs sont déjà dans `docker-compose.yml` en dur pour le dev — pas de `.env` racine nécessaire en développement.

### Première installation — pas à pas

```bash
# 1. Construire les images Docker
sudo docker compose build

# 2. Démarrer tous les services (MariaDB, backend, frontend)
sudo docker compose up -d

# 3. Attendre que la base soit prête (environ 15 secondes)
sleep 15

# 4. Appliquer les migrations (création de toutes les tables)
sudo docker compose exec backend npx sequelize-cli db:migrate

# 5. Charger les données initiales (admin + catalogue produits)
sudo docker compose exec backend npx sequelize-cli db:seed:all
```

### Lancer l'application

```bash
sudo docker compose up -d
```

### Vérifier que tout fonctionne

| URL | Ce qui doit s'afficher |
|-----|------------------------|
| `http://localhost:5173` | Interface React (page de connexion) |
| `http://localhost:3000/health` | `{"statut":"ok", ...}` |

La base MariaDB est aussi accessible depuis l'hôte sur le port **3307** (mappé pour ne pas entrer en conflit avec un MariaDB local éventuellement installé sur le port 3306).

```bash
# Vérifier l'état des conteneurs
sudo docker compose ps

# Voir les logs en direct
sudo docker compose logs -f backend
```

### Arrêter l'application

```bash
sudo docker compose down
```

> Les données sont conservées dans le volume Docker `db_data`. Pour tout effacer :
> ```bash
> sudo docker compose down -v
> ```

---

## 3. Création du premier utilisateur admin

Le seeder `database/seeds/20260418001-admin-user.js` crée automatiquement le compte admin lors de `db:seed:all`.

| Champ | Valeur |
|-------|--------|
| Email | `admin@zezepagnon.local` |
| Mot de passe | `ZezeAdmin2026!` |
| Rôle | `administrateur` |

> Le flag `doit_changer_mdp` est activé : **l'application demandera de changer le mot de passe à la première connexion**.

Si le seeder a déjà été joué et que vous voulez réinitialiser le mot de passe admin manuellement :

```bash
# En développement
sudo docker compose exec backend node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('NouveauMotDePasse!', 12).then(h => console.log(h));
"
# Copiez le hash affiché, puis :
sudo docker compose exec db mariadb -u root -p'P@ssW0rd' zezepagnon_dev \
  -e "UPDATE users SET password_hash='<hash_copié>', doit_changer_mdp=1 WHERE email='admin@zezepagnon.local';"
```

---

## 4. Sauvegardes

### Sauvegarder la base de données

```bash
# En développement
sudo docker compose exec db mariadb-dump \
  -u root -p'P@ssW0rd' zezepagnon_dev \
  > backup_dev_$(date +%Y%m%d_%H%M%S).sql

# En production (remplacer les valeurs par celles de votre .env)
sudo docker compose -f docker-compose.prod.yml exec db mariadb-dump \
  -u root -p'<DB_ROOT_PASSWORD>' zezepagnon_prod \
  > /var/backups/zezepagnon_$(date +%Y%m%d_%H%M%S).sql
```

### Sauvegarder les fichiers uploadés

Les photos patients et fichiers joints sont stockés dans le volume `uploads_data` (production) ou dans `backend/uploads/` (développement).

```bash
# En production — copier les uploads hors du conteneur
sudo docker cp zezepagnon_backend:/app/uploads /var/backups/uploads_$(date +%Y%m%d)
```

### Automatiser les sauvegardes (production)

Ajoutez cette ligne dans `/etc/cron.d/zeze-backups` :

```bash
0 2 * * * root \
  docker compose -f /var/www/zezepagnon/docker-compose.prod.yml exec -T db \
  mariadb-dump -u root -p'<DB_ROOT_PASSWORD>' zezepagnon_prod \
  > /var/backups/zeze_$(date +\%Y\%m\%d).sql \
  && find /var/backups -name "zeze_*.sql" -mtime +30 -delete
```

Cela sauvegarde chaque nuit à 2h et supprime les sauvegardes de plus de 30 jours.

### Restaurer une sauvegarde

```bash
# En développement
sudo docker compose exec -T db mariadb \
  -u root -p'P@ssW0rd' zezepagnon_dev \
  < backup_dev_20260427_120000.sql

# En production
sudo docker compose -f docker-compose.prod.yml exec -T db mariadb \
  -u root -p'<DB_ROOT_PASSWORD>' zezepagnon_prod \
  < /var/backups/zeze_20260427.sql
```

---

## 5. Mise à jour

### Procédure standard (production)

```bash
cd /var/www/zezepagnon
sudo bash scripts/deploy.sh
```

Ce script effectue dans l'ordre :
1. `git pull origin main` — récupère le nouveau code
2. `docker compose build` — reconstruit les images modifiées
3. `docker compose up -d` — redémarre les conteneurs (downtime < 5 s)
4. `db:migrate` — applique les nouvelles migrations
5. `docker image prune -f` — nettoie les anciennes images

### Jouer uniquement les migrations

```bash
# En développement
sudo docker compose exec backend npx sequelize-cli db:migrate

# En production
sudo docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate
```

### Annuler la dernière migration

```bash
sudo docker compose exec backend npx sequelize-cli db:migrate:undo
```

### Redémarrer un service sans rebuild

```bash
# En production
sudo docker compose -f docker-compose.prod.yml restart backend
sudo docker compose -f docker-compose.prod.yml restart nginx
```

### Forcer un rebuild complet (cache invalidé)

```bash
sudo docker compose -f docker-compose.prod.yml build --no-cache
sudo docker compose -f docker-compose.prod.yml up -d
```

---

## 6. Mise en production

> Le guide complet d'installation depuis zéro est dans `MIGRATION_PRODUCTION.md`.

### Différences entre dev et prod

| Aspect | Développement | Production |
|--------|---------------|------------|
| Fichier compose | `docker-compose.yml` | `docker-compose.prod.yml` |
| Nginx | Absent (accès direct aux ports) | Présent (reverse proxy + SSL) |
| Frontend | Vite dev server (HMR) | Build statique servi par Nginx |
| Backend | Nodemon (rechargement auto) | Node.js direct |
| Rate limiting | Désactivé | Activé |
| Logs | `debug` + console | Fichiers rotatifs |
| Base de données | Port 3307 exposé | Aucun port exposé |
| CORS | Tout le réseau local autorisé | FRONTEND_URL uniquement |

### Variables d'environnement spécifiques à la production

Créez `.env` à la racine du projet (`/var/www/zezepagnon/.env`) :

```bash
# Base de données
DB_ROOT_PASSWORD=<mot_de_passe_root_fort>
DB_NAME=zezepagnon_prod
DB_USER=zezepagnon
DB_PASSWORD=<mot_de_passe_db_fort>

# JWT — générer avec : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64_caractères_hex_aléatoires>
JWT_REFRESH_SECRET=<64_autres_caractères_hex_aléatoires>

# URL du frontend (pour CORS)
FRONTEND_URL=https://patients.zezepagnon.solutions
```

> Ces valeurs sont injectées dans le backend via `docker-compose.prod.yml`. Pas de fichier `.env.production` côté backend en production — tout passe par docker-compose.

### HTTPS et nom de domaine

1. **DNS** : enregistrement A pointant vers l'IP du serveur
2. **Certificat** : généré avec Certbot (Let's Encrypt)
3. **Nginx** : configuré dans `nginx/nginx.conf` (redirect HTTP→HTTPS, TLS 1.2/1.3)
4. **Certs** : stockés dans `nginx/certs/` (non commités)

```bash
# Générer le certificat (avant de démarrer Docker)
sudo certbot certonly --standalone -d patients.zezepagnon.solutions \
  --email votre@email.com --agree-tos --no-eff-email

# Copier dans le projet
sudo mkdir -p /var/www/zezepagnon/nginx/certs
sudo cp /etc/letsencrypt/live/patients.zezepagnon.solutions/fullchain.pem /var/www/zezepagnon/nginx/certs/
sudo cp /etc/letsencrypt/live/patients.zezepagnon.solutions/privkey.pem   /var/www/zezepagnon/nginx/certs/
sudo chmod 644 /var/www/zezepagnon/nginx/certs/fullchain.pem
sudo chmod 600 /var/www/zezepagnon/nginx/certs/privkey.pem
```

### Renouvellement automatique des certificats

```bash
# Configurer le cron (tourne chaque lundi à 3h)
echo "0 3 * * 1 root bash /var/www/zezepagnon/scripts/renew-certs.sh >> /var/log/renew-certs.log 2>&1" \
  | sudo tee /etc/cron.d/zeze-certs
```

Le script `scripts/renew-certs.sh` :
1. Arrête le conteneur Nginx
2. Renouvelle le certificat avec Certbot
3. Copie les nouveaux certificats dans `nginx/certs/`
4. Redémarre Nginx

---

## 7. Monitoring et logs

### Voir les logs des conteneurs

```bash
# Tous les services en temps réel
sudo docker compose -f docker-compose.prod.yml logs -f

# Un service spécifique
sudo docker compose -f docker-compose.prod.yml logs -f backend
sudo docker compose -f docker-compose.prod.yml logs -f nginx
sudo docker compose -f docker-compose.prod.yml logs -f db
```

### Logs applicatifs (Winston)

Le backend écrit dans `backend/logs/` avec rotation quotidienne :

```bash
# Accéder aux logs depuis le conteneur
sudo docker compose -f docker-compose.prod.yml exec backend ls logs/

# Lire le log du jour
sudo docker compose -f docker-compose.prod.yml exec backend tail -f logs/app-YYYY-MM-DD.log
```

Niveaux de log : `error`, `warn`, `info`, `http`, `debug` (désactivé en prod).

### Commandes utiles au quotidien

```bash
# État des conteneurs
sudo docker compose -f docker-compose.prod.yml ps

# Utilisation des ressources
sudo docker stats

# Entrer dans le conteneur backend
sudo docker compose -f docker-compose.prod.yml exec backend sh

# Entrer dans MariaDB
sudo docker compose -f docker-compose.prod.yml exec db mariadb \
  -u root -p'<DB_ROOT_PASSWORD>' zezepagnon_prod

# Lister les tables
sudo docker compose -f docker-compose.prod.yml exec db mariadb \
  -u root -p'<DB_ROOT_PASSWORD>' zezepagnon_prod -e "SHOW TABLES;"

# Compter les utilisateurs
sudo docker compose -f docker-compose.prod.yml exec db mariadb \
  -u root -p'<DB_ROOT_PASSWORD>' zezepagnon_prod \
  -e "SELECT role, COUNT(*) FROM users GROUP BY role;"

# Voir l'espace disque des volumes Docker
sudo docker system df -v
```

---

## 8. Dépannage

### Le conteneur frontend ne démarre pas

**Symptôme :** `docker compose ps` montre le frontend en `Exit` ou `Restarting`.

**Causes fréquentes :**
1. `package-lock.json` absent → `npm ci` échoue
2. Erreur de build Vite (variable d'environnement manquante)

**Solution :**
```bash
# Voir le détail de l'erreur
sudo docker compose -f docker-compose.prod.yml logs frontend

# Forcer un rebuild sans cache
sudo docker compose -f docker-compose.prod.yml build --no-cache frontend
sudo docker compose -f docker-compose.prod.yml up -d frontend
```

---

### Erreur de connexion à la base de données

**Symptôme :** le backend démarre mais retourne des erreurs 500, ou les logs montrent `ECONNREFUSED` ou `Access denied`.

**Vérifications :**
```bash
# Le conteneur db est-il healthy ?
sudo docker compose -f docker-compose.prod.yml ps

# Tester la connexion manuellement
sudo docker compose -f docker-compose.prod.yml exec db \
  mysqladmin ping -h localhost -u root -p'<DB_ROOT_PASSWORD>'

# Vérifier que les variables DB dans .env correspondent à docker-compose.prod.yml
grep DB_ /var/www/zezepagnon/.env
```

**Causes fréquentes :**
- Le `.env` à la racine n'a pas été créé
- Le mot de passe dans `.env` ne correspond pas à celui utilisé à la création du volume MariaDB
- Le volume MariaDB a été créé avec un mot de passe différent → supprimer le volume et recommencer :

```bash
sudo docker compose -f docker-compose.prod.yml down -v
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate
sudo docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:seed:all
```

> ⚠️ Supprimer le volume efface toutes les données. Sauvegardez avant.

---

### Erreur "Invalid API key" ou 401 sur toutes les requêtes

**Symptôme :** l'interface se connecte mais toutes les requêtes API retournent 401.

**Cause :** le `JWT_SECRET` en production est différent de celui utilisé pour générer les tokens en cache navigateur.

**Solution :** vider le localStorage dans le navigateur (F12 → Application → Local Storage → Clear), puis se reconnecter.

---

### Erreur EXERCICE_REQUIS lors d'une vente

**Symptôme :** HTTP 422 avec `code: 'EXERCICE_REQUIS'` lors de la création d'une vente ou facture.

**Cause :** aucun exercice comptable n'est ouvert.

**Solution :** ouvrir un exercice via la page **Exercices** (rôle admin ou stockiste requis).

---

### Les migrations échouent avec "scandir '/database/migrations'"

**Symptôme :**
```
ERROR: ENOENT: no such file or directory, scandir '/database/migrations'
```

**Cause :** le contexte de build Docker pour le backend est `./backend` au lieu de `.` — le dossier `database/` n'est pas copié dans l'image.

**Solution :** vérifier que `docker-compose.prod.yml` utilise bien :
```yaml
backend:
  build:
    context: .
    dockerfile: backend/Dockerfile.prod
```

---

### Le site est accessible en HTTP mais pas en HTTPS

**Vérifications :**
```bash
# Les certificats sont-ils présents ?
ls -la /var/www/zezepagnon/nginx/certs/

# Le conteneur nginx est-il actif ?
sudo docker compose -f docker-compose.prod.yml ps nginx

# Les ports 80 et 443 sont-ils ouverts dans UFW ?
sudo ufw status
```

**Cause fréquente :** les certificats expirent tous les 90 jours. Vérifier la date d'expiration :
```bash
openssl x509 -enddate -noout -in /var/www/zezepagnon/nginx/certs/fullchain.pem
```

---

### Les logs montrent trop de 429 (rate limiting)

**Symptôme :** en développement, certaines pages n'affichent plus de données.

**Cause :** le rate limiter est actif alors qu'il devrait être désactivé en dev.

**Vérification :** `backend/.env.development` doit avoir `NODE_ENV=development`. Le rate limiter vérifie `config.env === 'development'` pour se désactiver.

---

### "Insufficient space" ou conteneurs qui s'arrêtent

```bash
# Voir l'espace disque
df -h

# Nettoyer les images et conteneurs inutilisés
sudo docker system prune -f

# Nettoyer aussi les volumes inutilisés (attention aux données !)
sudo docker system prune -f --volumes
```
