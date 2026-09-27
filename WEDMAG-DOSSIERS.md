# WEDMAG — Dossiers vivants — Phase 1

**Date :** 27 septembre 2026 · **Branche :** `arena/01a0e298-wedmag`
**Référence produit :** évolution « Des couvertures éditoriales vers des dossiers vivants »
**Statut :** Phase 1 **implémentée et vérifiée** (couverture → dossier → timeline →
ouverture du dossier, état Inspiration/Sélection persisté ; migration non
destructive validée sur données réelles ; 79/79 tests, runtime PostgreSQL,
chemin 503 et absence de duplication vérifiés).
**Principe directeur :** *Plus profond sans paraître plus complexe. Éditorial à l'extérieur, précis à l'intérieur.*

---

## EXISTANT (audit)

| Élément | État réel |
|---|---|
| Couvertures | 36 sujets éditoriaux (`src/lib/wedding-data.ts`), grille pré-rendue, fiche sujet overlay |
| Catalogue | Source de vérité unique : `subjects` (moments canoniques, services, à prévoir, contraintes, professionnels) — référencé par `subjectId` partout, jamais copié |
| Sélections | `Record<subjectId, status>` (interested/contacted/chosen) + table `wedding_selections` — « l'édition personnelle », le niveau sauvegarde |
| Mariage | `wedding_projects` (1 par session anonyme) + `wedding_project_items` (préférences rattachées, source `wedmag`) — couche PACTE MVP livrée précédemment |
| Timeline | 12 moments canoniques → 3 phases AVANT / LE JOUR / APRÈS (`buildProjectTimeline`, réutilise le moteur chronologique unique, testé) |
| Persistance | `localStorage` (miroir) + API honnête `local_only` / `server` / `unavailable` (503), cookie de session unique, validation stricte contre le catalogue |
| État du mariage | Drawer « MON MARIAGE » : timeline des éléments rattachés + pool d'inspirations à rattacher + insights ; aucune entité « dossier », « prestataire », « contrat », « document » n'existe |
| Tests | 67 (tri chronologique, validation, fusion de restauration, câblage routes) |

## À CONSERVER (ne pas toucher)

- Le design éditorial, les couvertures, la grille, la fiche sujet, le hero, le drawer et son langage visuel.
- Les 36 sujets du catalogue et leurs données — unique source de vérité.
- Les sélections (« édition personnelle ») et leur statut — le niveau *découverte/sauvegarde*.
- Le moteur chronologique (`sortWeddingSelectionsByMoment`) et les 3 phases.
- La dégradation de persistance (local_only / server / 503) et le cookie de session.
- La validation stricte des `subjectId` contre le catalogue.
- Toutes les routes existantes et leurs contrats.

## NOUVEAU MODÈLE — la couverture devient une porte

```
COUVERTURE (découverte, inchangée)
  → « + » / « Ajouter à mon mariage » (sauvegarde l'inspiration — existant)
     └─ si un mariage existe : CRÉATION DU DOSSIER (état initial SÉLECTION)
        └─ le DOSSIER vit dans « Mon mariage », sur la Timeline, par phase
           └─ ouverture du dossier : la couverture reste son identité visuelle
```

Le **dossier** est l'évolution naturelle de l'item PACTE (`wedding_project_items`) :
ce n'est **pas** un système parallèle — c'est la même entité qui grandit
(rattachement → dossier), renommée et enrichie. Une information = une source
de vérité : le dossier **référence** le sujet du catalogue (titre, visuel,
moments, contenus éditoriaux viennent du catalogue ; le dossier n'en copie
rien).

## DONNÉES — entités et champs (Phase 1)

**`wedding_dossiers`** (renommage/évolution de `wedding_project_items`,
migration non destructive `ALTER` — aucune donnée perdue) :

| Champ | Rôle |
|---|---|
| `id` uuid PK | **clé stable pour toutes les futures couches** (prestataire, contrat, documents, paiements, échéances s'y relieront) |
| `project_id` FK → `wedding_projects` (cascade) | appartenance au mariage |
| `subject_id` text | **référence** au sujet du catalogue (unique par projet) |
| `state` text, défaut `selection` | état du dossier (machine ci-dessous) |
| `source` text, défaut `wedmag` | provenance |
| `created_at` / `updated_at` | traçabilité (updated_at bouge à chaque changement d'état) |
| UNIQUE (`project_id`, `subject_id`) | un dossier par sujet et par mariage — duplication impossible |

**Machine à états du dossier** — modélisée en entier, exposée
progressivement :

```
INSPIRATION → SÉLECTION → CONTACT → PROPOSITION → ENGAGEMENT → CONTRAT
→ CONFIRMÉ → PRÉPARATION → JOUR J → ARCHIVE
```

Phase 1 : seuls `inspiration` et `selection` sont **définissables** par
l'utilisateur (les autres sont refusés en 400 « pas encore disponible » —
jamais simulés). État initial à la création : `selection` (l'acte d'ajouter
au mariage EST la sélection ; `inspiration` reste atteignable en retour,
pour garder un dossier « en veille »).

## RELATIONS (préparées, Phase 1 = 2 tables réelles)

```
GAIA (intelligence — propose, ne décide pas)         ┐
PACTE (moteur universel relations/engagements)       ├─ futur
WEDMAG (expérience mariage)                          ┘
  └─ MARIAGE (wedding_projects — existe)
      └─ DOSSIER (wedding_dossiers — Phase 1)  ←─ référence ─→ CATALOGUE (36 sujets)
          ├─ PRESTATAIRE (personne/organisation réutilisable, rôle porté
          │  par la RELATION, pas par l'identité)      — futur
          ├─ PROPOSITION / CONTRAT / ENGAGEMENT        — futur
          ├─ DOCUMENT / PREUVE (liés au contexte)      — futur
          ├─ PAIEMENT / ÉCHÉANCE                       — futur
          └─ ÉVÉNEMENT (Timeline enrichie)             — futur
```

Chaque future couche = **tables additives** référençant `dossier_id` —
jamais de colonnes « type » fourre-tout, jamais de duplication d'entité.

## PHASE 1 — modifications exactes

1. **Migration 0002** (non destructive) : `wedding_project_items` →
   `wedding_dossiers` + `id`, `state`, `updated_at`, contrainte unique.
2. **Domaine** (`wedding-pacte.ts`) : vocabulaire complet des 10 états +
   libellés FR + états définissables Phase 1 ; les types passent d'`items`
   à `dossiers` (avec état) ; `buildProjectTimeline` inchangé (il consomme
   des `subjectId`).
3. **API** (`/api/wedding/project`) : `attach` crée désormais le dossier
   (état initial `selection`) ; `detach` le retire ; **nouveau `set-state`**
   (`subjectId` + état, validé : vocabulaire complet, refus propre des états
   réservés) ; GET renvoie les dossiers (id, état, source).
4. **Client** :
   - couverture « + » → sauvegarde l'inspiration (existant) **et** crée le
     dossier si le mariage existe (toast dédié) ;
   - pool du drawer : « Inspirations sans dossier » → action « Créer le
     dossier » (proposition du système, validation humaine) ;
   - Timeline : les lignes sont les dossiers, avec leur **état**
     (Inspiration/Sélection) ; clic → **ouverture du dossier** ;
   - **fiche dossier** : overlay éditorial réutilisant la charte — couverture
     = identité visuelle, état, moments, contenus réels du catalogue
     (services, à prévoir, contraintes), note éditoriale sur la suite
     (prestataire, proposition, contrat, documents, paiements, échéances —
     texte, jamais des modules simulés), retrait du mariage ;
   - compatibilité localStorage : les anciens miroirs (`items`) sont
     normalisés en dossiers (`state: selection`).
5. **Tests** : états du dossier (vocabulaire, états Phase 1), validation
   `set-state`, fusion, câblage route — la batterie existante reste verte.

## RISQUES (identifiés avant code)

| Risque | Traitement |
|---|---|
| Duplication d'entité dossier/item | Aucune : renommage/évolution de la même table, migration `ALTER` |
| Perte de données en migration | SQL non destructif vérifié sur PostgreSQL réel (renommage + colonnes avec défauts) |
| Doublon conceptuel « statut de sélection » (interested/contacted/chosen) vs « état du dossier » | Constaté et tranché : le statut reste au niveau édition personnelle (pool), l'état appartient au dossier (timeline). Convergence prévue quand la couche CONTACT/prestataire existera — documenté |
| Régression du parcours existant | Le « + » garde son comportement quand aucun mariage n'existe ; batterie runtime complète rejouée (local, 503, PostgreSQL) |
| UX qui devient SaaS | Aucun nouveau chrome : overlay réutilise la fiche sujet, une seule action par couverture, pas de badge/pill superflu |
| Faux états simulés | Les 8 états futurs sont modélisés mais refusés à l'écriture (400) — rien n'est affiché comme existant |

---

# PHASE 1.1 — DOSSIER NAVIGABLE

**Date :** 27 septembre 2026 · **Base :** commit `ff72aa7` (Phase 1 validée)
**Périmètre unique :** faire du dossier le centre de navigation de « Mon mariage ».
Aucune couche métier (prestataire, contrat, documents, paiements…) — rien de simulé.

## Audit de l'existant (avant code)

| Constat | Détail | Décision |
|---|---|---|
| **UUID droppé côté client** | `GET /api/wedding/project` renvoie `dossiers[].id` (uuid) mais le client ne conserve que `{state, source}` — le dossier n'a pas d'identité propre en dehors du `subjectId` | Porter l'UUID dans l'état client ; clé de navigation = `dossier.id ?? subjectId` |
| **Fiche sujet → drawer** | Le bouton « ✓ DANS MON MARIAGE — VOIR LE PROJET » ouvre le drawer général, pas le dossier du sujet | Ouvrir directement **le dossier** (un écran de moins, navigation dossier-centric) |
| **Fiche dossier sans retour** | Aucun lien dossier → sujet source ; navigation à sens unique | Ajouter « Voir la couverture » → fiche sujet (bidirectionnalité SUJET ↔ DOSSIER) |
| **`set-state` sur dossier inexistant** | `UPDATE … WHERE` correspond à 0 ligne → `200 ok:true` (succès mensonger) | `.returning()` + `400 "No dossier for this subject"` |
| **Statuts concurrents** | Vérifiés : aucun — la timeline mariage affiche l'état du dossier, le pool affiche le statut d'édition (niveaux distincts documentés) | Rien à supprimer |
| **Timeline** | Les dossiers y sont déjà (Phase 1) ; clic → fiche dossier | Conserver, clé = UUID |
| **Routing** | Aucune route dossier n'existe ; l'architecture est une page unique statique + overlays (fiche sujet, drawer, fiche dossier) | **Décision documentée : pas de nouvelle route.** La fiche dossier est la vue canonique du dossier — l'« équivalent cohérent avec l'architecture existante » (une route dédiée fragmenterait l'expérience éditoriale et dupliquerait le shell). L'UUID reste la référence stable interne |
| **Migration / schéma** | Aucun changement de schéma nécessaire — l'UUID existe déjà côté serveur | Pas de migration en 1.1 |

## Modèle de navigation cible

```
SUJET ÉDITORIAL (couverture, fiche sujet)
        ↕  « Ajouter à mon mariage » / « Voir la couverture »
DOSSIER (fiche dossier : couverture = identité, état, chronologie)
        ↕  timeline « Mon mariage »
MARIAGE (agrégation de ses dossiers)
```

Une seule source de vérité : le dossier **référence** son sujet (`subjectId`),
le client référence le dossier par son **UUID** (retombée locale : `subjectId`
quand la persistance serveur est absente — `local_only`).

## Modifications exactes (Phase 1.1)

1. **Domaine** (`wedding-pacte.ts`) : `WeddingDossier` et l'état client
   gagnent `id: string | null` ; `normalizeWeddingState` le parse (uuid
   valide ou `null`) ; `mergeRestoredWedding` **préserve l'UUID serveur**
   quand une action locale en cours n'en a pas (fusion par entrée).
2. **Client** :
   - l'UUID du dossier est conservé depuis le GET ;
   - timeline : clé React = `dossier.id ?? subjectId` ;
   - fiche sujet : si un dossier existe → bouton « OUVRIR LE DOSSIER »
     (ouvre la fiche dossier, referme la fiche sujet) ;
   - fiche dossier refondue selon la structure recommandée : grande
     couverture (identité), titre + état + univers/catégorie, « Ce dossier »
     (description du sujet source), **Chronologie** (moments canoniques),
     **État du dossier** (Inspiration/Sélection, persisté), « À venir »
     (texte éditorial discret — jamais de modules vides ni de « — »),
     « Voir la couverture » (retour sujet source), retrait du mariage.
3. **API** : `set-state` refuse proprement un dossier inexistant (400) —
   plus de succès mensonger. Aucun autre changement de contrat.
4. **Tests** : domaine (UUID préservé à la fusion, normalisation id
   valide/invalide), API/runtime (voir §17 de la mission).

## Non construit (rappel)

Prestataire, offre, contrat, documents, paiements, échéances, preuves,
décisions : **aucun widget, aucune fausse donnée**. L'UUID du dossier reste
l'ancre métier pour toutes ces couches futures (elles référenceront
`dossier.id`).

## Risques

- La fusion locale/serveur devient par-entrée (état local gagne, UUID
  serveur conservé) — couverte par des tests dédiés.
- Vérification visuelle mobile impossible dans cet environnement (pas de
  navigateur) — **limitation documentée**, revue CSS statique des
  breakpoints uniquement.

---

# PHASE — DOSSIER → PARCOURS PERSONNALISÉ

**Date :** 27 septembre 2026 · **Base :** commit `4128a40` (Phases 1 et 1.1 validées)
**Objectif :** la première preuve tangible de `COUVERTURE → DOSSIER → PARCOURS CONTEXTUEL`.
**Statut :** **implémentée et vérifiée** (parcours dérivé du sujet, transition éditoriale à
la création du dossier, progression persistée 0→8 avec borne serveur, isolation
des mariages, 94/94 tests, runtime PostgreSQL, chemin 503).

## EXISTANT (audit)

| Élément | État |
|---|---|
| Dossiers | `wedding_dossiers` (id uuid, project_id, subject_id, state, source, created/updated) — le dossier référence son sujet catalogue, jamais une copie |
| Catalogue | 36 sujets portant des données réelles utilisables pour déduire un parcours : `type` (Métier/Lieu/Expérience/Service/Objet), `style`, `brings`, `toPlan`, `constraints`, `moments`, `professionals` |
| Timeline | 3 phases AVANT / LE JOUR / APRÈS, moteur chronologique unique — les dossiers y sont affichés |
| Navigation | couverture ↔ fiche sujet ↔ dossier ↔ drawer (Phase 1.1), clé = dossier.id |
| États | dossier : inspiration/selection actifs, 8 états réservés refusés en 400 |
| Persistance | POST `/api/wedding/project` (create/attach/detach/set-state), GET honnête (local_only/server/unavailable), validation stricte contre le catalogue |
| Parcours | **N'existe pas** — aucune entité, aucune étape, aucun accompagnement |

## NOUVEAU CONCEPT

La couverture choisie exprime une **intention** ; le dossier est **ce qui existe** ;
le parcours est **comment le couple avance** — une couche d'accompagnement
contextuelle, jamais un catalogue de formations :

```
COUVERTURE → AJOUT → DOSSIER (créé) → « Votre dossier est créé.
Nous avons préparé un parcours pour vous. » → OUVERTURE DU PARCOURS
```

Le parcours est **déduit du dossier** (donc de son sujet source) par une
fonction pure `buildDossierParcours(subject)` : l'arc éditorial (7 à 8 étapes)
varie selon le `type` du sujet (Métier, Lieu, Objet, Service, Expérience) et
chaque étape est **nourrie par les données réelles du catalogue** (brings,
toPlan, style, professionals, constraints, moments). Aucune étape n'est
inventée : détail absent → pas de détail. Une donnée inconnue reste inconnue.

## MODÈLE PROPOSÉ (minimal, sans nouvelle entité)

**Décision : pas de table `parcours` à ce stade.** Le parcours est porté par
son conteneur :

- **Définition des étapes** : dérivée à l'exécution du sujet catalogue
  (fonction pure partagée client/serveur — une seule source de vérité, zéro
  duplication, zéro « deuxième identifiant concurrent »).
- **Progression** : une colonne `parcours_progress integer DEFAULT 0` sur
  `wedding_dossiers` = nombre d'étapes validées par le couple. Le parcours
  est donc **relié au dossier.id par construction** (il vit sur sa ligne).
- **Statut du parcours** : dérivé (`progress == 0` → à commencer ;
  `progress < steps.length` → en cours ; `==` → complété). Jamais stocké.

Quand un parcours devra être adressable indépendamment (attestation, programme
annuel), une table `wedding_parcours(id, dossier_id, type, status…)` sera
introduite en référençant `dossier_id` — architecture documentée, non figée.

Migration 0003 : `ALTER TABLE wedding_dossiers ADD COLUMN parcours_progress
integer DEFAULT 0 NOT NULL` — additive, non destructive.

## RELATIONS

```
MARIAGE (wedding_projects)
  └── DOSSIER (wedding_dossiers)  ←── référence ── SUJET CATALOGUE (36)
        └── PARCOURS (couche)  = étapes dérivées du sujet + progression (colonne)
              └── chaque validation d'étape = action utilisateur persistée
```

Le parcours ne **duplique rien** du dossier ni du sujet ; il ne crée **aucune
échéance** (les étapes pourront plus tard en générer — hors périmètre).

## DONNÉES

- `wedding_dossiers.parcours_progress` (int, 0 → steps.length, contrôlé
  serveur via la même fonction de dérivation).
- API : `POST /api/wedding/project` gagne l'action `parcours-step`
  (`subjectId`) — valide l'étape suivante, séquentiel ; 400 si le dossier
  n'existe pas ou si le parcours est déjà complété. GET renvoie
  `parcoursProgress` par dossier.
- Client : progression portée dans l'état du mariage, miroir localStorage
  (normalisation : entier ≥ 0, sinon 0).

## CE QUI RESTE HORS PÉRIMÈTRE

Échéances, prestataire, offres, contrats, documents, paiements, preuves,
décisions · personnalisation par date/lieu/budget (données inconnues →
« à confirmer », jamais supposées) · programme annuel multi-dossiers ·
parcours lié à un lieu (l'Eden du Mont Noir restera une **donnée de
contextualisation**, jamais une exception technique) · attestation
(« attestation de parcours », pas « diplôme » — cadre juridique à définir) ·
transmission de méthode. Rien de tout cela n'est simulé.

## RISQUES

- **Dérivation figée dans le code** : si l'arc change, `parcours_progress`
  stocké peut dépasser le nouveau nombre d'étapes → le serveur borne à la
  longueur dérivée et l'UI affiche « complété » au-delà ; transition douce.
- **Progression locale/serveur** : règle existante par entrée (l'action en
  cours gagne) — la progression ne décroît jamais côté serveur.
- Vérification visuelle mobile impossible (pas de navigateur) — limitation
  documentée, styles réutilisant les breakpoints existants.
