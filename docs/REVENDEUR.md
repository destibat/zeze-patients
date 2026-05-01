# Gestion des Revendeurs (Délégués)

## Rôles impliqués

| Rôle | Accès |
|---|---|
| `delegue` | Achète du stock, vend directement, consulte ses gains |
| `stockiste` | Valide les ventes, voit les factures d'achat, voit les gains |
| `administrateur` | Accès complet à tout |

Un revendeur est toujours rattaché à un stockiste via le champ `users.stockiste_id`.

---

## 1. Achat de stock (revendeur → cabinet)

Le revendeur prend des produits dans le stock du cabinet pour alimenter son propre stock.

### Ce qui se passe

```
POST /api/stock-delegue/acheter
{ produit_id, quantite }
```

Dans une seule transaction atomique :

1. **Vérification** — `Produit.quantite_stock >= quantite` (avec verrou de ligne)
2. **Stock cabinet décrémenté** — `Produit.quantite_stock -= quantite`
3. **StockMouvement créé** — type `sortie`, motif `Transfert revendeur — <prenom> <nom>`
4. **Stock revendeur incrémenté** — `StockDelegue.quantite += quantite` (créé si inexistant)
5. **MouvementDelegue créé** — type `achat`, `commission_stockiste = 0`, `gain_delegue = 0`
6. **FactureAchat créée** — `statut_paiement = 'en_attente'`, liée au stockiste parrain

### Tables impactées

| Table | Changement |
|---|---|
| `produits` | `quantite_stock` diminue |
| `stock_mouvements` | Nouvelle ligne type `sortie` |
| `stock_delegue` | `quantite` augmente |
| `mouvements_delegue` | Nouvelle ligne type `achat` |
| `factures_achat` | Nouvelle ligne `en_attente` |

---

## 2. Vente directe (revendeur → patient)

Le revendeur vend des produits de son propre stock directement à un patient, sans ordonnance.

### Ce qui se passe

```
POST /api/stock-delegue/vendre
{ lignes: [{ produit_id, quantite, prix_unitaire, nom_produit }], client_nom? }
```

Dans une seule transaction atomique :

1. **Vérification stock** — pour chaque produit : `StockDelegue.quantite >= quantite`
2. **Stock revendeur décrémenté** — `StockDelegue.quantite -= quantite` pour chaque ligne
3. **MouvementDelegue créé** — type `vente`, statut `en_attente`, exercice courant requis

Le `montant_total`, `commission_stockiste` et `gain_delegue` sont calculés à la validation (pas à la création).

### Tables impactées

| Table | Changement |
|---|---|
| `stock_delegue` | `quantite` diminue pour chaque produit |
| `mouvements_delegue` | Nouvelle ligne type `vente`, statut `en_attente` |

---

## 3. Validation d'une vente (stockiste → revendeur)

Le stockiste confirme qu'il a bien reçu le paiement du revendeur et que la vente est conforme.

```
PUT /api/stock-delegue/:id/valider
{ mode_paiement: 'especes' | 'mobile_money' | 'virement' | 'cheque' | null }
```

- `mode_paiement = null` → vente validée mais **paiement en attente**
- `mode_paiement = 'especes'` (ou autre) → paiement reçu immédiatement

**Effet** : `MouvementDelegue.statut` passe à `valide`. Les gains sont alors comptabilisés.

### Refus d'une vente

```
PUT /api/stock-delegue/:id/refuser
```

Le stock du revendeur est **restauré** (les quantités vendues sont re-créditées dans `StockDelegue`).

---

## 4. Calcul des gains

Les gains sont calculés dynamiquement à partir des ventes **validées** (`statut = 'valide'`).

### Taux appliqués

| Part | Taux | Commentaire |
|---|---|---|
| Revendeur | 15 % fixe | `TAUX_DELEGUE = 0.15` dans le contrôleur |
| Stockiste | `commission_rate - 15 %` | `commission_rate` défini sur le compte stockiste |
| Cabinet (MAPA) | `100 % - commission_rate` | Le reste revient au cabinet |

**Exemple** avec `commission_rate = 25 %` et une vente de 100 000 FCFA :

| Bénéficiaire | Calcul | Montant |
|---|---|---|
| Revendeur | 100 000 × 15 % | 15 000 FCFA |
| Stockiste | 100 000 × 10 % | 10 000 FCFA |
| Cabinet (MAPA) | 100 000 × 75 % | 75 000 FCFA |

### Où sont calculés les gains

- `gain_delegue` et `commission_stockiste` sont stockés dans `mouvements_delegue` à la validation
- `obtenirGainsDelegues()` agrège les ventes validées du mois par revendeur
- `ventesDirectesDelegues()` retourne les totaux par revendeur pour l'onglet Gains

---

## 5. Factures d'achat

Chaque achat revendeur génère automatiquement une `FactureAchat`.

### États

| Statut | Signification |
|---|---|
| `en_attente` | Créé à l'achat — paiement non encore reçu |
| `paye` | Stockiste a encaissé le paiement |

### Qui voit quoi

| Rôle | Vue | Onglet dans l'interface |
|---|---|---|
| Revendeur | Ses propres achats | « Mes achats » |
| Stockiste | Achats de ses revendeurs | « Factures revendeurs » |
| Admin | Tous les achats | « Factures revendeurs » |

### Marquer comme payé

```
PATCH /api/factures-achat/:id/payer
{ mode_paiement: 'especes' | 'mobile_money' | 'virement' | 'cheque' }
```

Renseigne `statut_paiement = 'paye'`, `mode_paiement` et `date_paiement`.

---

## 6. Schéma des tables

```
users
  └── stockiste_id → users.id (stockiste parrain)

stock_delegue
  ├── delegue_id → users.id
  └── produit_id → produits.id
  (quantite : stock actuel du revendeur)

mouvements_delegue
  ├── delegue_id → users.id
  ├── produit_id → produits.id  (achat uniquement)
  ├── lignes : JSON             (vente uniquement)
  ├── type : 'achat' | 'vente'
  └── statut : 'en_attente' | 'valide' | 'refuse'  (vente uniquement)

factures_achat
  ├── mouvement_id → mouvements_delegue.id
  ├── delegue_id   → users.id
  ├── stockiste_id → users.id
  └── statut_paiement : 'en_attente' | 'paye'

stock_mouvements  (stock cabinet)
  ├── produit_id → produits.id
  ├── type : 'sortie'   (créé lors d'un achat revendeur)
  └── motif : 'Transfert revendeur — <nom>'
```

---

## 7. Scripts de maintenance

### Supprimer uniquement les ventes d'un revendeur

Restaure son stock revendeur, supprime les ventes. N'affecte pas le stock cabinet ni les achats.

```bash
sudo bash scripts/delete-ventes-revendeur.sh <conteneur> <email>
```

### Réinitialisation complète d'un revendeur

Restaure le stock cabinet, supprime tout : achats, ventes, factures, stock revendeur.

```bash
sudo bash scripts/reset-stock-revendeur.sh <conteneur> <email>
```
