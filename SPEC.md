# Description de l'application — ZEZEPAGNON Dossiers Patients

**Version 2.0 — Mai 2026**
Marque : *ZEZEPAGNON — La richesse des plantes africaines au service du bien-être*
Entité : *Maître Racine d'Afrique — ZEZEPAGNON Stockiste Alexis Brevet*
Localisation : Abidjan, Côte d'Ivoire

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Système de rôles et permissions](#2-système-de-rôles-et-permissions)
3. [Module — Authentification](#3-module--authentification)
4. [Module — Tableau de bord](#4-module--tableau-de-bord)
5. [Module — Patients](#5-module--patients)
6. [Module — Consultations](#6-module--consultations)
7. [Module — Ordonnances](#7-module--ordonnances)
8. [Module — Analyses NFS](#8-module--analyses-nfs)
9. [Module — Fichiers patients](#9-module--fichiers-patients)
10. [Module — Rendez-vous](#10-module--rendez-vous)
11. [Module — Facturation](#11-module--facturation)
12. [Module — Stock central](#12-module--stock-central)
13. [Module — Stock délégué](#13-module--stock-délégué)
14. [Module — Exercices comptables MAPA](#14-module--exercices-comptables-mapa)
15. [Module — Prêts et emprunts](#15-module--prêts-et-emprunts)
16. [Module — Statistiques](#16-module--statistiques)
17. [Module — Administration](#17-module--administration)
18. [Charte graphique](#18-charte-graphique)
19. [Multi-tenant](#19-multi-tenant)

---

## 1. Présentation générale

**ZEZEPAGNON Dossiers Patients** est une application web de gestion médicale et commerciale destinée aux cabinets du réseau MAPA (pharmacopée africaine). Elle couvre l'intégralité du cycle de vie d'un patient et d'un exercice commercial.

### Objectifs

- Centraliser les dossiers patients de façon sécurisée et accessible depuis n'importe quel navigateur
- Faciliter le travail quotidien du médecin, du stockiste, des délégués et de la secrétaire
- Automatiser la génération d'ordonnances (PDF) et le suivi des factures en FCFA
- Permettre l'analyse assistée des résultats NFS (OCR + comparaison aux normes)
- Gérer le stock de produits ZEZEPAGNON et les ventes des délégués commerciaux
- Produire les bilans d'exercice MAPA avec calcul automatique des commissions

### Caractéristiques techniques

- Application web responsive (navigateur desktop et mobile)
- Architecture SPA React + API REST Express + MariaDB
- Multi-tenant : plusieurs cabinets sur le même serveur, bases de données séparées
- Déploiement Docker sur serveur Debian, HTTPS via Let's Encrypt

---

## 2. Système de rôles et permissions

L'application définit **4 rôles** avec des accès distincts.

### Administrateur

- Accès complet à toutes les fonctionnalités
- Seul à pouvoir : gérer les utilisateurs, rouvrir un exercice clôturé, accéder aux statistiques, configurer les paramètres du cabinet

### Stockiste

- Responsable commercial d'une zone géographique
- Accès : patients, consultations, ordonnances, facturation, stock central, stock délégué (validation), exercices, bilans, prêts/emprunts
- Ne peut pas : gérer les utilisateurs, configurer les paramètres, voir les statistiques globales, rouvrir un exercice

### Délégué

- Commercial terrain rattaché à un stockiste
- Accès : patients (les siens), consultations, ordonnances directes, son stock personnel, ses ventes, son bilan, rendez-vous, facturation
- Ne peut pas : gérer le stock central, voir les exercices globaux, consulter les analyses NFS, visualiser les fichiers

### Secrétaire

- Support administratif
- Accès : patients, rendez-vous, facturation, stock (lecture seule)
- Ne peut pas : consultations médicales, ordonnances, stock (écriture), exercices, statistiques

---

## 3. Module — Authentification

### Connexion

- Authentification par e-mail et mot de passe
- Tokens JWT : access token (15 min) + refresh token (7 jours, HttpOnly cookie)
- Renouvellement automatique transparent pour l'utilisateur
- Déconnexion avec invalidation du refresh token côté serveur

### Première connexion

- À la création du compte, l'administrateur définit un mot de passe provisoire
- À la première connexion, l'application force le changement de mot de passe
- Le nouveau mot de passe doit faire au moins 8 caractères

### Sécurité

- Hachage bcrypt (coût 12)
- Rate limiting sur les endpoints d'authentification
- Audit log de chaque connexion et action critique

---

## 4. Module — Tableau de bord

Page d'accueil après connexion, affichée pour tous les rôles.

### KPI (Administrateur / Stockiste)

- **Nombre de patients actifs** : total des dossiers non archivés
- **Consultations du mois** : consultations enregistrées sur le mois calendaire en cours
- **CA du mois** : chiffre d'affaires du mois (factures entièrement payées uniquement)
- **CA de l'exercice** : chiffre d'affaires cumulé depuis l'ouverture de l'exercice en cours

> Règle de calcul : les factures partiellement payées sont **exclues** du CA. Seules les factures au statut *payée* sont comptabilisées.

### Alertes de stock

- Liste des produits dont la quantité est inférieure au seuil d'alerte
- Lien direct vers la page Stock
- Badge rouge dans le menu latéral tant que des alertes sont actives

### Gains délégués (Admin / Stockiste)

- Récapitulatif des commissions générées par les délégués sur l'exercice en cours

### Exercice en cours

- Numéro d'exercice, date d'ouverture, durée en jours, CA cumulé
- Affiché en permanence dans la barre supérieure de l'application

---

## 5. Module — Patients

### Création d'un dossier patient

Données **obligatoires** :
- Prénom, Nom
- Sexe (Masculin / Féminin / Autre)
- Date de naissance
- Téléphone

Données **optionnelles** :
- Adresse (rue, commune, ville, pays)
- Profession
- Groupe sanguin (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Allergies (liste de tags, saisie libre)
- Antécédents médicaux personnels
- Antécédents médicaux familiaux
- Contact d'urgence (nom, téléphone, lien de parenté)
- Photo du patient (upload image)
- Numéro d'assurance / mutuelle

**Numéro de dossier** : généré automatiquement au format `ZZP-YYYY-NNNNN` (ex: `ZZP-2026-00001`). Séquentiel par année, unique, calculé en incluant les patients archivés pour éviter les doublons.

### Consultation de la fiche patient

La fiche patient rassemble toutes les informations en sections :
1. Informations personnelles + photo
2. Allergies (étiquettes colorées) et antécédents
3. Historique des consultations
4. Ordonnances
5. Fichiers joints
6. Analyses NFS

### Recherche et filtres

- Recherche en temps réel par : nom, prénom, téléphone, numéro de dossier
- Filtre par sexe
- Filtre pour afficher les patients archivés

### Archivage (soft delete)

- L'archivage masque le patient de la liste principale
- Toutes ses données sont conservées
- Un patient archivé peut être retrouvé via le filtre dédié
- Réservé aux administrateurs et stockistes

---

## 6. Module — Consultations

### Création d'une consultation

Informations enregistrées :
- Date de consultation (modifiable, par défaut aujourd'hui)
- Motif de la visite
- Symptômes observés
- Diagnostic
- Traitement prescrit et notes
- **Signes vitaux** :
  - Poids (kg), Taille (cm) → **IMC calculé automatiquement**
  - Tension artérielle systolique / diastolique (mmHg)
  - Fréquence cardiaque (bpm)
  - Température (°C)
  - Saturation en oxygène SpO₂ (%)

### Flux de travail

- Consultation créée → possibilité d'y attacher une ordonnance
- Historique chronologique des consultations dans la fiche patient
- Modification et suppression réservées aux administrateurs et stockistes

---

## 7. Module — Ordonnances

### Deux modes de création

**Mode consultation** (flux classique) :
- Depuis une consultation existante → ordonnance liée à cette consultation

**Mode direct** (sans consultation préalable) :
- Depuis la page Ordonnances → ordonnance sans consultation associée
- Utile pour les ventes directes de produits, les renouvellements simples

### Contenu d'une ordonnance

- Sélection d'un patient
- Lignes de prescription : produit, quantité, prix unitaire
- Montant total calculé automatiquement
- Statut : brouillon → validée → (annulée)

### Renouvellement

- Depuis une ordonnance existante, cliquer **Renouveler**
- Crée une **nouvelle ordonnance distincte** (brouillon) avec les mêmes produits, quantités et prix
- Modifiable avant validation

### Validation et export PDF

- Une ordonnance brouillon peut être modifiée librement
- La validation finalise l'ordonnance — elle ne peut plus être modifiée
- Export PDF avec en-tête personnalisé (logo cabinet, nom, adresse, signature)
- Les exercices non clôturés portent la mention **PROVISOIRE**

---

## 8. Module — Analyses NFS

> Réservé aux administrateurs et stockistes.

### Objectif

Permettre l'enregistrement et l'interprétation des résultats de Numération Formule Sanguine (NFS / hématologie) dans le dossier patient.

### Saisie des valeurs

**Mode manuel** : formulaire de saisie des valeurs biologiques :
- Globules rouges, globules blancs, plaquettes
- Formule leucocytaire : neutrophiles, lymphocytes, monocytes, éosinophiles, basophiles
- Hémoglobine, hématocrite, VGM, TGMH, CCMH

**Mode extraction automatique (OCR)** :
- Upload d'une image (JPG, PNG) ou d'un PDF du résultat de laboratoire
- Extraction automatique des valeurs via Tesseract.js
- Les valeurs extraites sont pré-remplies et éditables avant enregistrement

### Interprétation automatique

- Comparaison de chaque valeur aux normes de référence (selon le sexe et l'âge du patient)
- Code couleur : **Vert** (normal), **Orange** (bas/élevé), **Rouge** (critique)
- Affichage sous forme de tableau dans la fiche patient

> Il s'agit d'une aide à l'analyse. Le médecin reste seul responsable du diagnostic.

---

## 9. Module — Fichiers patients

### Upload de documents

- Formats acceptés : **PDF, JPG, JPEG, PNG, GIF**
- Taille maximale : **20 Mo par fichier**
- Catégories : résultat d'analyse, ordonnance externe, imagerie, autre
- Stockage sur volume Docker persistant, servi par Express en statique

### Visualiseur intégré

> Réservé aux administrateurs et stockistes.

Ouvre les fichiers directement dans l'application sans téléchargement :

- **PDF** : rendu via `<iframe>` (lecteur natif du navigateur avec navigation pages, zoom, recherche)
- **Images** : affichage avec zoom au scroll, panoramique par glissé, rotation gauche/droite
- Mode **plein écran** (API Fullscreen)
- Fermeture par bouton ✕ ou touche **Échap**
- Bouton de **téléchargement** toujours disponible

### Téléchargement direct

Accessible à tous les rôles via le bouton Télécharger (⬇) dans la liste des fichiers.

---

## 10. Module — Rendez-vous

### Vue calendrier

- Vue hebdomadaire par défaut, vue mensuelle disponible
- Rendez-vous du jour mis en avant
- Navigation entre les semaines/mois

### Gestion des rendez-vous

- Création : patient, date, heure, durée, motif
- Modification et suppression
- **Statuts** : Programmé → Confirmé → Honoré / Absent / Annulé

---

## 11. Module — Facturation

### Création d'une facture

- Depuis une ordonnance validée (bouton **Créer une facture**)
- La facture reprend les produits et montants de l'ordonnance

### Enregistrement des paiements

- Modes de paiement : espèces, Orange Money, MTN Mobile Money, Wave, virement bancaire, chèque
- **Paiement total** → statut *Payée* → comptabilisée dans le CA
- **Paiement partiel** → statut *Partiellement payée* → **non comptabilisée dans le CA**

### Statuts et impact comptable

| Statut | Impact CA | Impact commissions |
|--------|-----------|-------------------|
| En attente | ❌ | ❌ |
| Partiellement payée | ❌ | ❌ |
| Payée | ✅ | ✅ |
| Annulée | ❌ | ❌ |

### Tableau des créanciers

- Onglet dédié dans la page Facturation
- Liste tous les patients avec des factures impayées ou partiellement payées
- Pour chaque facture : référence, date, produits, montant total, montant payé, **restant dû**
- Bouton **Payer** pour enregistrer rapidement le solde
- Filtré par rôle : l'administrateur voit tout, le stockiste voit ses délégués + ses propres factures

### Onglets de la page Facturation

- **Factures** : liste générale
- **Gains** : répartition des commissions par commercial (admin/stockiste)
- **Relances** : suivi des impayés
- **Créanciers** : tableau des dettes patients (en_attente + partiellement_payee)
- **Délégués** : ventes des délégués avec validation

---

## 12. Module — Stock central

> Écriture réservée aux administrateurs. Lecture pour les secrétaires.

### Catalogue produits

- Nom, description, catégorie, prix unitaire (FCFA)
- Quantité en stock en temps réel
- Seuil d'alerte configurable par produit

### Mouvements de stock

- **Entrée** : réception de marchandises
- **Sortie** : livraison, casse, dépréciation
- **Ajustement** : correction d'inventaire avec motif

Chaque mouvement est tracé dans l'historique avec date, type, quantité, motif et utilisateur.

### Alertes

- Badge rouge dans le menu latéral si au moins un produit est sous le seuil
- Tableau des produits en alerte sur le dashboard

---

## 13. Module — Stock délégué

### Principe

Chaque délégué dispose d'un **stock personnel** distinct du stock central. Le flux est :

```
Stock central ──achat délégué (validé par stockiste)──▶ Stock délégué
Stock délégué ──vente patient (validée par stockiste)──▶ Facture exercice
```

### Achats au stockiste

1. Le délégué passe une demande d'achat (produit + quantité)
2. Le stockiste valide ou refuse
3. En cas de validation : stock central débité, stock délégué crédité, facture d'achat générée

### Ventes directes

1. Le délégué enregistre une vente (patient + produits + prix + paiement)
2. La vente est en statut *En attente de validation*
3. Le stockiste valide → la vente est comptabilisée dans l'exercice
4. **Paiement partiel possible** : le délégué peut saisir un acompte ; le suivi du solde est conservé

### Mon bilan (Délégué)

- CA réalisé sur l'exercice en cours
- Nombre de ventes validées
- Gain délégué (15% du CA, ou taux personnalisé)
- Commission reversée au stockiste

### Gains délégués (Admin / Stockiste)

- Vue consolidée de tous les délégués
- CA par délégué, commissions versées, commissions restant dues
- Filtré par exercice

---

## 14. Module — Exercices comptables MAPA

### Concept

Un **exercice** est une période comptable ouverte par le stockiste ou l'administrateur. Toutes les ventes sont rattachées à l'exercice ouvert. À sa clôture, le bilan est calculé et figé.

### Cycle de vie

```
[Ouvert] ──clôturer──▶ [Clôturé] ──rouvrir (admin)──▶ [Rouvert] ──clôturer──▶ [Clôturé]
```

- Un seul exercice peut être ouvert à la fois
- La clôture ouvre automatiquement un nouvel exercice
- La réouverture exige un motif et l'absence d'autre exercice ouvert

### Numérotation

Format automatique : `EX-2026-001`, `EX-2026-002`…

### Bilan d'exercice

Le bilan calcule et affiche :

**Chiffre d'affaires total**
- CA issu des factures directes (entièrement payées)
- CA issu des ventes délégués validées (entièrement payées)
- Les partiellement payées sont **exclues**

**Par stockiste**
- CA ventes directes
- CA via délégués
- Commission totale perçue

**Par délégué**
- CA réalisé, nombre de ventes
- Gain délégué (taux × CA)
- Commission reversée au stockiste

**Montant à verser à MAPA**
```
Montant MAPA = CA total − Σ commissions stockistes − Σ gains délégués
```

**Top 20 produits**
- Classement par chiffre d'affaires

### Fiches PDF

5 documents PDF générables depuis le bilan :

| Fiche | Destinataire |
|-------|-------------|
| Fiche MAPA | Parrain MAPA |
| Détail produits | Usage interne |
| Récap délégués | Stockiste |
| Bilan stockiste | Stockiste individuel |
| Bilan délégué | Délégué individuel (accessible au délégué via *Mon bilan*) |

---

## 15. Module — Prêts et emprunts

> Réservé aux administrateurs et stockistes.

### Objectif

Tracer les mouvements de produits entre membres de l'équipe ou partenaires qui ne passent pas par le circuit de vente normal (prêt temporaire, dépôt-vente, emprunt d'urgence).

### Fonctionnement

- Enregistrement : type (prêt / emprunt), contrepartie, produit, quantité, date
- Suivi du statut : en cours / remboursé
- Historique des transactions

---

## 16. Module — Statistiques

> Réservé aux administrateurs.

### Indicateurs disponibles

- Évolution du chiffre d'affaires par mois
- Répartition des ventes par produit / catégorie
- Nombre de patients créés et de consultations réalisées
- Top produits par CA et par quantité
- Top prescripteurs
- Comparaison entre exercices

### Filtres

- Plage de dates personnalisée
- Filtre par exercice comptable

---

## 17. Module — Administration

> Réservé aux administrateurs.

### Gestion des utilisateurs

- Création : prénom, nom, e-mail, téléphone, ville, pays, rôle
  - Stockiste : taux de commission négocié
  - Délégué : rattachement au stockiste superviseur
- Modification des informations (y compris l'e-mail / identifiant de connexion)
- Réinitialisation du mot de passe (provisoire, à changer à la connexion suivante)
- Désactivation (bloque la connexion, données conservées) / réactivation
- Suppression définitive (irréversible)

### Paramètres du cabinet

| Paramètre | Description |
|-----------|-------------|
| Nom du cabinet | Affiché sur les ordonnances et fiches PDF |
| Adresse complète | Affiché sur les ordonnances et fiches PDF |
| Taux commission délégué | Taux global appliqué à toutes les ventes délégués (défaut 15%) |
| Taux commission stockiste | Taux négocié par stockiste ; propageable à tous en un clic |
| Logo | Image affichée en en-tête des ordonnances PDF |
| Signature | Image affichée en pied des ordonnances PDF |

---

## 18. Charte graphique

### Palette de couleurs

| Nom | Code HEX | Usage |
|-----|----------|-------|
| Vert ZEZEPAGNON | `#2E7D32` | Couleur dominante, boutons primaires |
| Vert foncé | `#1B5E20` | Hover, navigation |
| Vert clair | `#81C784` | Accents, badges |
| Or / Jaune miel | `#F9A825` | Accents secondaires |
| Blanc cassé | `#FAFAF7` | Fond principal |
| Beige naturel | `#F5F1E8` | Fond secondaire, cartes |
| Gris anthracite | `#263238` | Textes principaux |
| Gris moyen | `#607D8B` | Textes secondaires |

### Couleurs fonctionnelles (alertes médicales)

| État | Code HEX |
|------|----------|
| Normal / Succès | `#388E3C` |
| Bas / Attention | `#F57C00` |
| Critique / Erreur | `#C62828` |
| Information | `#0288D1` |

### Typographie

- Titres : **Playfair Display** (serif élégant)
- Corps de texte : **Inter** (sans-serif lisible)

---

## 19. Multi-tenant

L'application supporte plusieurs **tenants** (cabinets indépendants) sur le même serveur, chacun avec :
- Sa propre base de données MariaDB isolée
- Son propre domaine (ex : `alice.zezepagnon.solutions`, `cisse.zezepagnon.solutions`)
- Son propre volume de stockage pour les fichiers uploadés
- Son propre fichier `.env` (credentials, JWT secrets)

Chaque tenant est un ensemble de containers Docker (backend + frontend + db) géré par un fichier `docker-compose.XXX.yml` distinct.

Le reverse proxy Nginx route les requêtes vers le bon tenant selon le domaine.

---

*Description ZEZEPAGNON Dossiers Patients — Version 2.0 — Mai 2026*
