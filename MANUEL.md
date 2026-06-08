# Manuel utilisateur — GECAM

**Version 3.0 — Juin 2026**

---

## Table des matières

1. [Présentation de l'application](#1-présentation-de-lapplication)
2. [Premiers pas](#2-premiers-pas)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Gestion des patients](#4-gestion-des-patients)
5. [Consultations](#5-consultations)
6. [Ordonnances et prescriptions](#6-ordonnances-et-prescriptions)
7. [Rendez-vous](#7-rendez-vous)
8. [Facturation](#8-facturation)
9. [Gestion du stock central](#9-gestion-du-stock-central)
10. [Mon stock — Délégués](#10-mon-stock--délégués)
11. [Exercices comptables MAPA](#11-exercices-comptables-mapa)
12. [Prêts et emprunts](#12-prêts-et-emprunts)
13. [Bons de commande MAPA (BC MAPA)](#13-bons-de-commande-mapa-bc-mapa)
14. [Statistiques](#14-statistiques)
15. [Administration](#15-administration)
16. [FAQ et résolution de problèmes](#16-faq-et-résolution-de-problèmes)

---

## 1. Présentation de l'application

### À quoi sert ZEZEPAGNON Dossiers Patients ?

ZEZEPAGNON Dossiers Patients est une application web de gestion médicale et commerciale conçue pour les cabinets du réseau MAPA (pharmacopée africaine). Elle couvre l'ensemble du cycle de vie d'un patient et d'un exercice commercial :

- **Dossiers patients** : création, suivi médical, consultations, ordonnances, analyses NFS, fichiers
- **Ventes et facturation** : ordonnances, factures, paiements partiels, tableau des créanciers
- **Stock** : stock central, stocks personnels des délégués, approvisionnements
- **Comptabilité** : exercices MAPA, bilans, commissions stockistes et délégués, fiches PDF
- **Administration** : utilisateurs, paramètres du cabinet, statistiques

### Les 4 rôles — qui fait quoi ?

| Rôle | Description | Accès principal |
|------|-------------|-----------------|
| **Administrateur** | Gère tout le cabinet | Toutes les fonctionnalités |
| **Stockiste** | Responsable commercial d'une zone | Patients, stock, exercices, délégués |
| **Délégué** | Commercial terrain rattaché à un stockiste | Patients, son stock personnel, ses ventes |
| **Secrétaire** | Support administratif | Patients, rendez-vous, facturation |

> Votre rôle est défini par l'administrateur. Il détermine les pages auxquelles vous avez accès.

---

## 2. Premiers pas

### Se connecter

1. Ouvrez votre navigateur et accédez à l'adresse fournie par votre administrateur
2. Saisissez votre **adresse e-mail** et votre **mot de passe**
3. Cliquez sur **Se connecter**

> **Première connexion :** si votre compte vient d'être créé, l'application vous demandera immédiatement de choisir un nouveau mot de passe. Choisissez-en un d'au moins 8 caractères.

### Comprendre l'interface

L'interface se compose de trois zones :

```
┌─────────────────────────────────────────────────────┐
│    BARRE SUPÉRIEURE  (exercice en cours, déconnexion) │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   MENU       │         CONTENU PRINCIPAL            │
│   LATÉRAL    │                                      │
│ (navigation) │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Menu latéral** — entrées disponibles selon votre rôle :

| Page | Rôles |
|------|-------|
| Tableau de bord | Tous |
| Patients | Tous |
| Consultations | Admin, Stockiste, Délégué |
| Rendez-vous | Tous |
| Ordonnances | Admin, Stockiste, Délégué |
| Facturation | Tous |
| Mon stock | Délégué uniquement |
| Stock | Admin, Secrétaire |
| Prêts & Emprunts | Admin, Stockiste |
| Statistiques | Admin |
| Exercices | Admin, Stockiste |
| Utilisateurs | Admin |
| Paramètres | Admin |

> Le **badge rouge** sur l'entrée Stock signale des produits sous le seuil d'alerte.

### Se déconnecter

Cliquez sur votre nom en haut à droite, puis sur **Déconnexion**.

---

## 3. Tableau de bord

Le tableau de bord est la page d'accueil après connexion. Il affiche en temps réel les indicateurs clés de votre cabinet.

### Indicateurs KPI (Administrateur / Stockiste)

| Indicateur | Description |
|-----------|-------------|
| **Patients** | Nombre total de patients actifs |
| **Consultations du mois** | Consultations enregistrées sur le mois calendaire en cours |
| **CA du mois** | Chiffre d'affaires du mois (factures entièrement payées uniquement) |
| **CA de l'exercice** | Chiffre d'affaires cumulé depuis l'ouverture de l'exercice |

> **Règle importante :** les factures partiellement payées ne sont **pas comptabilisées** dans le CA. Seules les factures entièrement payées (statut *Payée*) entrent dans les KPI et les commissions.

### Alertes de stock

Le dashboard affiche les produits dont la quantité est inférieure au seuil d'alerte, avec un lien direct vers la page Stock.

### Gains délégués

Pour les administrateurs et stockistes, un récapitulatif des gains des délégués sur l'exercice en cours est affiché.

### Exercice en cours

La barre supérieure rappelle en permanence le **numéro d'exercice** en cours, sa date de début, et le **CA cumulé**.

### Widget Commandes MAPA

Le tableau de bord affiche un encadré récapitulant les **bons de commande MAPA en attente de livraison**, c'est-à-dire les BC dont le statut est **Envoyé** ou **Livraison partielle**.

- Pour chaque commande en attente, le widget indique la référence, la date d'envoi et le nombre de produits concernés
- Une **alerte amber** signale automatiquement toute commande attendant depuis plus de **7 jours** sans réception
- Un lien direct vers la page **Bons de commande MAPA** permet d'accéder à l'historique complet et de saisir une réception

> Ce widget est visible par les **administrateurs** et les **stockistes** uniquement.

---

## 4. Gestion des patients

### Créer un patient

1. Dans le menu latéral, cliquez sur **Patients**
2. Cliquez sur **Nouveau patient**
3. Remplissez le formulaire :
   - **Obligatoires** : prénom, nom, sexe, date de naissance, téléphone
   - **Optionnels** : adresse, commune, ville, pays, profession, groupe sanguin, allergies, antécédents personnels et familiaux, contact d'urgence, numéro d'assurance
4. Cliquez sur **Enregistrer le dossier**

> Le **numéro de dossier** est généré automatiquement au format `ZZP-2026-00001`. Il est unique et non modifiable.

**Allergies** : saisissez chaque allergie et appuyez sur **Entrée** pour l'ajouter sous forme d'étiquette. Les allergies sont visibles dans tout le dossier et sur les ordonnances.

### Rechercher et consulter un patient

1. Cliquez sur **Patients** dans le menu
2. Utilisez la barre de recherche : nom, prénom, téléphone ou numéro de dossier
3. Cliquez sur le patient pour ouvrir sa fiche

La fiche patient est organisée en sections :
- **Informations personnelles** et photo
- **Allergies** et antécédents médicaux
- **Consultations** (historique chronologique)
- **Ordonnances** (toutes les prescriptions)
- **Fichiers** (documents joints)
- **Analyses NFS** (résultats biologiques)

### Visualiser un fichier joint (Administrateur / Stockiste)

Depuis la section **Fichiers** d'une fiche patient, cliquez sur l'icône **œil** (👁) à droite du fichier pour l'ouvrir dans le visualiseur intégré.

**Fonctionnalités du visualiseur :**

| Bouton | Action |
|--------|--------|
| ↺ / ↻ | Rotation gauche / droite (images uniquement) |
| ⬇ | Télécharger le fichier |
| ⛶ | Plein écran |
| ✕ | Fermer (ou touche **Échap**) |

- **PDF** : affiché via le lecteur natif du navigateur (barre de navigation, zoom, recherche intégrés)
- **Images** (JPG, PNG, GIF) : affichage avec zoom/dézoom au scroll, panoramique par glissé

### Joindre un fichier au dossier

1. Ouvrez la fiche patient, section **Fichiers**
2. Choisissez la **catégorie** : résultat d'analyse, ordonnance externe, imagerie, autre
3. Cliquez sur **Ajouter un fichier**
4. Sélectionnez le fichier depuis votre ordinateur

> Formats acceptés : PDF, JPG, PNG, GIF. Taille maximale : **20 Mo**.

### Saisir des analyses NFS

1. Ouvrez la fiche patient, section **Analyses NFS**
2. Cliquez sur **Nouvelle analyse**
3. Deux modes de saisie :
   - **Manuelle** : remplissez chaque valeur (globules rouges, blancs, plaquettes, formule leucocytaire…)
   - **Extraction automatique** : uploadez une image ou un PDF du résultat — l'application tente d'extraire les valeurs par OCR
4. Renseignez le sexe du patient et son âge au moment de l'analyse
5. Ajoutez vos conclusions
6. Cliquez sur **Enregistrer**

> L'analyse NFS compare automatiquement les valeurs aux normes de référence avec un code couleur : **normal** (vert), **bas / élevé** (orange), **critique** (rouge). Il s'agit d'une aide à l'analyse, pas d'un diagnostic médical.

> Réservé aux administrateurs et stockistes.

### Renseigner le suivi médical

Le formulaire patient comporte une section **Suivi médical** (pliable, accessible en bas du formulaire).

**Fréquence de suivi**

Sélectionnez la fréquence de suivi du patient parmi : **Mensuel**, **Trimestriel**, **Semestriel**, **Annuel** ou **Sur besoin**.

**Maladies chroniques**

Ajoutez chaque maladie chronique du patient avec :
- **Nom** de la maladie
- **Depuis** (date ou année de diagnostic)
- **Notes** complémentaires éventuelles

Cliquez sur **Ajouter** pour valider chaque entrée. La liste des maladies enregistrées est affichée en dessous et chaque ligne peut être supprimée individuellement.

**Traitements en cours**

Enregistrez les traitements actifs du patient avec :
- **Médicament** : nom du produit
- **Dosage** : ex. 500 mg, 1 comprimé
- **Fréquence** : boutons rapides disponibles (1×/jour, 2×/jour, 3×/jour, matin + soir) ou saisie libre
- **Depuis** : date de début du traitement

Cliquez sur **Ajouter** pour valider chaque traitement. La liste est affichée et chaque traitement peut être supprimé.

> Ces informations sont sauvegardées avec le dossier patient et apparaissent dans l'**onglet Médical** de la fiche patient, dans le bloc **Suivi médical actif**.

### Analyses biologiques complètes

La fiche patient propose un onglet **Analyses** permettant de saisir, stocker et visualiser les résultats biologiques du patient.

**3 modes d'accès :**

| Mode | Description |
|------|-------------|
| **Charger fichier** | Uploader un PDF ou une image du résultat d'analyse — l'application tente d'extraire les valeurs automatiquement par IA |
| **Saisie manuelle** | Entrer les valeurs directement dans le formulaire, panel par panel |
| **Évolution** | Afficher un graphique temporel comparant les valeurs sur plusieurs analyses successives |

**8 panels biologiques disponibles :**

| Panel | Contenu principal |
|-------|------------------|
| **NFS** | Globules rouges, blancs, plaquettes, hémoglobine, hématocrite, formule leucocytaire |
| **Rénal** | Créatinine, urée, DFG estimé |
| **Glycémie** | Glycémie à jeun, HbA1c |
| **Lipidique** | Cholestérol total, HDL, LDL, triglycérides |
| **Ionogramme** | Sodium, potassium, chlore, bicarbonates, calcium |
| **Hépatique** | ALAT, ASAT, GGT, bilirubine, phosphatases alcalines |
| **Thyroïdien** | TSH, T3, T4 libre |
| **Coagulation** | TP, TCA, INR, fibrinogène |

> Chaque valeur saisie est comparée aux **normes de référence** et affiche une interprétation colorée : **normal** (vert), **anormal** (orange), **critique** (rouge). Cette interprétation est une aide à la lecture, pas un diagnostic médical.

> Le **graphique d'évolution** compare les valeurs d'un même paramètre dans le temps, permettant de visualiser les tendances sur plusieurs mois ou années.

### Archiver un patient

L'archivage masque le patient de la liste sans supprimer son dossier (données conservées).

1. Ouvrez la fiche du patient
2. Cliquez sur **Archiver le dossier**
3. Confirmez

Pour retrouver un patient archivé : dans la liste des patients, activez le filtre **Afficher les archivés**.

> Réservé aux administrateurs et stockistes.

---

## 5. Consultations

### Créer une consultation

1. Ouvrez la fiche du patient
2. Cliquez sur **Nouvelle consultation**
3. Remplissez les informations :
   - **Date** de consultation (par défaut : aujourd'hui)
   - **Motif** de la visite
   - **Symptômes**, diagnostic, notes de traitement
   - **Signes vitaux** : poids, taille, tension artérielle (systolique / diastolique), fréquence cardiaque, température, saturation en oxygène (SpO₂)
4. L'**IMC** (Indice de Masse Corporelle) est calculé automatiquement si poids et taille sont renseignés
5. Cliquez sur **Enregistrer**

Depuis la consultation, vous pouvez directement **créer une ordonnance** liée à cette consultation.

### Modifier ou supprimer une consultation

> Réservé aux administrateurs et stockistes.

- Cliquez sur la consultation dans l'historique du patient
- Utilisez les boutons **Modifier** ou **Supprimer**

---

## 6. Ordonnances et prescriptions

### Créer une ordonnance depuis une consultation

1. Ouvrez la consultation concernée
2. Cliquez sur **Ajouter une ordonnance**
3. Ajoutez les lignes de prescription :
   - Sélectionnez un produit dans la liste
   - Indiquez la quantité et le prix unitaire
4. Le montant total est calculé automatiquement
5. Cliquez sur **Enregistrer** pour créer un brouillon
6. Cliquez sur **Valider** pour finaliser

### Créer une ordonnance directe (sans consultation préalable)

Il est possible de créer une ordonnance **sans consultation** associée — utile pour les ventes directes ou renouvellements simples.

1. Cliquez sur **Ordonnances** dans le menu latéral
2. Cliquez sur **Nouvelle ordonnance directe**
3. Sélectionnez le patient
4. Ajoutez les produits, quantités et prix
5. Validez

### Renouveler une ordonnance

Pour reprécisément les mêmes produits qu'une ordonnance antérieure :

1. Dans la liste des ordonnances (ou depuis la fiche patient), ouvrez l'ordonnance à renouveler
2. Cliquez sur **Renouveler**
3. Les produits, quantités et prix sont automatiquement repris
4. Ajustez si nécessaire et validez

### Générer le PDF

Depuis n'importe quelle ordonnance validée, cliquez sur l'icône **Télécharger PDF**. Le document inclut l'en-tête du cabinet (logo, nom, adresse) et les informations du patient.

> Une ordonnance **validée** ne peut plus être modifiée. Une ordonnance **annulée** ne peut pas être réactivée.

---

## 7. Rendez-vous

### Vues de l'agenda

Cliquez sur **Rendez-vous** dans le menu latéral.

L'agenda propose deux vues sélectionnables via le bouton toggle en haut à droite :

- **Vue Semaine** (par défaut) : affiche les 7 jours de la semaine en cours avec les créneaux horaires et les rendez-vous positionnés
- **Vue Mois** : affiche une grille sur 6 semaines. Cliquez sur un jour pour afficher en bas de page la liste détaillée des rendez-vous de ce jour

### Types de rendez-vous

Chaque rendez-vous est associé à un **type** qui détermine la couleur de la bordure dans l'agenda :

| Type | Couleur |
|------|---------|
| **Consultation** | Bleu |
| **Suivi** | Vert |
| **Urgence** | Rouge |
| **Analyse** | Amber (orange) |
| **Autre** | Gris |

### Créer un rendez-vous

1. Cliquez sur **Nouveau rendez-vous** ou directement sur un créneau dans le calendrier
2. Renseignez : patient, date, heure, durée, type, motif
3. Enregistrez

### Salle d'attente

En haut de la page Rendez-vous, une **section amber "Salle d'attente"** s'affiche automatiquement lorsque des rendez-vous du jour n'ont pas encore été pris en charge. Elle liste tous les RDVs du jour dont le statut est encore **Programmé** ou **Confirmé**.

Pour chaque RDV en salle d'attente, deux boutons d'action rapide sont disponibles sans ouvrir le formulaire :
- **Présent** : marque le patient comme arrivé (statut → *Honoré*)
- **Absent** : marque le patient comme absent (statut → *Absent*)

### Statuts rapides dans la liste du jour

Dans la liste des rendez-vous du jour, des boutons **Présent** et **Absent** sont disponibles directement en ligne pour chaque rendez-vous, sans avoir à ouvrir le formulaire de modification.

### Statuts des rendez-vous

| Statut | Signification |
|--------|---------------|
| **Programmé** | RDV planifié, patient non encore arrivé |
| **Confirmé** | Patient a confirmé sa venue |
| **Honoré** | Patient s'est présenté |
| **Absent** | Patient ne s'est pas présenté |
| **Annulé** | RDV annulé |

---

## 8. Facturation

### Créer une facture

Une facture est généralement créée depuis une ordonnance validée :

1. Depuis l'ordonnance, cliquez sur **Créer une facture**
2. Vérifiez les lignes et le montant total
3. Enregistrez — la facture est en statut **En attente**

### Enregistrer un paiement

1. Dans la page **Facturation**, trouvez la facture
2. Cliquez sur **Payer**
3. Saisissez le montant encaissé et le mode de paiement :
   - Espèces, Orange Money, MTN Mobile Money, Wave, virement bancaire, chèque
4. Confirmez

**Paiement partiel :** si le montant encaissé est inférieur au total, la facture passe en statut **Partiellement payée**. Elle reste dans le tableau des créanciers jusqu'au solde complet.

### Statuts des factures

| Statut | Signification | Comptabilisé dans le CA ? |
|--------|---------------|--------------------------|
| **En attente** | Aucun paiement reçu | Non |
| **Partiellement payée** | Acompte reçu, solde restant | **Non** |
| **Payée** | Réglée intégralement | **Oui** |
| **Annulée** | Facture annulée | Non |

> Les factures partiellement payées **ne comptent pas** dans le chiffre d'affaires ni dans les commissions. Seules les factures entièrement réglées sont prises en compte.

### Tableau des créanciers

L'onglet **Créanciers** de la page Facturation liste tous les patients ayant une ou plusieurs factures impayées ou partiellement payées.

Pour chaque créancier, le tableau affiche :
- La référence de la facture
- La date
- Les produits concernés
- Le montant total, le montant déjà payé, et le **restant dû**
- Un bouton **Payer** pour saisir rapidement le solde

> Cet onglet permet de gérer facilement les encaissements en attente et de relancer les patients débiteurs.

### Annuler une facture

1. Ouvrez la facture
2. Cliquez sur **Annuler**
3. Confirmez

Une facture annulée ne peut pas être réactivée.

---

## 9. Gestion du stock central

> Accessible aux Administrateurs. Consulté en lecture seule par les Secrétaires.

### Consulter le stock

1. Cliquez sur **Stock** dans le menu latéral
2. La liste affiche tous les produits avec leur **quantité en stock**, leur **seuil d'alerte** et leur prix unitaire
3. Les produits **sous le seuil d'alerte** sont mis en évidence

### Saisir un mouvement de stock

Les mouvements permettent d'enregistrer des entrées (réception de marchandises), des sorties manuelles ou des ajustements d'inventaire.

1. Dans la page Stock, cliquez sur le produit concerné
2. Cliquez sur **Ajouter un mouvement**
3. Choisissez le type : **Entrée**, **Sortie** ou **Ajustement**
4. Indiquez la quantité et un motif
5. Enregistrez

Le stock est mis à jour instantanément et le mouvement est tracé dans l'historique.

### Modifier le seuil d'alerte

1. Dans la page Stock, cliquez sur le produit
2. Cliquez sur **Modifier le seuil**
3. Saisissez la nouvelle valeur et enregistrez

---

## 10. Mon stock — Délégués

> Accessible aux Délégués uniquement via l'entrée **Mon stock** du menu latéral.

### Voir son stock personnel

La page Mon stock affiche l'inventaire personnel du délégué : produits disponibles, quantités, valeurs.

### Acheter du stock au stockiste

1. Cliquez sur **Acheter**
2. Sélectionnez le produit et la quantité souhaitée
3. Validez — la demande est envoyée en statut *En attente*

Le stockiste reçoit la demande et la **valide ou la refuse**. Une fois validée, le stock du délégué est mis à jour.

### Vendre à un patient

1. Cliquez sur **Vendre** ou **Nouvelle vente directe**
2. Sélectionnez le patient
3. Ajoutez les produits, quantités et prix unitaires
4. Choisissez le mode de paiement
5. Validez

La vente est créée en statut **En attente de validation** par le stockiste. Elle sera comptabilisée dans l'exercice uniquement après validation.

**Paiement partiel :** si le patient ne règle pas l'intégralité, saisissez le montant encaissé. La vente reste en suivi jusqu'au solde complet.

### Voir ses ventes et son bilan

- **Mes ventes** : liste de toutes les ventes (en attente, validées, refusées)
- **Mon bilan** : récapitulatif de l'exercice en cours — CA réalisé, gains (15% du CA), commissions reversées au stockiste

---

## 11. Exercices comptables MAPA

### Comprendre la notion d'exercice

Un **exercice** est une période comptable pendant laquelle les ventes sont enregistrées et les commissions calculées. À la fin de chaque exercice, un bilan est produit pour MAPA.

**Règles importantes :**
- Il ne peut y avoir qu'**un seul exercice ouvert à la fois**
- Un exercice **clôturé est figé** — ses chiffres ne changent plus
- Les ventes ne sont comptabilisées que dans un exercice **ouvert**
- Les factures partiellement payées sont **exclues** du bilan — elles apparaissent dans le tableau des créanciers

**Cycle de vie :**
```
[Ouvert] ──clôture──▶ [Clôturé] ──réouverture (admin)──▶ [Rouvert] ──clôture──▶ [Clôturé]
```

### Ouvrir un exercice

> Réservé aux administrateurs et stockistes.

1. Cliquez sur **Exercices** dans le menu
2. Cliquez sur **Ouvrir un nouvel exercice**
3. Choisissez la date d'ouverture (par défaut : aujourd'hui)
4. Confirmez

L'exercice reçoit automatiquement un numéro au format `EX-2026-001`.

### Clôturer un exercice

> Réservé aux administrateurs et stockistes.

1. Dans la page **Exercices**, identifiez l'exercice ouvert
2. Cliquez sur **Clôturer**
3. Confirmez

À la clôture, le bilan complet est calculé et figé. Un nouvel exercice s'ouvre automatiquement à la date de clôture.

### Lire le bilan d'un exercice

Depuis la page **Exercices**, cliquez sur **Voir le bilan**.

**Ce que le bilan présente :**

| Section | Contenu |
|---------|---------|
| **CA total** | CA factures directes + CA ventes délégués (entièrement payées) |
| **Par stockiste** | CA ventes directes, CA ventes délégués, commission totale |
| **Par délégué** | CA réalisé, nombre de ventes, gain délégué (15%), commission reversée |
| **Montant MAPA** | CA total − commissions stockistes − commissions délégués |
| **Top produits** | Classement des 20 meilleurs produits par CA |

> Les factures partiellement payées sont **exclues** du bilan. Elles figurent dans le **Tableau des créanciers** de la page Facturation.

### Fiches PDF du bilan

Depuis la page bilan, section **Fiches PDF** :

| Fiche | Contenu |
|-------|---------|
| **Fiche MAPA** | Récapitulatif global à remettre au parrain MAPA |
| **Détail produits** | Top 20 produits avec CA et quantités vendues |
| **Récap délégués** | Synthèse par délégué (CA, gains, commissions) |
| **Bilan stockiste** | Bilan individuel d'un stockiste |
| **Bilan délégué** | Bilan individuel d'un délégué (accessible au délégué via *Mon bilan*) |

> Les exercices non clôturés portent la mention **PROVISOIRE** sur les PDF.

### Réouvrir un exercice clôturé

> Réservé aux administrateurs uniquement.

1. Dans la liste des exercices, cliquez sur **Rouvrir**
2. Saisissez le **motif de réouverture** (obligatoire)
3. Confirmez

Un exercice ne peut être rouvert que si aucun autre exercice n'est actuellement ouvert.

---

## 12. Prêts et emprunts

> Accessible aux Administrateurs et Stockistes.

Ce module permet de tracer les **prêts de produits** entre membres de l'équipe (stockiste ↔ délégué, cabinet ↔ partenaire, etc.).

### Enregistrer un prêt ou emprunt

1. Cliquez sur **Prêts & Emprunts** dans le menu
2. Cliquez sur **Nouveau**
3. Sélectionnez le type : **Prêt** (vous prêtez) ou **Emprunt** (vous empruntez)
4. Indiquez le produit, la quantité, la contrepartie, et la date
5. Enregistrez

### Suivre les remboursements

La liste affiche tous les prêts et emprunts en cours avec leur statut (en cours / remboursé).

---

## 13. Bons de commande MAPA (BC MAPA)

> Accessible aux **administrateurs** et **stockistes** uniquement.

### Qu'est-ce qu'un Bon de Commande MAPA ?

Un BC MAPA est un document officiel envoyé à MAPA pour commander des produits destinés au stock du cabinet. Il retrace l'ensemble du cycle : demande initiale, envoi, livraison (totale ou partielle) et clôture. Chaque BC génère automatiquement un **PDF** à chaque étape clé.

### Créer un bon de commande (Étape 1)

1. Cliquez sur **Bons de commande MAPA** dans le menu latéral
2. Cliquez sur **Nouveau bon de commande**
3. Remplissez le formulaire :
   - **Nom du stockiste MAPA** destinataire
   - **Lieu de livraison** souhaité
   - **Date de livraison souhaitée**
   - **Produits** : ajoutez chaque produit avec sa quantité et son prix unitaire
4. Cliquez sur **Enregistrer comme brouillon** → le BC est en statut *Brouillon* et peut être modifié à tout moment
5. Quand le BC est prêt, cliquez sur **Envoyer à MAPA** → le BC passe en statut **Envoyé**, est **verrouillé** (plus modifiable) et un **PDF du bon de commande** est généré automatiquement

### Réceptionner une livraison (Étape 2)

Lorsque les produits arrivent :

1. Dans l'historique des BC, ouvrez le BC en statut **Envoyé** ou **Livraison partielle**
2. Cliquez sur **Réceptionner**
3. Pour chaque produit, saisissez la **quantité effectivement reçue**
4. Cliquez sur **Valider la réception** :
   - Le **stock est mis à jour automatiquement** pour chaque produit réceptionné
   - Si toutes les quantités sont reçues → statut **Livré**
   - Si certaines quantités manquent → statut **Livraison partielle**, les quantités restantes restent visibles
5. Un **PDF Bon de Réception** est généré avec le détail colonné : quantité commandée / quantité reçue / quantité restante

### Annuler un bon de commande

Sur un BC dont le statut est **Envoyé** ou **Livraison partielle**, cliquez sur **Annuler la commande** et confirmez. Le BC passe en statut **Annulé** et ne peut plus être modifié.

### Statuts des BC MAPA

| Statut | Description |
|--------|-------------|
| **Brouillon** | BC en cours de rédaction, modifiable |
| **Envoyé** | BC transmis à MAPA, verrouillé, en attente de livraison |
| **Livraison partielle** | Livraison reçue partiellement, solde en attente |
| **Livré** | Toutes les quantités reçues, BC clôturé |
| **Annulé** | BC annulé avant livraison complète |

### Filtrer l'historique

En haut de la liste des bons de commande, des **pilules de filtre** par statut permettent d'afficher uniquement les BC d'un statut donné (ex. : afficher uniquement les *Envoyés* pour gérer les livraisons en attente).

---

## 14. Statistiques

> Réservé aux Administrateurs.

Accédez aux statistiques via **Statistiques** dans le menu latéral.

Les statistiques permettent de visualiser la performance du cabinet sur une période choisie :

- Évolution du chiffre d'affaires par mois
- Répartition des ventes par produit
- Nombre de patients et de consultations
- Top produits et top prescripteurs
- Comparaison entre exercices

---

## 15. Administration

> Fonctionnalités réservées aux Administrateurs.

### Gérer les utilisateurs

Accédez à **Utilisateurs** dans le menu latéral.

**Créer un utilisateur :**
1. Cliquez sur **Nouvel utilisateur**
2. Remplissez : prénom, nom, e-mail, téléphone, ville, pays, rôle
3. Pour un **stockiste** : saisissez son taux de commission négocié
4. Pour un **délégué** : sélectionnez le stockiste auquel il est rattaché
5. Définissez un mot de passe provisoire — l'utilisateur devra le changer à la première connexion
6. Enregistrez

**Modifier un utilisateur :**
1. Cliquez sur l'utilisateur dans la liste
2. Modifiez les informations souhaitées
3. Enregistrez

**Réinitialiser un mot de passe :**
1. Ouvrez la fiche de l'utilisateur
2. Cliquez sur **Réinitialiser le mot de passe**
3. Saisissez un mot de passe temporaire — l'utilisateur devra le changer à sa prochaine connexion

**Désactiver / Réactiver un utilisateur :**
- Un utilisateur désactivé ne peut plus se connecter
- Ses données sont conservées
- La désactivation est réversible

### Configurer les paramètres du cabinet

Accédez à **Paramètres** dans le menu latéral.

| Paramètre | Description |
|-----------|-------------|
| **Nom et adresse du cabinet** | Apparaissent sur toutes les fiches PDF et ordonnances |
| **Taux de commission délégué** | Taux appliqué à toutes les ventes des délégués (défaut : 15%) |
| **Taux de commission stockiste** | Taux négocié par stockiste ; propagé à tous lors d'une modification globale |
| **Logo et signature** | Images affichées en en-tête et pied des ordonnances PDF |

---

## 16. FAQ et résolution de problèmes

### "Je ne peux pas créer une vente"
**Cause :** aucun exercice comptable n'est ouvert.
**Solution :** demandez à votre administrateur ou stockiste d'ouvrir un exercice via la page **Exercices**.

### "Le CA affiché ne correspond pas à mes factures"
**Cause :** seules les factures **entièrement payées** sont comptabilisées dans le CA. Les factures partiellement payées sont exclues.
**Solution :** consultez l'onglet **Créanciers** de la page Facturation pour voir les paiements en attente.

### "Je n'ai pas accès à la page Exercices"
**Cause :** seuls les administrateurs et stockistes accèdent aux exercices.
**Solution :** contactez votre administrateur.

### "Je n'ai pas accès à la page Statistiques"
**Cause :** cette page est réservée aux administrateurs.
**Solution :** contactez votre administrateur.

### "Le badge rouge sur Stock s'affiche"
**Cause :** un ou plusieurs produits sont sous leur seuil d'alerte.
**Solution :** allez dans la page **Stock** et enregistrez une entrée pour les produits surlignés.

### "Ma vente de délégué est en attente depuis longtemps"
**Cause :** les ventes délégués doivent être validées par le stockiste.
**Solution :** contactez votre stockiste pour qu'il valide votre mouvement.

### "Je vois 'PROVISOIRE' sur mes PDF"
**Cause :** l'exercice n'est pas encore clôturé. Les chiffres peuvent encore évoluer.
**Solution :** la mention disparaît automatiquement une fois l'exercice clôturé.

### "Je ne retrouve plus un patient"
**Cause :** le patient a peut-être été archivé.
**Solution :** dans la liste des patients, activez le filtre **Afficher les archivés**.

### "J'ai oublié mon mot de passe"
**Solution :** contactez votre administrateur. Il peut réinitialiser votre mot de passe depuis la gestion des utilisateurs.

### "Le visualiseur de fichier affiche une page blanche"
**Cause :** le fichier est peut-être corrompu ou dans un format non pris en charge.
**Solution :** utilisez le bouton **Télécharger** (⬇) pour récupérer le fichier et l'ouvrir localement.

### "Le bilan de l'exercice montre des chiffres inattendus"
**Cause possible 1 :** des factures sont partiellement payées — elles ne sont pas comptabilisées.
**Cause possible 2 :** des ventes délégués sont encore en attente de validation.
**Cause possible 3 :** les taux de commission ont été modifiés en cours d'exercice.
**Solution :** consultez le tableau des créanciers et la liste des ventes en attente.

---

*Pour toute question non couverte dans ce manuel, contactez votre administrateur système.*

*Manuel utilisateur GECAM — Version 3.0 — Juin 2026*
