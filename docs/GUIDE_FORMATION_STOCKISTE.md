# Guide de Formation GECAM — Stockistes

**Version** : 1.0 — Juin 2026  
**Formateur** : Alexis Brevet — ZEZEPAGNON  
**Durée** : 1 journée (6 à 7 heures)  
**Public** : Responsables commerciaux de zone (Stockistes) du réseau MAPA

---

## Sommaire

1. [Introduction et objectifs](#1-introduction-et-objectifs)
2. [Module 1 — Connexion et interface](#2-module-1--connexion-et-interface)
3. [Module 2 — Gestion des patients](#3-module-2--gestion-des-patients)
4. [Module 3 — Ordonnances et ventes](#4-module-3--ordonnances-et-ventes)
5. [Module 4 — Stock et approvisionnement](#5-module-4--stock-et-approvisionnement)
6. [Module 5 — Exercices comptables MAPA](#6-module-5--exercices-comptables-mapa)
7. [Module 6 — Administration](#7-module-6--administration)
8. [Module 7 — Bonnes pratiques et cas pratiques](#8-module-7--bonnes-pratiques-et-cas-pratiques)
9. [Glossaire MAPA / GECAM](#9-glossaire-mapa--gecam)
10. [Fiche mémo — Actions les plus fréquentes](#10-fiche-mémo--actions-les-plus-fréquentes)

---

## 1. Introduction et objectifs

### Objectifs de la formation

À l'issue de cette journée, chaque stockiste sera capable de :

- Se connecter à GECAM et naviguer dans l'interface
- Créer et gérer un dossier patient complet
- Émettre une ordonnance et enregistrer une vente
- Suivre le stock central et émettre des Bons de Commande MAPA
- Gérer un exercice comptable MAPA de bout en bout
- Superviser les délégués rattachés à son cabinet
- Lire et exporter le bilan de l'exercice

### Prérequis

- Disposer d'un login et mot de passe fournis par le formateur (compte démo)
- Avoir accès à un navigateur web (Chrome ou Firefox recommandé)
- Connaissance de base du réseau MAPA (produits, délégués, exercices)

### Déroulé de la journée

| Période | Modules |
|---------|---------|
| Matin — 8h30 à 12h30 | Modules 1, 2, 3 |
| Après-midi — 14h à 17h30 | Modules 4, 5, 6, 7 |

> **Note formateur** : Chaque module s'appuie sur des données fictives pré-chargées dans l'environnement de démo. Le login démo est communiqué en début de journée.

---

## 2. Module 1 — Connexion et interface

**Durée estimée** : 45 minutes

### Objectifs pédagogiques

- Se connecter à GECAM
- Identifier les sections principales de l'interface
- Comprendre les informations affichées sur le tableau de bord

### 2.1 Connexion

1. Ouvrir le navigateur et aller sur `votrecabinet.zezepagnon.solutions`
2. Saisir le login et le mot de passe fournis par le formateur
3. Cliquer sur **Se connecter**
4. Vérifier que le nom du cabinet apparaît en haut de l'écran

⚠️ **Ne jamais partager vos identifiants.** Chaque stockiste a son propre compte.

### 2.2 Navigation dans l'interface

L'interface est organisée en trois zones :

| Zone | Contenu |
|------|---------|
| **Barre de navigation gauche** | Accès aux modules (Patients, Ordonnances, Stock, etc.) |
| **Zone centrale** | Contenu du module actif |
| **Barre supérieure** | Notifications, profil, déconnexion |

### 2.3 Le tableau de bord

Le tableau de bord est la première page affichée après la connexion. Il contient :

**KPIs principaux :**
- **Patients actifs** — Nombre total de patients enregistrés
- **CA de l'exercice** — Chiffre d'affaires cumulé depuis l'ouverture de l'exercice
- **Commandes MAPA en attente** — BC MAPA envoyés en attente de livraison

**Alertes affichées :**
- Stock faible (un produit sous son seuil minimum)
- Créances patients (factures impayées)
- Commandes en retard (BC non réceptionné depuis plus de 7 jours)

⚠️ **Consultez votre tableau de bord chaque matin** avant de commencer vos activités.

### Exercice 1.1

> Connectez-vous avec le compte démo et identifiez :
> - Le nombre de patients actifs
> - Le CA de l'exercice en cours
> - S'il y a des alertes actives

---

## 3. Module 2 — Gestion des patients

**Durée estimée** : 1h30

### Objectifs pédagogiques

- Créer un dossier patient complet
- Naviguer dans les onglets de la fiche patient
- Créer et gérer des rendez-vous dans l'agenda
- Utiliser la salle d'attente

### 3.1 Créer un patient

**Navigation** : Menu gauche → **Patients** → **Nouveau patient**

**Champs obligatoires :**
1. Nom de famille
2. Prénom(s)
3. Sexe (Homme / Femme)
4. Numéro de téléphone

**Champs médicaux recommandés :**
5. Date de naissance
6. Groupe sanguin
7. Allergies connues
8. Antécédents médicaux

**Nouvelles fonctionnalités de suivi médical :**
9. Maladies chroniques (ex : Diabète type 2, HTA)
10. Traitements en cours (médicament, posologie, fréquence)
11. Fréquence de suivi recommandée

⚠️ **Un patient sans téléphone ne peut pas être contacté en cas d'urgence.** Toujours renseigner ce champ.

### Exercice 2.1 — Créer un patient

> Créez le dossier du patient suivant :
>
> | Champ | Valeur |
> |-------|--------|
> | Nom | KOUAMÉ |
> | Prénom | Yao |
> | Sexe | Homme |
> | Âge | 45 ans |
> | Téléphone | 07 12 34 56 78 |
> | Maladie chronique | Diabète de type 2 |
> | Traitement | Metformine 500 mg, 2 fois par jour |
> | Fréquence de suivi | Mensuelle |

### 3.2 La fiche patient — 6 onglets

Une fois le patient créé, sa fiche est accessible avec 6 onglets :

| Onglet | Contenu |
|--------|---------|
| **Identité** | Coordonnées, date de naissance, profession |
| **Médical** | Suivi actif, allergies, antécédents, traitements |
| **Urgence** | Contact à prévenir en cas d'urgence |
| **Consultations** | Historique de toutes les consultations |
| **Documents** | Photos, fichiers PDF attachés au dossier |
| **Analyses** | Résultats biologiques (upload ou saisie manuelle) |

**Onglet Analyses :** Deux modes de saisie :
- **Upload PDF** : joindre le compte-rendu du laboratoire
- **Saisie manuelle** : entrer les valeurs directement (NFS, glycémie, lipides, thyroïde, etc.)

⚠️ Les valeurs biologiques hors norme sont automatiquement surlignées en rouge. Vérifiez-les avant de les valider.

### 3.3 L'agenda

**Navigation** : Menu gauche → **Agenda**

**Vue par défaut** : semaine. Bascule vers vue mois disponible.

**Les 5 types de rendez-vous :**

| Type | Couleur |
|------|---------|
| Consultation | Bleu |
| Suivi | Vert |
| Urgence | Rouge |
| Analyse | Violet |
| Autre | Gris |

**Créer un rendez-vous :**
1. Cliquer sur le créneau horaire dans l'agenda
2. Sélectionner le patient (recherche par nom)
3. Choisir le type de rendez-vous
4. Valider

### 3.4 La salle d'attente

La salle d'attente liste tous les rendez-vous du jour.

**Actions disponibles :**
- **PRÉSENT** → Le patient est arrivé (affiché en vert). Permet de démarrer la consultation.
- **ABSENT** → Le patient n'est pas venu (grisé)

⚠️ Marquer les absences permet de garder un historique fiable de l'assiduité des patients.

### Exercice 2.2 — Agenda et salle d'attente

> 1. Créez un rendez-vous pour Yao KOUAMÉ demain à 9h00 — Type : Suivi
> 2. Retournez dans la salle d'attente du jour
> 3. Marquez le premier patient de la liste comme PRÉSENT

---

## 4. Module 3 — Ordonnances et ventes

**Durée estimée** : 1h30

### Objectifs pédagogiques

- Créer et valider une ordonnance
- Comprendre le débit automatique du stock
- Enregistrer un paiement (total ou partiel)
- Utiliser le tableau des créanciers

### 4.1 Créer une ordonnance

Il existe deux voies pour créer une ordonnance :

**Voie 1 — Depuis une consultation :**
1. Ouvrir la consultation du patient (via la salle d'attente)
2. Cliquer sur **Créer une ordonnance**
3. L'ordonnance est automatiquement liée à la consultation

**Voie 2 — Menu Ordonnances (vente directe) :**
1. Menu gauche → **Ordonnances** → **Nouvelle ordonnance**
2. Sélectionner le patient dans la liste
3. Continuer avec les étapes communes

**Étapes communes :**
4. Ajouter les produits un par un (recherche par nom)
5. Saisir la quantité pour chaque produit
6. Vérifier le total
7. Cliquer sur **Valider**

⚠️ **La validation est définitive.** Elle débite le stock délégué et génère la facture. Vérifiez bien les quantités avant de valider.

### Exercice 3.1 — Créer une ordonnance

> Créez une ordonnance pour Yao KOUAMÉ :
> - Metformine 500 mg × 2 boites
> - Glucomètre × 1
>
> Validez et observez le message de confirmation.

### 4.2 La facturation

**Après validation de l'ordonnance :**
- Une facture est générée automatiquement
- Elle apparaît dans le menu **Facturation** du patient

**Enregistrer un paiement :**
1. Ouvrir la facture
2. Cliquer sur **Enregistrer un paiement**
3. Saisir le montant reçu (peut être inférieur au total)
4. Le solde restant est mis à jour automatiquement
5. Si paiement complet : statut passe à **SOLDÉ**

**Tableau des créanciers :**
- Menu **Facturation** → **Créanciers**
- Liste tous les patients avec un solde impayé
- Affiche : montant dû, date de la facture, délégué
- Exportable en PDF

⚠️ **Suivez vos créances hebdomadairement.** Un patient qui accumule les dettes peut mettre en difficile votre bilan MAPA.

### 4.3 Le circuit complet d'une vente

```
Stock délégué débité
        ↓
   Facture créée
        ↓
  Paiement saisi
        ↓
 Bilan mis à jour
```

**Bilans disponibles :**
- **Mon bilan délégué** : CA personnel, commissions, ordonnances émises
- **Bilan de l'exercice** : Vue globale du cabinet sur la période

### Exercice 3.2 — Facturation

> Sur la facture de Yao KOUAMÉ créée à l'étape précédente :
> 1. Enregistrez un paiement partiel de 2 000 FCFA
> 2. Observez le solde restant affiché
> 3. Enregistrez le solde restant pour solder la facture
> 4. Vérifiez le statut SOLDÉ

---

## 5. Module 4 — Stock et approvisionnement

**Durée estimée** : 1h

### Objectifs pédagogiques

- Consulter le stock central
- Saisir un mouvement de stock
- Créer et traiter un Bon de Commande MAPA

### 5.1 Consulter le stock central

**Navigation** : Menu gauche → **Stock** → **Produits**

- Liste tous les produits avec leur quantité disponible
- Produits avec stock < seuil minimum : affichés en **rouge**
- Recherche possible par nom ou catégorie

**Configurer un seuil minimum :**
1. Cliquer sur le produit
2. Modifier le champ **Seuil minimum**
3. Enregistrer

### 5.2 Saisir un mouvement de stock

**Navigation** : Stock → **Nouveau mouvement**

| Type | Quand l'utiliser |
|------|-----------------|
| **Entrée** | Réception d'une livraison hors BC MAPA |
| **Sortie** | Perte, retour, péremption |

1. Choisir le type de mouvement
2. Sélectionner le produit
3. Saisir la quantité
4. Renseigner le motif (obligatoire pour les sorties)
5. Valider

⚠️ Les sorties manuelles doivent rester exceptionnelles. Toujours privilégier les BC MAPA pour les réapprovisionnements officiels.

### 5.3 Les Bons de Commande MAPA (BC MAPA)

Les BC MAPA sont le moyen officiel de commander des produits auprès de MAPA.

#### Étape 1 — Créer et envoyer un BC MAPA

**Navigation** : Stock → **Bons de commande** → **Nouveau BC**

1. Cliquer sur **Nouveau BC MAPA**
2. Le BC est créé en statut **BROUILLON**
3. Ajouter les produits et les quantités souhaitées
4. Vérifier le document
5. Cliquer sur **Envoyer**
6. Le statut passe à **ENVOYÉ**
7. Un **PDF officiel MAPA** est généré et téléchargeable

⚠️ Une fois envoyé, le BC ne peut plus être modifié. En cas d'erreur, annulez et recréez un nouveau BC.

#### Étape 2 — Réceptionner la livraison

Lorsque la marchandise arrive :

1. Menu Stock → Bons de commande → Ouvrir le BC correspondant
2. Cliquer sur **Réceptionner**
3. Saisir les quantités **réellement reçues** (peut différer du commandé)
4. Valider
5. Le stock central est mis à jour automatiquement

**Livraison partielle :**
- Saisir uniquement ce qui a été reçu
- Le BC reste en statut **PARTIELLEMENT LIVRÉ**
- Le solde restant est affiché
- Possibilité de réceptionner la suite à la prochaine livraison

**Annulation :**
- Brouillon : annulable à tout moment
- Envoyé : annulable avant réception

### Exercice 4.1 — BC MAPA complet

> 1. Vérifiez le stock de Metformine 500mg et d'Amlodipine 5mg
> 2. Créez un BC MAPA :
>    - Metformine 500 mg × 100 boites
>    - Amlodipine 5 mg × 50 boites
> 3. Envoyez le BC
> 4. Téléchargez le PDF généré
> 5. Réceptionnez une livraison partielle : 60 boites de Metformine seulement
> 6. Vérifiez le stock et le statut du BC

---

## 6. Module 5 — Exercices comptables MAPA

**Durée estimée** : 1h

### Objectifs pédagogiques

- Comprendre le cycle d'un exercice MAPA
- Ouvrir et suivre un exercice
- Lire et interpréter le bilan
- Clôturer et exporter le bilan

### 6.1 Qu'est-ce qu'un exercice MAPA ?

Un **exercice** est une période de vente définie par MAPA. Toutes les ordonnances, ventes et commissions sont rattachées à l'exercice en cours.

**Règles importantes :**
- Un seul exercice peut être ouvert à la fois
- Toutes les ventes s'inscrivent automatiquement dans l'exercice actif
- Une fois clôturé, un exercice ne peut plus être modifié

**Cycle d'un exercice :**

```
OUVERTURE (admin)
      ↓
   VENTES (ordonnances, factures)
      ↓
   BILAN (temps réel)
      ↓
  CLÔTURE (export PDF + archivage)
```

### 6.2 Ouvrir un exercice

**Navigation** : Menu gauche → **Exercices** → **Nouveau**

1. Donner un nom à l'exercice (ex : "Exercice Mai 2026")
2. Définir la date de début
3. Valider

### 6.3 Suivre le bilan en temps réel

**Navigation** : Exercices → Sélectionner l'exercice en cours

Le bilan affiche en temps réel :

| Indicateur | Description |
|-----------|-------------|
| CA total | Somme de toutes les ventes de l'exercice |
| CA par délégué | Ventilation du CA par délégué |
| Commissions délégués | Calculées automatiquement selon les taux |
| Commission stockiste | Part du CA revenant au stockiste |
| Part MAPA | Montant à reverser à MAPA |
| Créances en cours | Factures non entièrement réglées |
| Top 5 produits | Les produits les plus vendus |

### 6.4 Clôturer l'exercice

1. Vérifier que tous les paiements sont saisis
2. Contrôler le stock final
3. Dans le bilan de l'exercice → cliquer sur **Clôturer**
4. Un PDF bilan officiel est généré automatiquement
5. Télécharger et conserver le PDF

⚠️ **Ne clôturez jamais un exercice avec des créances importantes non soldées.** Ces créances ne pourront plus être facilement suivies une fois l'exercice archivé.

### Exercice 5.1 — Lire le bilan

> Dans l'exercice de démo :
> 1. Identifiez le CA total de l'exercice
> 2. Quel est le délégué avec le plus de ventes ?
> 3. Quel est le top produit vendu ?
> 4. Téléchargez le PDF bilan

---

## 7. Module 6 — Administration

**Durée estimée** : 30 minutes

### Objectifs pédagogiques

- Créer et gérer les comptes délégués
- Paramétrer le cabinet

### 7.1 Gérer les délégués

**Navigation** : Menu gauche → **Administration** → **Délégués**

#### Créer un compte délégué

1. Cliquer sur **Nouveau délégué**
2. Remplir : nom, prénom, téléphone, email
3. Définir un login et un mot de passe temporaire
4. Valider
5. Communiquer les identifiants au délégué

#### Superviser les délégués

- Voir les ventes de chaque délégué en temps réel
- Consulter leur stock individuel
- Widget **Gains délégués** sur le tableau de bord
- Historique complet des ordonnances par délégué
- Bilan individuel exportable en PDF

⚠️ **Un délégué ne voit que ses propres données.** Seul le stockiste a une vue globale sur l'ensemble du cabinet.

### 7.2 Paramètres du cabinet

**Navigation** : Administration → **Paramètres**

| Paramètre | Description |
|-----------|-------------|
| Nom du cabinet | Apparaît sur tous les documents |
| Logo | Affiché sur les PDF (ordonnances, factures, BC) |
| Devise | FCFA par défaut |
| Coordonnées | Adresse et téléphone du cabinet |

**Changer son mot de passe :**
1. Cliquer sur l'icône profil (haut droite)
2. **Mon compte** → **Changer le mot de passe**
3. Nouveau mot de passe : 8 caractères minimum
4. Confirmer et enregistrer

---

## 8. Module 7 — Bonnes pratiques et cas pratiques

**Durée estimée** : 1h30

### Objectifs pédagogiques

- Adopter les bons réflexes quotidiens
- Dérouler un cas pratique de bout en bout

### 8.1 Bonnes pratiques quotidiennes

#### Chaque matin (avant de commencer)
- [ ] Consulter le tableau de bord
- [ ] Vérifier les alertes de stock
- [ ] Contrôler les créances en attente
- [ ] Vérifier les commandes MAPA en cours

#### Avant chaque vente
- [ ] Vérifier la disponibilité du produit dans le stock
- [ ] Confirmer l'identité du patient dans la base
- [ ] Valider l'ordonnance avec les bonnes quantités
- [ ] Enregistrer le paiement ou noter la créance

#### Chaque semaine
- [ ] Contrôler le stock de tous les produits clés
- [ ] Créer les BC MAPA si nécessaire
- [ ] Relancer les patients créanciers
- [ ] Consulter l'évolution du bilan de l'exercice

#### À chaque fin de période MAPA
- [ ] Vérifier que tous les paiements sont saisis
- [ ] Valider le stock final
- [ ] Clôturer l'exercice depuis GECAM
- [ ] Exporter et conserver le PDF bilan
- [ ] Ouvrir le nouvel exercice si une nouvelle période commence

### 8.2 Cas pratique 1 — Visite patient Yao KOUAMÉ

> **Scénario** : Yao KOUAMÉ, 45 ans, diabétique de type 2, se présente pour son suivi mensuel. Il souhaite renouveler son traitement.

**Étapes à réaliser :**

1. **Créer le patient** (si ce n'est pas déjà fait)
   - KOUAMÉ Yao, H, 07 12 34 56 78, Diabète type 2, Metformine 500mg 2x/j

2. **Créer un rendez-vous**
   - Type : Suivi, aujourd'hui, heure actuelle

3. **Salle d'attente**
   - Marquer le patient PRÉSENT
   - Ouvrir la consultation depuis la salle d'attente

4. **Créer l'ordonnance**
   - Metformine 500mg × 2 boites
   - Glucomètre × 1 (si besoin)
   - Valider l'ordonnance

5. **Facturation**
   - Ouvrir la facture générée
   - Enregistrer le paiement (total ou partiel selon le scénario)

6. **Vérification**
   - Contrôler que le stock a bien été débité
   - Vérifier le bilan mis à jour

### 8.3 Cas pratique 2 — Réapprovisionnement d'urgence

> **Scénario** : Une alerte stock "Metformine 500mg" apparaît sur votre tableau de bord. Il ne reste que 8 unités. Il faut commander immédiatement.

**Étapes à réaliser :**

1. **Détecter l'alerte**
   - Tableau de bord → icône alerte
   - Identifier le produit concerné : Metformine 500mg < seuil

2. **Vérifier le stock**
   - Menu Stock → confirmer la quantité disponible

3. **Créer le BC MAPA**
   - Stock → Bons de commande → Nouveau BC
   - Metformine 500mg × 100 boites
   - Amlodipine 5mg × 50 boites (anticiper)

4. **Envoyer le BC**
   - Vérifier les lignes → Envoyer
   - Télécharger le PDF officiel

5. **Réceptionner la livraison**
   - Lors de l'arrivée des produits : Ouvrir le BC → Réceptionner
   - Saisir les quantités reçues
   - Valider → stock mis à jour

6. **Vérification finale**
   - Contrôler le stock de Metformine sur la fiche produit
   - Vérifier que l'alerte a disparu du tableau de bord

---

## 9. Glossaire MAPA / GECAM

| Terme | Définition |
|-------|-----------|
| **MAPA** | Réseau de distribution de médicaments et produits de santé en Côte d'Ivoire |
| **GECAM** | Logiciel de Gestion des Cabinets MAPA, édité par ZEZEPAGNON |
| **Stockiste** | Responsable commercial de zone du réseau MAPA. Gère le stock, les délégués, les ordonnances et la comptabilité |
| **Délégué** | Commercial rattaché au stockiste. Émet des ordonnances depuis son stock propre |
| **Exercice** | Période de vente MAPA, avec une date d'ouverture et une date de clôture |
| **BC MAPA** | Bon de Commande officiel émis par le stockiste vers MAPA pour réapprovisionner son stock |
| **Stock central** | Stock principal du cabinet géré par le stockiste |
| **Stock délégué** | Stock individuel alloué à chaque délégué. Débité à chaque ordonnance validée |
| **Ordonnance** | Document listant les produits vendus à un patient. Sa validation débite le stock |
| **Facture** | Document financier généré après validation d'une ordonnance |
| **Créance** | Facture partiellement ou non payée par un patient |
| **Bilan exercice** | Récapitulatif financier de l'exercice : CA, commissions, part MAPA |
| **Commission stockiste** | Pourcentage du CA total revenant au stockiste selon les règles MAPA |
| **Commission délégué** | Pourcentage du CA individuel revenant à chaque délégué |
| **Seuil minimum** | Quantité minimale en stock en-dessous de laquelle une alerte est déclenchée |
| **Livraison partielle** | Réception d'une quantité inférieure à ce qui avait été commandé dans un BC |
| **Bilan délégué** | Récapitulatif individuel des ventes et commissions d'un délégué |
| **Salle d'attente** | Vue dans GECAM listant les patients ayant un RDV le jour courant |
| **Suivi médical** | Module de la fiche patient centralisant les maladies chroniques et traitements |

---

## 10. Fiche mémo — Actions les plus fréquentes

> Cette fiche est à conserver près de votre poste de travail.

---

### Créer un patient
`Menu Patients → Nouveau patient → Remplir Nom / Prénom / Sexe / Téléphone → Enregistrer`

---

### Créer un rendez-vous
`Agenda → Cliquer sur le créneau → Sélectionner le patient → Choisir le type → Valider`

---

### Émettre une ordonnance
`Menu Ordonnances → Nouvelle ordonnance → Sélectionner patient → Ajouter produits + quantités → Valider`

---

### Enregistrer un paiement
`Facturation → Ouvrir la facture → Enregistrer un paiement → Saisir le montant → Confirmer`

---

### Vérifier le stock
`Menu Stock → Produits → Rechercher le produit → Vérifier la quantité`

---

### Créer un BC MAPA
`Stock → Bons de commande → Nouveau BC → Ajouter produits → Envoyer → Télécharger PDF`

---

### Réceptionner une livraison
`Stock → Bons de commande → Ouvrir le BC → Réceptionner → Saisir quantités reçues → Valider`

---

### Consulter le bilan de l'exercice
`Exercices → Sélectionner l'exercice en cours → Voir le bilan`

---

### Exporter le bilan en PDF
`Exercices → Bilan → Bouton "Exporter PDF"`

---

### Changer son mot de passe
`Icône profil (haut droite) → Mon compte → Changer le mot de passe`

---

### Créer un compte délégué
`Administration → Délégués → Nouveau délégué → Remplir les informations → Valider`

---

*Document de formation GECAM — Version 1.0 — Juin 2026*  
*ZEZEPAGNON — votrecabinet.zezepagnon.solutions*
