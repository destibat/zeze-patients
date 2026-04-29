# Plan Multi-Cabinets — Option A (déploiements séparés)

## Contexte

L'application ZEZEPAGNON Dossiers Patients est actuellement mono-cabinet
(`patients.zezepagnon.solutions`). L'objectif est d'héberger 3 cabinets
indépendants sur le même serveur, avec isolation totale des données.

Cabinets prévus :
- `patients.zezepagnon.solutions` — cabinet ZezePagnon (existant)
- `cisse.zezepagnon.solutions` — cabinet Cisse (nouveau)
- `alice.zezepagnon.solutions` — cabinet Alice (nouveau)

---

## Architecture cible

```
Internet (ports 80 / 443)
         │
   [Nginx partagé]          ← un seul conteneur, gère tous les sous-domaines
         │
  ┌──────┼──────────────────────┐
  │      │                      │
patients  cisse               alice
         │
[Stack patients]   [Stack cisse]   [Stack alice]
  db_patients        db_cisse        db_alice
  backend_patients   backend_cisse   backend_alice
  frontend_patients  frontend_cisse  frontend_alice
```

Chaque cabinet dispose de :
- Sa propre base MariaDB (isolation totale des données)
- Son propre conteneur backend Node.js
- Son propre conteneur frontend Nginx (build Vite)
- Son propre fichier `.env` (secrets, credentials, sous-domaine)

Un seul Nginx partagé gère le routage par sous-domaine avec SSL Let's Encrypt.

---

## Fichiers à créer / modifier

### Nouveaux fichiers
| Fichier | Rôle |
|---|---|
| `docker-compose.nginx.yml` | Stack Nginx partagé (remplace le nginx dans le compose patients) |
| `docker-compose.cisse.yml` | Stack cabinet Cisse (db + backend + frontend) |
| `docker-compose.alice.yml` | Stack cabinet Alice (db + backend + frontend) |
| `nginx/nginx.conf` (modifié) | 3 server blocks SSL (patients, cisse, alice) |
| `.env.cisse` | Variables d'environnement cabinet Cisse |
| `.env.alice` | Variables d'environnement cabinet Alice |

### Fichiers modifiés
| Fichier | Modification |
|---|---|
| `docker-compose.prod.yml` | Retirer le service nginx, ajouter réseau externe `zeze_proxy` |

---

## Étapes d'implémentation

### Étape 1 — Réseau Docker partagé
```bash
sudo docker network create zeze_proxy
```

### Étape 2 — Extraire le Nginx dans son propre compose
Créer `docker-compose.nginx.yml` avec le service nginx seul,
branché sur le réseau externe `zeze_proxy`.

### Étape 3 — Modifier docker-compose.prod.yml (patients)
- Supprimer le service `nginx`
- Ajouter le réseau externe `zeze_proxy` sur `backend` et `frontend`
- Redémarrer la stack patients

### Étape 4 — Mettre à jour nginx.conf
Ajouter les server blocks pour `cisse` et `alice` avec SSL.

### Étape 5 — Obtenir les certificats SSL
```bash
sudo certbot certonly --nginx -d cisse.zezepagnon.solutions
sudo certbot certonly --nginx -d alice.zezepagnon.solutions
```

### Étape 6 — Créer les stacks cisse et alice
- `docker-compose.cisse.yml` (même modèle que prod, sans nginx, réseau zeze_proxy)
- `.env.cisse` avec ses propres secrets et credentials DB
- Idem pour alice

### Étape 7 — Démarrer les nouveaux cabinets
```bash
sudo docker compose -f docker-compose.cisse.yml --env-file .env.cisse up -d --build
sudo docker compose -f docker-compose.alice.yml --env-file .env.alice up -d --build
```

### Étape 8 — Créer le compte admin initial de chaque cabinet
Via une commande Node.js ou un script SQL directement dans le conteneur DB.

---

## Variables d'environnement par cabinet

Chaque `.env.xxx` contient :
```env
DB_ROOT_PASSWORD=...   # unique par cabinet
DB_NAME=zezepagnon_xxx
DB_USER=zeze_xxx
DB_PASSWORD=...        # unique par cabinet
JWT_SECRET=...         # unique par cabinet
JWT_REFRESH_SECRET=... # unique par cabinet
FRONTEND_URL=https://xxx.zezepagnon.solutions
```

---

## Migration vers Option B (multi-tenant) — future étape

Si le nombre de cabinets dépasse ~10, une migration vers une architecture
multi-tenant (un seul déploiement, tous les cabinets dans la même DB avec
`cabinet_id`) sera envisagée. Les données de chaque cabinet seront migrées
vers un `cabinet_id` unique sans perte.

---

## État d'avancement

- [ ] Étape 1 — Réseau Docker partagé
- [ ] Étape 2 — docker-compose.nginx.yml
- [ ] Étape 3 — Modifier docker-compose.prod.yml
- [ ] Étape 4 — nginx.conf mis à jour
- [ ] Étape 5 — SSL cisse + alice
- [ ] Étape 6 — docker-compose.cisse.yml + docker-compose.alice.yml
- [ ] Étape 7 — Démarrage des stacks
- [ ] Étape 8 — Comptes admin initiaux
