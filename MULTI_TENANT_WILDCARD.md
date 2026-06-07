# Multi-tenant — Situation et plan d'action

## Situation actuelle

### Subdomaines existants
| Sous-domaine | Rôle | Backend actuel |
|---|---|---|
| `dev.zezepagnon.solutions` | Dev | `unified_backend` ✅ |
| `patients.zezepagnon.solutions` | Prod | `zezepagnon_backend` (ancienne stack) |
| `alice.zezepagnon.solutions` | Prod | `alice_backend` (ancienne stack) |
| `cisse.zezepagnon.solutions` | Prod | `cisse_backend` (ancienne stack) |

### Problème pour tester le multi-tenant en dev

Pour vérifier l'isolation (cabinet A ne voit pas les données de cabinet B),
il faut **deux sous-domaines accessibles** pointant sur le même `unified_backend`.

Actuellement seul `dev.zezepagnon.solutions` pointe sur `unified_backend`.
Les domaines alice et cisse pointent sur les **anciennes stacks de prod** — on
ne peut pas les toucher.

---

## Options

### Option 1 — Deux nouveaux sous-domaines de test (recommandé à court terme)

Créer 2 entrées DNS dans GoDaddy :

```
dev-a.zezepagnon.solutions  →  212.129.48.6
dev-b.zezepagnon.solutions  →  212.129.48.6
```

Je gère ensuite automatiquement :
- Certificats SSL (certbot HTTP-01, comme les autres)
- Blocs nginx → `unified_backend`
- Cabinets en base (INSERT)
- Comptes admin de test

**Avantage** : rapide, simple, production intacte.  
**Inconvénient** : 2 entrées DNS manuelles de plus (mais c'est la dernière fois).

---

### Option 2 — Wildcard DNS (recommandé à long terme)

#### Ce qu'il faut faire dans GoDaddy

Remplacer les 4 entrées A individuelles par **une seule entrée wildcard** :

```
*   A   212.129.48.6   (TTL 600)
```

> Les 4 sous-domaines existants continuent de fonctionner — une entrée
> wildcard couvre TOUS les sous-domaines, y compris patients, alice, cisse, dev.

#### Ce que je configure côté serveur

1. **Certificat SSL wildcard** via certbot + plugin GoDaddy
   - Nécessite une clé API GoDaddy (voir ci-dessous)
   - Renouvellement automatique (cron)

2. **Un seul bloc nginx** pour tous les sous-domaines :
   ```nginx
   server_name ~^(?<slug>.+)\.zezepagnon\.solutions$;
   set $backend unified_backend;
   set $frontend unified_frontend;
   ```

3. **Ajout d'un cabinet = 1 ligne SQL**, rien d'autre :
   ```sql
   INSERT INTO cabinets (slug, domaine, nom)
   VALUES ('konan', 'konan.zezepagnon.solutions', 'Cabinet Konan');
   ```

#### Clé API GoDaddy

Se créer sur : https://developer.godaddy.com/keys  
(compte GoDaddy → Developer → API Keys → Create New App)

Deux valeurs à récupérer : `OTE_API_KEY` et `OTE_API_SECRET` (ou prod).

---

## Recommandation

```
Court terme  →  Option 1 (2 sous-domaines de test)
               Tu crées les 2 entrées DNS dans GoDaddy
               Je fais le reste (SSL + nginx + DB)

Long terme   →  Option 2 (wildcard)
               Tu crées la clé API GoDaddy
               Je configure tout côté serveur
               Plus jamais de manipulation DNS/SSL pour un nouveau cabinet
```

Les deux options sont compatibles : on fait l'option 1 maintenant pour
valider le multi-tenant en dev, et l'option 2 avant d'ouvrir de nouveaux
cabinets en production.

---

## Ce qu'on attend de toi

**Pour Option 1 (immédiat) :**
- Créer dans GoDaddy :
  - `dev-a.zezepagnon.solutions`  → A → `212.129.48.6`
  - `dev-b.zezepagnon.solutions`  → A → `212.129.48.6`
- Me confirmer quand c'est fait → je prends la suite

**Pour Option 2 (wildcard) :**
- Créer une clé API sur https://developer.godaddy.com/keys
- Me donner la clé (`key:secret`) → je configure le serveur
