# Manuel utilisateur — ZEZEPAGNON Dossiers Patients

**Version 1.0 — Avril 2026**

---

## Table des matières

1. [Présentation de l'application](#1-présentation-de-lapplication)
2. [Premiers pas](#2-premiers-pas)
3. [Gestion des patients](#3-gestion-des-patients)
4. [Gestion du stock](#4-gestion-du-stock)
5. [Exercices comptables MAPA](#5-exercices-comptables-mapa)
6. [Statistiques](#6-statistiques)
7. [Administration](#7-administration)
8. [FAQ et résolution de problèmes](#8-faq-et-résolution-de-problèmes)

---

## 1. Présentation de l'application

### À quoi sert ZEZEPAGNON Dossiers Patients ?

ZEZEPAGNON Dossiers Patients est une application de gestion médicale et commerciale conçue pour les cabinets utilisant la pharmacopée africaine (réseau MAPA). Elle permet de :

- **Suivre les patients** : dossier médical complet, consultations, ordonnances, analyses
- **Gérer le stock** de produits et les ventes
- **Suivre les commissions** des stockistes et délégués commerciaux
- **Produire les bilans** d'exercice à remettre à MAPA

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
┌─────────────────────────────────────────────────┐
│  BARRE SUPÉRIEURE  (nom d'utilisateur, déconnexion) │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│   MENU       │        CONTENU PRINCIPAL         │
│   LATÉRAL    │                                  │
│  (navigation)│                                  │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

**Menu latéral** — Cliquez sur une entrée pour naviguer :

| Icône | Page | Rôles |
|-------|------|-------|
| Tableau de bord | Vue d'ensemble | Tous |
| Patients | Dossiers patients | Tous |
| Consultations | Liste des consultations | Admin, stockiste, délégué |
| Rendez-vous | Agenda | Tous |
| Ordonnances | Prescriptions | Admin, stockiste, délégué |
| Facturation | Factures et paiements | Tous |
| Mon stock | Stock personnel | Délégué uniquement |
| Stock | Stock central | Admin, secrétaire |
| Statistiques | Graphiques et rapports | Admin |
| Exercices | Exercices comptables | Admin, stockiste |
| Utilisateurs | Gestion des comptes | Admin |
| Paramètres | Configuration | Admin |

> Le **badge rouge** sur l'entrée Stock indique des produits en dessous du seuil d'alerte.

### Choisir sa langue

Un sélecteur de langue est disponible dans l'interface. L'application est disponible en **français** (par défaut) et en **anglais**. Le choix est enregistré pour votre session.

### Se déconnecter

Cliquez sur votre nom en haut à droite, puis sur **Déconnexion**.

---

## 3. Gestion des patients

### Créer un patient

1. Dans le menu latéral, cliquez sur **Patients**
2. Cliquez sur **Nouveau patient**
3. Remplissez le formulaire :
   - **Obligatoires** : prénom, nom, sexe, date de naissance, téléphone, numéro de dossier
   - **Optionnels** : adresse, ville, pays, profession, groupe sanguin, allergies, antécédents, contact d'urgence, numéro d'assurance, photo
4. Cliquez sur **Enregistrer**

> Le **numéro de dossier** doit être unique. Utilisez une convention propre à votre cabinet (ex : `PAT-2026-001`).

**Allergies** : saisissez chaque allergie et appuyez sur Entrée pour l'ajouter. Elles s'affichent sous forme d'étiquettes colorées dans tout le dossier.

### Consulter une fiche patient

1. Cliquez sur **Patients** dans le menu
2. Utilisez la barre de recherche (nom, prénom, téléphone, numéro de dossier)
3. Cliquez sur le patient pour ouvrir sa fiche

La fiche affiche :
- Informations personnelles et photo
- Allergies et antécédents médicaux
- Historique des consultations
- Ordonnances et fichiers joints
- Analyses NFS

### Ajouter une consultation

1. Ouvrez la fiche du patient
2. Cliquez sur **Nouvelle consultation**
3. Remplissez :
   - Date de consultation
   - Motif de la visite
   - Symptômes, diagnostic, notes de traitement
   - Signes vitaux : tension (systolique/diastolique), fréquence cardiaque, température, poids, taille, saturation en oxygène
4. L'**IMC** (Indice de Masse Corporelle) est calculé automatiquement si poids et taille sont renseignés
5. Cliquez sur **Enregistrer**

### Émettre une ordonnance

1. Depuis une consultation, cliquez sur **Ajouter une ordonnance**
2. Ajoutez les lignes de prescription :
   - Sélectionnez un produit dans la liste
   - Indiquez la quantité et le prix unitaire
3. Le montant total est calculé automatiquement
4. Cliquez sur **Enregistrer** pour créer un brouillon
5. Cliquez sur **Valider** pour finaliser l'ordonnance
6. Téléchargez le **PDF** depuis l'icône d'impression

> Une ordonnance validée ne peut plus être modifiée. Une ordonnance annulée ne peut pas être réactivée.

### Joindre un fichier au dossier

1. Ouvrez la fiche patient, section **Fichiers**
2. Cliquez sur **Ajouter un fichier**
3. Choisissez la catégorie : résultat d'analyse, ordonnance externe, imagerie, autre
4. Sélectionnez le fichier depuis votre ordinateur
5. Cliquez sur **Envoyer**

> Formats acceptés : images, PDF et autres documents. Taille maximale : 10 Mo.

### Saisir des analyses NFS (Numération Formule Sanguine)

1. Ouvrez la fiche patient, section **Analyses NFS**
2. Cliquez sur **Nouvelle analyse**
3. Deux options :
   - **Saisie manuelle** : remplissez chaque valeur (globules rouges, blancs, plaquettes, formule leucocytaire…)
   - **Extraction automatique** : uploadez une image ou un PDF du résultat, l'application tente d'extraire les valeurs
4. Renseignez le sexe du patient et son âge au moment de l'analyse
5. Ajoutez vos conclusions
6. Cliquez sur **Enregistrer**

> Seuls les administrateurs et stockistes peuvent saisir ou modifier des analyses NFS.

### Archiver un patient

L'archivage masque le patient de la liste sans supprimer son dossier. Réservé aux administrateurs et stockistes.

1. Ouvrez la fiche du patient
2. Cliquez sur **Archiver**
3. Confirmez

Pour retrouver un patient archivé, activez le filtre **Afficher les archivés** dans la liste des patients.

---

## 4. Gestion du stock

### Consulter le stock (Admin / Secrétaire)

1. Cliquez sur **Stock** dans le menu latéral
2. La liste affiche tous les produits avec leur quantité en stock et leur seuil d'alerte
3. Les produits **en dessous du seuil** sont surlignés en rouge

### Saisir un mouvement de stock

Les mouvements permettent d'enregistrer des entrées (réception de marchandises), des sorties manuelles ou des ajustements d'inventaire.

1. Dans la page Stock, cliquez sur le produit concerné
2. Cliquez sur **Ajouter un mouvement**
3. Choisissez le type : **Entrée**, **Sortie** ou **Ajustement**
4. Indiquez la quantité et un motif
5. Cliquez sur **Enregistrer**

Le stock est mis à jour instantanément et le mouvement est tracé dans l'historique.

### Comprendre les seuils d'alerte

Chaque produit peut avoir un **seuil d'alerte** (quantité minimale souhaitée en stock).

- Si `quantité en stock < seuil d'alerte`, le produit apparaît en alerte
- Un badge rouge apparaît dans le menu latéral sur l'entrée **Stock**
- Le dashboard affiche également les alertes actives

Pour modifier le seuil d'un produit :
1. Dans la page Stock, cliquez sur le produit
2. Cliquez sur **Modifier le seuil**
3. Saisissez la nouvelle valeur
4. Enregistrez

### Gérer son stock personnel (Délégués)

Les délégués accèdent à leur stock via **Mon stock** dans le menu latéral.

**Acheter du stock au stockiste :**
1. Cliquez sur **Acheter**
2. Choisissez le produit et la quantité
3. Validez — la demande est envoyée en statut *En attente*
4. Le stockiste la valide ou la refuse

**Vendre à un patient :**
1. Cliquez sur **Vendre**
2. Indiquez le client, les produits vendus, les quantités et les prix
3. Choisissez le mode de paiement
4. Validez — la vente est enregistrée en statut *En attente*
5. Le stockiste valide la vente pour qu'elle soit comptabilisée dans l'exercice

**Réagir à une rupture :**
- Si votre stock tombe à zéro, passez une commande d'achat auprès de votre stockiste
- Le stockiste doit avoir du stock disponible côté central
- En cas d'urgence, contactez directement votre stockiste

---

## 5. Exercices comptables MAPA

### Comprendre la notion d'exercice

Un **exercice** est une période comptable pendant laquelle les ventes sont enregistrées et les commissions calculées. À la fin de chaque exercice, un bilan est produit pour MAPA.

**Règles importantes :**
- Il ne peut y avoir qu'**un seul exercice ouvert à la fois**
- Un exercice clôturé est **figé** — ses chiffres ne changent plus
- Les ventes ne peuvent être saisies que si un exercice est ouvert

**Cycle de vie d'un exercice :**

```
[Ouvert] ──clôture──▶ [Clôturé] ──réouverture (admin)──▶ [Rouvert] ──clôture──▶ [Clôturé]
```

### Ouvrir un exercice

> Réservé aux administrateurs et stockistes.

1. Cliquez sur **Exercices** dans le menu
2. Cliquez sur **Ouvrir un nouvel exercice**
3. Choisissez la date d'ouverture (par défaut : aujourd'hui — modifiable pour une ouverture rétroactive)
4. Confirmez

L'exercice reçoit automatiquement un numéro au format `EX-2026-001`.

### Suivre un exercice en cours

Le **tableau de bord** affiche en temps réel :
- Le numéro de l'exercice en cours
- La date d'ouverture et la durée en jours
- Le chiffre d'affaires accumulé (rafraîchi automatiquement)

La barre en haut de l'écran rappelle également l'exercice actif.

### Clôturer un exercice

> Réservé aux administrateurs et stockistes.

1. Dans la page **Exercices**, identifiez l'exercice ouvert
2. Cliquez sur **Clôturer**
3. Confirmez

À la clôture :
- Le bilan complet est calculé et figé (snapshot)
- Un nouvel exercice est **automatiquement ouvert** avec comme date d'ouverture la date de clôture du précédent

### Lire le bilan

Depuis la page **Exercices**, cliquez sur **Voir le bilan** d'un exercice.

Le bilan présente :

**Chiffre d'affaires total**
- CA issu des factures directes
- CA issu des ventes des délégués (validées)

**Par stockiste**
- CA des ventes directes et via délégués
- Commission totale perçue

**Par délégué**
- CA réalisé, nombre de ventes
- Gain délégué (15% du CA)
- Commission reversée au stockiste

**Montant à verser à MAPA**
```
Montant MAPA = CA total − commissions stockistes − commissions délégués
```

**Top 20 produits**
- Classement par chiffre d'affaires

### Imprimer le bilan (Fiches PDF)

Depuis la page bilan, section **Fiches PDF**, quatre documents sont disponibles :

| Fiche | Contenu |
|-------|---------|
| **Fiche MAPA** | Récapitulatif global à remettre au parrain MAPA |
| **Détail produits** | Top 20 produits avec CA et quantités |
| **Récap délégués** | Synthèse par délégué (CA, gains, commissions) |
| **Bilan délégué** | Bilan individuel d'un délégué (accessible au délégué lui-même) |

Pour la **Fiche MAPA**, vous pouvez saisir le nom du parrain avant de télécharger.

> Les exercices non clôturés portent la mention **PROVISOIRE** sur les PDF.

### Cas particulier : réouverture d'un exercice

> Réservé aux administrateurs uniquement.

Si une erreur a été détectée après clôture, un administrateur peut rouvrir un exercice clôturé.

1. Dans la liste des exercices, cliquez sur **Rouvrir**
2. Saisissez le **motif de réouverture** (obligatoire)
3. Confirmez

**Attention :** un exercice ne peut être rouvert que si aucun autre exercice n'est actuellement ouvert.

---

## 6. Statistiques

> Réservé aux administrateurs.

Accédez aux statistiques via **Statistiques** dans le menu latéral.

### Vue par période calendaire

Filtrez par plage de dates pour voir :
- Évolution du chiffre d'affaires par mois
- Répartition par catégorie de produit
- Nombre de patients et de consultations
- Top produits et top prescripteurs

### Vue par exercice

Sélectionnez l'onglet **Par exercice** pour comparer les résultats exercice par exercice :
- CA total par exercice
- Durée de l'exercice
- Comparaison avec les exercices précédents

### Comparer des exercices

Les graphiques par exercice permettent de visualiser la progression d'un exercice à l'autre pour identifier les tendances et les meilleures périodes.

---

## 7. Administration

> Fonctionnalités réservées aux administrateurs.

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
2. Modifiez les informations souhaitées (y compris l'e-mail / identifiant de connexion)
3. Enregistrez

**Réinitialiser un mot de passe :**
1. Ouvrez la fiche de l'utilisateur
2. Cliquez sur **Réinitialiser le mot de passe**
3. Saisissez un mot de passe temporaire
4. L'utilisateur devra le changer à sa prochaine connexion

**Désactiver / Réactiver un utilisateur :**
- Un utilisateur désactivé ne peut plus se connecter
- Ses données sont conservées
- La désactivation est réversible

### Configurer les paramètres du cabinet

Accédez à **Paramètres** dans le menu latéral.

- **Nom et adresse du cabinet** : apparaissent sur les fiches PDF
- **Taux de commission délégué** : taux appliqué à toutes les ventes des délégués (défaut : 15%)
- **Taux de commission stockiste global** : taux propagé à tous les stockistes actifs lors de la modification
- **Images ordonnance** : logo et signature à imprimer en en-tête et pied d'ordonnance

---

## 8. FAQ et résolution de problèmes

### "Je ne peux pas saisir une vente"

**Cause :** aucun exercice comptable n'est ouvert.
**Solution :** demandez à votre administrateur ou stockiste d'ouvrir un exercice via la page **Exercices**.

### "Je n'ai pas accès à la page Exercices"

**Cause :** seuls les administrateurs et stockistes accèdent aux exercices.
**Solution :** contactez votre administrateur si vous pensez avoir besoin de cet accès.

### "Je n'ai pas accès à la page Statistiques"

**Cause :** cette page est réservée aux administrateurs.
**Solution :** contactez votre administrateur.

### "Le badge rouge sur Stock s'affiche"

**Cause :** un ou plusieurs produits sont en dessous de leur seuil d'alerte.
**Solution :** allez dans la page **Stock**, identifiez les produits surlignés en rouge et enregistrez une entrée de stock.

### "Ma vente de délégué est en attente depuis longtemps"

**Cause :** les ventes délégués doivent être validées par le stockiste ou l'administrateur.
**Solution :** contactez votre stockiste pour qu'il valide votre mouvement dans sa page de gestion des délégués.

### "J'ai oublié mon mot de passe"

**Solution :** contactez votre administrateur. Il peut réinitialiser votre mot de passe depuis la gestion des utilisateurs.

### "Le bilan de l'exercice montre des chiffres qui ne correspondent pas"

**Cause possible 1 :** des ventes délégués sont encore en attente de validation — elles ne sont pas comptabilisées.
**Cause possible 2 :** pour un exercice ouvert, les commissions sont recalculées avec les taux actuels. Si les taux ont changé en cours d'exercice, le bilan provisoire peut différer du bilan final.

### "Je vois 'PROVISOIRE' sur mes PDF"

**Cause :** l'exercice n'est pas encore clôturé. Les chiffres peuvent encore évoluer.
**Solution :** la mention disparaît automatiquement une fois l'exercice clôturé.

### "Je ne retrouve plus un patient"

**Cause :** le patient a peut-être été archivé.
**Solution :** dans la liste des patients, activez l'affichage des patients archivés (filtre ou option selon l'interface).

---

*Pour toute question non couverte dans ce manuel, contactez votre administrateur système.*
