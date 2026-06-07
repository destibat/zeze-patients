# Questions et décisions — Bons de Commande MAPA

## Travail nocturne — 2026-06-07

---

## Q1 — Format PDF officiel MAPA
**Question :** Le format que j'ai créé est-il conforme au Bon de Commande officiel MAPA ?

**Décision prise :** J'ai créé un format professionnel avec :
- Logo MAPA en en-tête (logo-mapa.jpg)
- Numéro de BC, date, cabinet commandeur
- Tableau produits : Désignation / Quantité / Prix unitaire / Montant
- Total général
- Zone signature
- Footer MAPA (footer-mapa.jpg)

**À valider :** Si MAPA a un modèle officiel précis (numéros de compte, adresse MAPA, etc.), il faudra adapter le service `pdfBonCommandeMapaService.js`.

---

## Q2 — Références produits MAPA
**Question :** Les produits MAPA ont-ils des codes/références spécifiques ?

**Décision prise :** J'ai ajouté un champ optionnel `reference_mapa` dans les lignes JSON, affiché dans le PDF si présent. En l'absence de référence, seul le nom du produit s'affiche.

**À valider :** Si MAPA utilise un catalogue avec codes produits, il faudrait ajouter un champ `reference_mapa` sur la table `produits` — à faire dans un futur ticket.

---

## Q3 — Format du numéro de Bon de Commande
**Question :** Quel format pour le numéro de BC ?

**Décision prise :** `BC-{ANNEE}-{NNNNNN}` (ex: `BC-2026-000001`), incrémental par cabinet. Compatible avec le format des autres numéros (ORD-2026-XXXXX).

**À valider :** Si MAPA impose un format différent de numérotation, ajuster `numeroBonCommandeService.js`.

---

## Q4 — Accès au module BC MAPA
**Question :** Quels rôles peuvent créer/consulter les Bons de Commande MAPA ?

**Décision prise :** Uniquement **administrateur** et **stockiste** (pas les revendeurs ni les secrétaires). Le module BC MAPA concerne la relation cabinet ↔ MAPA, pas la relation stockiste ↔ revendeur.

**À valider :** Si un rôle supplémentaire doit avoir accès, modifier les middlewares `autoriser()` dans `bonCommandeMapaRoutes.js`.

---

## Q5 — Statuts du Bon de Commande
**Décision prise :**
- `brouillon` — en cours de rédaction, modifiable
- `envoye` — finalisé/envoyé à MAPA, verrouillé (PDF généré)
- `livre` — marqué livré (Étape 2, structure DB déjà prévue)

Pas de statut "refusé" car MAPA ne refuse pas des BC — ils livrent ou non.

---

## Q6 — Lien avec le stock (Étape 2)
**Décision prise :** La colonne `date_livraison_prevue` et `date_livraison_effective` sont déjà dans la DB pour l'Étape 2. Aucun code de mise à jour du stock n'a été implémenté — conformément aux instructions.

**À faire en Étape 2 :** Ajouter route `POST /bons-commande-mapa/:id/marquer-livre` qui met à jour le stock cabinet pour chaque ligne du BC.
