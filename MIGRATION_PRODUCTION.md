# Procédure de mise à jour en production — ZEZEPAGNON Dossiers Patients

> Document de référence pour toute mise à jour impliquant des migrations de base de données.  
> À suivre **dans l'ordre**, sans sauter d'étape.

---

## 0. Prérequis

- Accès SSH au serveur de production
- `git`, `docker`, `docker compose` installés
- Fichier `.env` présent à la racine du projet (voir section Variables d'environnement)
- Être dans le répertoire du projet : `cd /opt/zezepagnon` (adapter selon installation)

---

## 1. Vérification avant migration

```bash
# Vérifier l'état des conteneurs
sudo docker compose -f docker-compose.prod.yml ps

# Vérifier les migrations déjà appliquées
sudo docker compose -f docker-compose.prod.yml exec backend \
  npx sequelize-cli db:migrate:status

# Vérifier les migrations en attente (celles qui ne sont PAS "up")
# Tout ce qui est "down" sera appliqué à l'étape 5
```

---

## 2. Sauvegarde de la base de données

**Toujours effectuer une sauvegarde avant toute migration.**

```bash
# Créer le dossier de sauvegardes si absent
mkdir -p /opt/backups/zezepagnon

# Dump complet (remplacer YYYYMMDD par la date du jour)
sudo docker exec zezepagnon_db \
  mysqldump \
    -u root \
    -p"${DB_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    zezepagnon_prod \
  > /opt/backups/zezepagnon/backup_YYYYMMDD_avant_migration.sql

# Vérifier que le dump n'est pas vide
wc -l /opt/backups/zezepagnon/backup_YYYYMMDD_avant_migration.sql
# Doit afficher plusieurs milliers de lignes
```

> Si `DB_ROOT_PASSWORD` n'est pas exporté dans votre session shell, le remplacer manuellement
> par la valeur du `.env` (variable `DB_ROOT_PASSWORD`).

---

## 3. Récupération du code

```bash
# Voir ce qui va changer
git fetch origin main
git log HEAD..origin/main --oneline

# Récupérer le code
git pull origin main
```

---

## 4. Reconstruction des images Docker

```bash
sudo docker compose -f docker-compose.prod.yml build
```

---

## 5. Redémarrage et application des migrations

```bash
# Redémarrer les services avec les nouvelles images
sudo docker compose -f docker-compose.prod.yml up -d

# Attendre que le backend soit prêt (10-20 secondes)
sudo docker compose -f docker-compose.prod.yml logs -f backend
# Ctrl+C quand "Serveur démarré" apparaît

# Appliquer les migrations
sudo docker compose -f docker-compose.prod.yml exec backend \
  npx sequelize-cli db:migrate
```

La sortie attendue ressemble à :

```
== 20260422022-create-fichiers-patient: migrating =======
== 20260422022-create-fichiers-patient: migrated (0.123s)
== 20260425024-create-exercices: migrating =======
== 20260425024-create-exercices: migrated (0.456s)
```

Si la sortie affiche `No migrations were executed` : toutes les migrations étaient déjà appliquées, c'est normal.

---

## 6. Vérification post-migration

```bash
# État final des migrations (tout doit être "up")
sudo docker compose -f docker-compose.prod.yml exec backend \
  npx sequelize-cli db:migrate:status

# Vérifier les tables créées par les dernières migrations
sudo docker exec zezepagnon_db \
  mysql -u root -p"${DB_ROOT_PASSWORD}" zezepagnon_prod \
  -e "SHOW TABLES;"

# Vérifier les logs backend (aucune erreur au démarrage)
sudo docker compose -f docker-compose.prod.yml logs --tail=50 backend

# Vérifier que l'API répond
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
# Doit retourner 200
```

---

## 7. Plan de rollback

En cas d'erreur après les migrations :

### 7a. Annuler la dernière migration Sequelize

```bash
# Annuler UNE migration (la dernière appliquée)
sudo docker compose -f docker-compose.prod.yml exec backend \
  npx sequelize-cli db:migrate:undo

# Annuler plusieurs migrations une par une si nécessaire
# (répéter la commande autant de fois que de migrations à défaire)
```

### 7b. Restaurer le dump si le rollback Sequelize échoue

```bash
# Arrêter le backend pendant la restauration
sudo docker compose -f docker-compose.prod.yml stop backend

# Restaurer le dump
sudo docker exec -i zezepagnon_db \
  mysql -u root -p"${DB_ROOT_PASSWORD}" zezepagnon_prod \
  < /opt/backups/zezepagnon/backup_YYYYMMDD_avant_migration.sql

# Revenir sur le commit précédent
git log --oneline -5        # identifier le bon commit
git checkout <commit-hash>  # revenir dessus

# Reconstruire et redémarrer
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d
```

---

## 8. Variables d'environnement requises (fichier `.env`)

Le fichier `.env` doit être présent à la racine du projet.  
Ne jamais versionner ce fichier. Modèle :

```env
# Base de données
DB_ROOT_PASSWORD=<mot_de_passe_root_mariadb>
DB_NAME=zezepagnon_prod
DB_USER=zeze_user
DB_PASSWORD=<mot_de_passe_utilisateur_db>

# JWT — minimum 32 caractères chacun
JWT_SECRET=<chaine_aleatoire_64_chars>
JWT_REFRESH_SECRET=<chaine_aleatoire_64_chars>

# Application
FRONTEND_URL=https://votre-domaine.com
APP_URL=https://votre-domaine.com
NODE_ENV=production
```

Générer des secrets JWT :
```bash
openssl rand -hex 32   # copier-coller deux fois (JWT_SECRET et JWT_REFRESH_SECRET)
```

---

## 9. Migrations existantes (référence)

| N° | Fichier | Objet |
|----|---------|-------|
| 001–015 | (base initiale) | Patients, consultations, ordonnances, factures, stocks, utilisateurs |
| 016 | `update-parametres-commission` | Taux de commission délégués |
| 017 | `create-stock-delegue` | Table stock_delegue |
| 018 | `create-mouvements-delegue` | Table mouvements_delegue |
| 019 | `add-gain-delegue-to-mouvements` | Champ gain_delegue |
| 020 | `add-statut-mouvements-delegue` | Champ statut sur mouvements |
| 021 | `add-nom-cabinet-to-users` | Champ nom_cabinet |
| 022 | `create-fichiers-patient` | Table fichiers_patient (uploads) |
| 023 | `create-analyses-nfs` | Table analyses_nfs |
| 024 | `create-exercices` | Table exercices (comptabilité MAPA) |
| 025 | `add-exercice-id-to-ventes` | Lien ordonnances → exercice |

---

## 10. Commandes utiles en production

```bash
# Voir les logs en temps réel
sudo docker compose -f docker-compose.prod.yml logs -f

# Redémarrer un seul service
sudo docker compose -f docker-compose.prod.yml restart backend

# Ouvrir un shell dans le conteneur backend
sudo docker compose -f docker-compose.prod.yml exec backend sh

# Ouvrir un shell MySQL
sudo docker exec -it zezepagnon_db \
  mysql -u root -p"${DB_ROOT_PASSWORD}" zezepagnon_prod

# Nettoyage des anciennes images après mise à jour
sudo docker image prune -f
```
