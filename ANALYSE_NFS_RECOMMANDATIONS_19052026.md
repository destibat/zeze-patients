# Analyse NFS — Recommandations techniques
**Date** : 19 mai 2026  
**Auteur** : Claude Sonnet 4.6 (analyse sur demande d'Alexis Brevet)

---

## 1. État actuel de la NFS dans le code

La fonctionnalité NFS existe déjà partiellement. Ce n'est pas un départ de zéro.

### Ce qui est déjà implémenté
| Fichier | Contenu | Lignes |
|---|---|---|
| `database/migrations/20260422023-create-analyses-nfs.js` | Table `analyses_nfs` complète (série rouge, blanche, plaquettes) | — |
| `backend/src/controllers/analyseNFSController.js` | Controller CRUD | 127 |
| `backend/src/services/extractionNFSService.js` | Extraction OCR (Tesseract + regex) | 95 |
| `frontend/src/pages/patients/components/SectionAnalyseNFS.jsx` | Composant UI | 465 |
| `frontend/src/hooks/useAnalysesNFS.js` | Hook React Query | — |
| `frontend/src/utils/interpretationNFS.js` | Interprétation des valeurs | — |

### Ce qui manque pour atteindre la vision du document `IDEES_ANALYSE_NFS_06052026.md`
- Support multi-panels (Rénal, Glycémie, Lipidique, Ionogramme)
- Intégration IA (Claude API) pour l'analyse interprétée
- Configuration de la clé API par cabinet (chiffrée AES-256)
- Upload PDF/image avec extraction automatique améliorée
- Anonymisation systématique avant envoi à l'IA
- Disclaimer médical obligatoire
- Suivi de consommation et alertes budget

---

## 2. Multi-tenant avant ou après la NFS ?

### La question
Le document `IDEES_ANALYSE_NFS_06052026.md` mentionne un champ `cabinet_id` dans les nouvelles tables (`analyses_biologiques`, `cabinets_config_ia`). Faut-il implémenter le multi-tenant d'abord pour pouvoir démarrer la NFS ?

### Réponse : Non. La NFS peut démarrer maintenant.

**Raisonnement :**

Dans l'architecture actuelle, chaque déploiement Docker (alice, cisse, patients) **est** un cabinet. Il n'existe pas de table `cabinets` dans la base de données — et il n'en a pas besoin pour l'instant.

Conséquence pratique :
- La table de configuration IA s'appellera `config_ia` (sans `cabinet_id`, une seule ligne par déploiement)
- La table `analyses_biologiques` n'aura pas de `cabinet_id` non plus
- Quand le multi-tenant arrivera, on ajoutera `cabinet_id` en migration (exactement comme on a ajouté `devise` aux utilisateurs)

Ce n'est pas une dette technique lourde. C'est une colonne à ajouter plus tard.

### Comparaison des deux scénarios

| | Multi-tenant d'abord | NFS d'abord |
|---|---|---|
| Valeur immédiate pour les médecins | ✗ | ✓ |
| Complexité | Très élevée (réécriture partielle) | Modérée (extension de l'existant) |
| Risque pour la prod actuelle | Élevé | Faible |
| Durée avant première livraison | 6-8 semaines | 1-2 semaines |
| Impact sur la NFS | Retarde inutilement | Neutre |

**Verdict : NFS d'abord. Le multi-tenant peut attendre.**

---

## 3. Plan d'implémentation recommandé

### Phase 1 — Refonte des fondations *(3-4 jours)*
- Créer la nouvelle table `analyses_biologiques` multi-panels en JSON
  - Remplace progressivement `analyses_nfs` (migration des données existantes)
  - Panels : NFS, Rénal, Glycémie, Lipidique, Ionogramme
- UI avec checkboxes pour sélectionner les panels
- Saisie manuelle structurée selon les panels cochés
- Tests sans IA (validation du modèle de données)

### Phase 2 — Configuration IA cabinet *(2-3 jours)*
- Table `config_ia` (sans `cabinet_id`) avec chiffrement AES-256
- Variable d'environnement `IA_ENCRYPTION_KEY` sur chaque serveur
- Page admin *"Paramètres → Configuration IA"* :
  - Saisie et test de la clé API Anthropic
  - Choix du modèle (Sonnet = qualité / Haiku = économie)
  - Limite quotidienne d'analyses
  - Budget mensuel maximum

### Phase 3 — Analyse IA depuis saisie manuelle *(3-4 jours)*
- Endpoint backend `/api/analyses-bio/analyser`
- Construction du prompt structuré par panel(s)
- Anonymisation côté backend (nom/prénom/dossier retirés avant envoi)
- Récupération de la clé API chiffrée et appel Claude
- Affichage du rapport avec disclaimer médical obligatoire
- Validation explicite du médecin avant enregistrement
- Stockage des tokens consommés et coût estimé

### Phase 4 — Upload PDF/image + extraction *(4-5 jours)*
- Upload de fichiers (PDF, JPEG, PNG)
- Stratégie d'extraction à décider après tests réels :
  - Option A : Tesseract (existant, gratuit, local) + amélioration regex
  - Option B : Claude Vision directement sur l'image
  - Option C : Hybride (Tesseract d'abord, Claude si confiance faible)
- Formulaire de validation/correction par le médecin avant analyse IA
- ⚠️ **Point de risque** : les formats de résultats des labos ivoiriens sont hétérogènes. Tester tôt avec de vrais documents avant de choisir l'approche.

### Phase 5 — Reporting et optimisations *(2-3 jours)*
- Page suivi de consommation (analyses/jour, coût/mois)
- Alertes budget par email si dépassement
- Export PDF des analyses validées
- Permissions par utilisateur (autoriser/restreindre l'IA)

---

## 4. Durée totale estimée

**3 à 4 semaines** de développement, probablement vers 3 semaines vu la base existante.

La fourchette haute (4 semaines) dépend surtout de :
- La qualité de l'OCR sur les documents réels (Phase 4)
- Les itérations sur le prompt IA pour obtenir des analyses de qualité médicale

Les Phases 1 et 2 peuvent être développées en local et validées sur dev pendant que la prod reste stable — sans risque.

---

## 5. Prérequis à vérifier avant de démarrer

| Prérequis | État |
|---|---|
| Bugs dashboard/commissions corrigés | ✅ Fait (déployé en prod le 18/05/2026) |
| App stable en production | ⏳ Récent — surveiller 2-3 semaines |
| Clé API Anthropic dédiée pour les tests | ❓ À créer sur console.anthropic.com |
| Modèle "cabinet" clarifié dans le code | ✅ Clarifié ci-dessus : stockiste = cabinet |
| Plan de test pilote avec médecins ZEZEPAGNON | ❓ À organiser |

---

## 6. Points de vigilance importants

1. **OCR variable selon les labos** — tester rapidement avec de vrais résultats ivoiriens. C'est le risque technique principal du projet.

2. **Coût d'analyse des images** — Claude Vision coûte ~4× plus qu'une analyse texte. Utiliser Haiku par défaut pour les uploads, Sonnet sur demande.

3. **Validation médecin obligatoire** — aucune analyse ne doit être "officielle" sans confirmation explicite. Badge visuel différencié : orange (non validé) / vert (validé).

4. **Audit trail** — logger chaque appel IA (qui, quand, quel panel, quel coût) pour traçabilité médico-légale. Le payload logué doit être anonymisé.

5. **Disponibilité de l'API Anthropic** — prévoir un fallback propre si l'API est indisponible. Ne jamais bloquer le reste de l'application.

6. **Sécurité des clés** — la clé API ne doit jamais apparaître en clair dans les logs, les réponses API ou le code source.

---

## 7. Modèle économique recommandé pour démarrer

**Scénario 1 : inclus dans l'abonnement de base**
- Chaque cabinet configure et paie sa propre clé API Anthropic (transparent)
- ZEZEPAGNON ne porte aucun risque financier
- Argument commercial fort : "IA médicale incluse"
- Coût estimé pour un cabinet de 5 médecins : **5 à 20 USD/mois** selon usage

Évoluer vers une offre premium ou une clé maître ZEZEPAGNON uniquement si la demande le justifie.

---

## 8. Recommandation finale

**Démarrer la NFS maintenant, Phase 1 en premier.**

La valeur médicale est immédiate et concrète. La base technique est là. Le multi-tenant ne bloque rien et peut être traité dans 2-3 mois sans surcoût significatif.

La seule vraie incertitude est la qualité de l'OCR sur les formats locaux — mais ça se teste tôt, en Phase 4, après que les Phases 1-3 soient stables.
