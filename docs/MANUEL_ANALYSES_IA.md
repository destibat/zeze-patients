# Manuel — Analyses biologiques par IA et gestion de la clé Anthropic

**Application :** ZEZEPAGNON Dossiers Patients  
**Public :** Administrateurs de cabinet, médecins  
**Mise à jour :** Juin 2026

---

## Sommaire

1. [Présentation de la fonctionnalité IA](#1-présentation)
2. [Qui peut utiliser l'IA ?](#2-permissions)
3. [Réaliser une analyse IA](#3-réaliser-une-analyse-ia)
   - 3a. Saisie manuelle des valeurs
   - 3b. Upload d'un document (PDF, image)
4. [Comprendre le rapport IA](#4-comprendre-le-rapport-ia)
5. [Valider une analyse](#5-valider-une-analyse)
6. [Quotas mensuels](#6-quotas-mensuels)
7. [Gestion de la clé API Anthropic](#7-gestion-de-la-clé-api-anthropic)
   - 7a. Configurer une clé personnalisée
   - 7b. Remplacer ou supprimer la clé
   - 7c. Pourquoi configurer sa propre clé ?
8. [Résolution des problèmes courants](#8-résolution-des-problèmes-courants)

---

## 1. Présentation

L'analyse IA de ZEZEPAGNON permet d'obtenir une **interprétation médicale automatisée** des résultats d'analyses biologiques d'un patient. Elle est propulsée par **Claude** (Anthropic), un modèle d'intelligence artificielle de niveau médical avancé.

L'IA joue le rôle d'un médecin biologiste : elle lit les valeurs, détecte les anomalies, propose des hypothèses cliniques et formule des recommandations — le tout en français, structuré en 7 sections.

> **Important :** L'interprétation IA est un outil d'aide à la décision. Elle ne remplace pas l'avis d'un médecin qualifié et doit être validée avant d'être communiquée au patient.

---

## 2. Permissions

L'accès à l'IA est contrôlé à deux niveaux :

| Niveau | Description |
|--------|-------------|
| **Par utilisateur** | L'administrateur peut activer ou désactiver l'accès IA pour chaque compte (Paramètres → Utilisateurs) |
| **Par cabinet** | Un quota mensuel limite le nombre total d'analyses IA (par défaut : 100/mois) |

Un utilisateur voit le bouton IA grisé si :
- Son compte n'a pas la permission IA activée, **ou**
- Le quota mensuel du cabinet est épuisé

---

## 3. Réaliser une analyse IA

### Accès

1. Ouvrir la fiche d'un patient
2. Aller dans l'onglet **Analyses biologiques**
3. Cliquer sur **Nouvelle analyse**

---

### 3a. Saisie manuelle des valeurs

Utilisez ce mode quand vous avez les résultats sous forme numérique et souhaitez les saisir panel par panel.

**Étapes :**
1. Sélectionner les panels concernés (NFS, Bilan rénal, Glycémie, etc.)
2. Renseigner les valeurs dans les champs correspondants
3. Indiquer la date de l'analyse, le sexe et l'âge du patient (pour affiner les normes de référence)
4. Cliquer sur **Analyser avec l'IA** — le rapport est généré en 30 à 60 secondes

---

### 3b. Upload d'un document (PDF ou image)

Utilisez ce mode quand vous avez le compte-rendu du laboratoire en format numérique (scan, photo, PDF).

**Étapes :**
1. Cliquer sur la zone de dépôt ou glisser-déposer le fichier
2. L'application extrait automatiquement les valeurs biologiques (si le format le permet)
3. Vérifier les valeurs extraites dans l'aperçu
4. Choisir :
   - **Analyse locale** : enregistre sans passer par l'IA
   - **Analyser avec l'IA** : envoie les valeurs ET le document original à Claude

> **Formats acceptés :** PDF, PNG, JPEG — jusqu'à 15 Mo par fichier — plusieurs fichiers possibles (ex. ECG + bilan sanguin)

> **Note PDF :** Le texte des PDFs est extrait et transmis à l'IA. Les images dans les PDFs (graphiques ECG) sont également transmises si leur taille le permet.

---

## 4. Comprendre le rapport IA

Le rapport est structuré en **7 sections** :

| Section | Contenu |
|---------|---------|
| **1. Analyse détaillée** | Tableau des paramètres avec valeurs, normes et statut (Normal / ↑ Augmenté / ↓ Diminué…) |
| **2. Anomalies identifiées** | Liste des valeurs hors normes avec explication biologique |
| **3. Interprétation médicale** | Liens entre anomalies, hypothèses diagnostiques |
| **4. Synthèse globale** | État général du patient : NORMAL / À SURVEILLER / PRÉOCCUPANT |
| **5. Explication patient** | Reformulation en langage simplifié, sans jargon médical |
| **6. Recommandations** | Examens complémentaires, conseils hygiéno-diététiques, urgence de consultation |
| **7. Précaution médicale** | Rappel obligatoire que l'IA ne remplace pas un médecin |

Le rapport est téléchargeable en **PDF** ou **Word (.docx)** depuis la fiche d'analyse.

---

## 5. Valider une analyse

Une fois l'analyse IA générée, le médecin peut apposer sa **validation** :

1. Ouvrir la carte d'analyse
2. Cliquer sur **Valider l'analyse**
3. La validation est horodatée et signée du nom du médecin connecté

La validation apparaît dans le rapport PDF sous forme de badge vert :
> *Validé par le médecin le [date]*

> Une analyse non validée reste interne — elle n'est pas destinée à être remise au patient dans cet état.

---

## 6. Quotas mensuels

Chaque cabinet dispose d'un **quota d'analyses IA par mois** (défini par l'administrateur ZEZEPAGNON).

**Visualiser la consommation :**
- Paramètres → section **Consommation IA** — affiche le nombre d'analyses, le coût estimé, les 10 dernières analyses et le graphique des 30 derniers jours

**Indicateur en temps réel :**
- Sur chaque carte d'analyse, le compteur `X/Y ce mois` est visible à côté du bouton IA

**Quand le quota est épuisé :**
- Le bouton IA est remplacé par un message : *"Quota IA mensuel atteint"*
- Les analyses locales (sans IA) restent disponibles
- Contactez ZEZEPAGNON pour augmenter le quota

---

## 7. Gestion de la clé API Anthropic

### Qu'est-ce que la clé API ?

La clé API est le code d'authentification qui autorise l'application à appeler l'IA d'Anthropic (Claude). Sans clé valide, les analyses IA sont impossibles.

Par défaut, la clé est gérée par ZEZEPAGNON au niveau du serveur. Un cabinet peut configurer sa propre clé pour :
- Utiliser son propre compte Anthropic (et donc sa propre facturation)
- Avoir une clé indépendante des autres cabinets
- Contrôler directement ses dépenses IA sur [console.anthropic.com](https://console.anthropic.com)

---

### 7a. Configurer une clé personnalisée

**Prérequis :** Avoir un compte sur [console.anthropic.com](https://console.anthropic.com) et avoir généré une clé API.

**Format d'une clé Anthropic :** `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx...`

**Étapes dans l'application :**

1. Se connecter en tant qu'**administrateur**
2. Aller dans **Paramètres**
3. Section **Clé API Anthropic** → saisir la clé dans le champ
4. Cliquer sur **Enregistrer la clé**

La clé est immédiatement active. La section affiche :
> ● Clé personnalisée active — `sk-ant-api•••••••••••XXXX`

> **Sécurité :** La clé est stockée dans la base de données du cabinet. Elle n'est jamais affichée en clair dans l'interface — seuls les 4 derniers caractères sont visibles.

---

### 7b. Remplacer ou supprimer la clé

**Remplacer :** Saisir la nouvelle clé dans le champ et cliquer sur **Enregistrer**. L'ancienne est écrasée.

**Supprimer :** Cliquer sur le bouton **Supprimer** à côté de la clé masquée. L'application revient automatiquement sur la clé serveur de ZEZEPAGNON.

---

### 7c. Pourquoi configurer sa propre clé ?

| Situation | Recommandation |
|-----------|---------------|
| Cabinet en phase de démarrage | Utiliser la clé serveur ZEZEPAGNON (incluse dans l'abonnement) |
| Cabinet avec usage IA intensif (> 200 analyses/mois) | Configurer une clé personnalisée pour maîtriser les coûts directement |
| Cabinet souhaitant une traçabilité indépendante | Clé personnalisée — les logs sont visibles dans la console Anthropic |
| Quota mensuel dépassé | Contacter ZEZEPAGNON pour l'augmenter, ou configurer sa propre clé |

**Tarifs Anthropic indicatifs (Claude Sonnet, juin 2026) :**
- Input : ~$3 / million de tokens
- Output : ~$15 / million de tokens
- Coût moyen par analyse biologique : $0,02 à $0,08 selon la complexité

---

## 8. Résolution des problèmes courants

### "Quota IA mensuel atteint"
Le cabinet a consommé toutes les analyses autorisées ce mois-ci.  
→ Contacter ZEZEPAGNON pour augmenter le quota, ou configurer sa propre clé API.

### "Clé API Anthropic non configurée"
Aucune clé n'est disponible (ni en DB, ni dans la configuration serveur).  
→ Contacter ZEZEPAGNON, ou configurer une clé dans Paramètres.

### "Format invalide — la clé doit commencer par sk-ant-"
La clé saisie n'est pas au bon format.  
→ Vérifier que vous copiez bien la clé depuis [console.anthropic.com](https://console.anthropic.com) → API Keys → copier la clé complète.

### L'analyse IA tourne longtemps puis échoue
Causes possibles : fichier trop lourd, connexion instable, quota Anthropic API dépassé.  
→ Réessayer avec un fichier plus léger (< 5 Mo), ou en saisie manuelle sans fichier.

### Le bouton IA n'apparaît pas
L'accès IA n'est pas activé pour votre compte.  
→ Demander à l'administrateur du cabinet d'activer la permission IA dans votre fiche utilisateur (Paramètres → Utilisateurs → votre compte → activer "Accès analyse IA").

### L'analyse IA est disponible mais le rapport semble incomplet
L'IA génère un rapport sur la base des données transmises. Si peu de valeurs ont été saisies ou extraites, le rapport sera moins détaillé.  
→ Compléter les valeurs manquantes en saisie manuelle, ou fournir un document de meilleure qualité.

---

*Document interne ZEZEPAGNON — Dossiers Patients v1.0*
