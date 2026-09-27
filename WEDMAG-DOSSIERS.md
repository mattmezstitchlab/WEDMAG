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
