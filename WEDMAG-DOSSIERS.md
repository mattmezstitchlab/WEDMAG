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

# PHASE — L'EDEN DU MONT NOIR / PROGRAMMES DE VIE

Statut : **rapport d'audit écrit avant code ; micro-phase E1 (la situation)
implémentée et vérifiée** (voir fin de section). Tout le reste — séances,
intervenants, lieu, arcs non-mariage, économie, transmission, attestation —
est **documenté et refusé** : prématuré, aucune donnée réelle n'existe.

## EXISTANT (audit — les 11 points demandés)

1. **`wedding_dossiers`** : id uuid (ancrage), project_id FK cascade,
   subjectId référence catalogue (jamais de copie), state (10 états modélisés,
   2 settables), source, created/updated. Index unique (project_id,
   subject_id). Aucune donnée éditoriale dupliquée.
2. **`parcours_progress`** : colonne integer NOT NULL DEFAULT 0 (migration
   0003 additive). Étapes DÉRIVÉES à l'exécution par `buildDossierParcours`
   (fonction pure partagée client/serveur — arc selon le type du sujet,
   détails issus des données réelles uniquement, null si absent). Le serveur
   borne la progression à la longueur dérivée. Pas de table parcours, pas
   d'identifiant concurrent.
3. **Catalogue** : 36 sujets réels — 12 Métier, 11 Service, 7 Objet, 4
   Expérience, 2 Lieu ; 19 univers ; chaque sujet porte moments, services,
   brings, toPlan, constraints, resources, related, professionals. Les types
   de sujet sont **déjà universels** (un doula serait un Métier, une balade
   en forêt une Expérience) — c'est le contenu, pas la structure, qui est
   100 % mariage.
4. **Timeline** : `weddingMomentOrder` (12 moments canoniques — progression
   fonctionnelle, pas un calendrier) + `weddingPhases` (AVANT / LE JOUR /
   APRÈS) + `buildProjectTimeline` (regroupement par moment, repli « À
   organiser »). Le moteur (tri/regroupement) est générique ; **les moments
   et les phases sont des données mariage**.
5. **Mon mariage** : `wedding_projects` (name, session_id, unique index — un
   projet par session anonyme, cookie `wwm-project`). Nom par défaut
   « Mon mariage ». Le mariage EST le projet : **il n'existe aucune notion
   de situation de vie** — c'est le verrou principal révélé par l'audit.
6. **Couvertures** : 36 covers éditoriales, filtrage par recherche/univers,
   « + » sur la couverture = ajout.
7. **Relation couverture → dossier** : l'acte d'ajouter EST la sélection →
   `attach` → dossier créé qui s'ouvre aussitôt sur son parcours
   (transition éditoriale, pas de dashboard). subjectId = référence unique.
8. **API** : `POST /api/wedding/project` (create, attach, detach, set-state,
   parcours-step — validation stricte contre le catalogue, 400 honnêtes,
   503 si base indisponible) + `GET` (renvoie le projet + dossiers +
   parcoursProgress) ; `POST /api/wedding/selections` (inspirations).
   Sessions anonymes, aucune authentification, aucune donnée personnelle.
9. **Migrations** : 0000 (sélections + items) → 0001 (wedding_projects) →
   0002 (items → dossiers, non destructif) → 0003 (parcours_progress,
   additif). Historique 100 % additif/évolutif depuis 0002 — le projet sait
   faire évoluer le schéma sans perdre de données.
10. **Professionnels** : `professionals: {name, role, city}[]` — 72
    références éditoriales DANS le catalogue mariage. Ce ne sont **pas des
    entités** : pas d'identité stable, pas de qualification, pas de
    disponibilité, pas de statut d'existence. Aucune table intervenants.
11. **Programme/séance sans duplication ?** — analyse : une table
    `programmes` référençant les dossiers **dupliquerait** `wedding_projects`
    (le programme « Préparer son mariage » EST le projet mariage). La
    généralisation correcte passe par un **discriminant de situation sur le
    projet** + des couches dérivées (pattern déjà validé par le parcours).
    Les séances, elles, n'ont aucun point d'ancrage aujourd'hui : elles
    devront référencer `dossier_id` (l'ancrage métier déjà documenté).
    Vérifié : **0 mention « Eden / Mont Noir » dans le code** — le lieu
    n'a aucune dépendance technique, comme exigé.

## CE QUI MANQUE (pour la vision LIEU → PARCOURS DE VIE)

- **La SITUATION** : le projet ne sait pas dire quelle situation de vie il
  accompagne. Le mariage est implicite (nom, moments, UI). C'est le seul
  verrou structurel qui empêche demain « Devenir parent » ou « Traverser un
  deuil » de coexister avec « Préparer son mariage ».
- **Le PROGRAMME** (niveau supérieur au parcours) : n'existe pas — et ne
  doit PAS devenir une entité concurrente du projet (cf. point 11).
- **La SÉANCE** : aucune notion, aucune table, aucun statut.
- **L'INTERVENANT** : aucune entité — les professionals du catalogue sont
  éditoriaux (références, pas des personnes suivies).
- **LE LIEU** : aucune entité, aucune donnée (aucun espace, aucun
  équipement). Rien n'existe → rien ne doit être inventé.
- **Du contenu non-mariage** : 0 couverture parentalité/deuil/bien-être/
  transmission. Sans contenu réel, tout arc non-mariage serait une fiction —
  interdit par la règle de vérité.
- **Un projet par session** (unique index sur session_id seul) : demain, une
  personne pourrait vivre plusieurs situations ; l'index devra devenir
  (session_id, situation) — migration à préparer, pas à faire maintenant.

## CE QUI PEUT ÊTRE RÉUTILISÉ TEL QUEL

- Le **pattern de dérivation** (fonction pure partagée client/serveur,
  données réelles uniquement, null si absent) — le programme et les futurs
  arcs par situation suivront exactement ce modèle.
- Le **modèle dossier** (référence sujetId + état + progression) : un
  dossier de parentalité serait structurellement identique ; rien à changer.
- La **validation stricte contre le catalogue** (`validateSubjectId`) et le
  pattern « vocabulaire modélisé, exposition progressive »
  (`dossierStates` 10 modélisés / `settableDossierStates` 2 exposés) —
  exactement ce qu'il faut pour les situations.
- La **Timeline** comme unique système nerveux : les moments sont des
  données, une autre situation apportera ses propres moments (le moteur de
  tri/regroupement est réutilisable).
- La transition éditoriale couverture → dossier → parcours, l'API et sa
  discipline d'erreurs honnêtes, les sessions anonymes, l'historique de
  migrations additives.

## MODÈLE CIBLE (proposition)

Unification clé : **le programme est la face « proposée » de la situation ;
le projet est sa face « vécue »**. Un programme n'est donc PAS une nouvelle
entité qui dupliquerait le projet — c'est une **dérivation** de la situation
(aujourd'hui : « Préparer son mariage » = le projet mariage + les parcours
de ses dossiers). Le jour où un catalogue réel existera, `buildProgramme(
situation)` dérivera le fil proposé exactement comme `buildDossierParcours`
dérive l'arc d'un dossier. Rien n'est inventé : la situation « mariage » est
réelle ; les autres clés sont modélisées mais **non créables** tant qu'aucun
contenu réel n'existe.

```
PERSONNE (session anonyme aujourd'hui)
  └── PROJET (wedding_projects, + situation : "mariage" | "naissance" | "deuil"
        | "reconnexion" | "couple-famille" | "transmission" — modélisées,
        UNE seule settable : "mariage")
        ├── PROGRAMME (couche DÉRIVÉE de la situation — jamais une entité)
        ├── DOSSIER (wedding_dossiers — inchangé, référence subjectId)
        │     └── PARCOURS (déjà livré : dérivation + parcours_progress)
        │           └── SÉANCE (future table parcours_sessions → dossier_id,
        │                 statuts §8 : à planifier, planifiée, confirmée,
        │                 réalisée, annulée, reportée — s'inscrit DANS la
        │                 Timeline, pas de calendrier parallèle)
        │                 ├── INTERVENANT (future table : identité, rôle,
        │                 │     qualification SI renseignée — jamais déduite,
        │                 │     disponibilité, lieu, statut, contact)
        │                 └── LIEU / ESPACE (future donnée de contextualisation
        │                       avec statut : réel / à confirmer / futur)
        └── TIMELINE (moments = DONNÉES par situation ; le mariage garde
              AVANT / LE JOUR / APRÈS ; une autre situation apporte les siens)
```

L'Eden du Mont Noir est le lieu où les parcours se vivent : **donnée de
contextualisation** (espaces, forêt, chemins… tous marqués réel / à
confirmer / futur), jamais une exception technique du moteur — conforme à
la règle déjà posée. Aucune promesse médicale ou thérapeutique : les
professionnels de santé restent identifiés comme tels, le système ne
diagnostique ni ne promet ; il structure ce que la personne choisit.

## MIGRATIONS ÉVENTUELLEMENT NÉCESSAIRES

- **Maintenant (E1, justifiée)** : `ALTER TABLE wedding_projects ADD COLUMN
  situation text DEFAULT 'mariage' NOT NULL` — purement additive. Tout
  l'existant devient réellement « mariage » (c'est un fait, pas une
  invention) ; le tri est sans perte.
- **E2 (conditionnée par du contenu réel)** : index unique (session_id,
  situation) en remplacement de (session_id) ; moments et phases par
  situation (données) ; arcs dérivés par situation.
- **E3+ (conditionnées par existence réelle)** : `parcours_sessions`,
  `intervenants`, données du lieu — toutes référencent `dossier_id` /
  `project_id`, jamais de duplication du dossier ni d'identifiant concurrent.

## CE QUI DOIT RESTER HORS PÉRIMÈTRE (cette phase)

Toutes les situations non-mariage (naissance, deuil, reconnexion, couple,
transmission) : **clés modélisées, création refusée** — aucune couverture,
aucun arc, aucune séance, aucun intervenant, aucun espace n'existe pour
elles ; en inventer serait violer la règle RÉEL / À CONFIRMER / FUTUR.
Hors périmètre également : les séances (§8 conceptuel), les intervenants
(§7), le lieu (§6), l'économie du modèle (§15), la transmission de
participant à accompagnant (§16), l'attestation (§17 — « attestation de
parcours », jamais « diplôme »), tout calendrier complexe, toute
marketplace, tout dashboard/CRM. Le mariage continue de fonctionner
exactement comme avant.

## RISQUES

- **Colonne jamais lue avant E2** : `situation` vaudra « mariage » pour
  100 % des lignes tant qu'aucune autre situation n'est settable — c'est le
  prix accepté du pivot (même pattern que les états réservés du dossier) ;
  la colonne est testée et la valeur est un fait réel.
- **Sédimentation mariage** : vocabulaire UI (« MON MARIAGE. », nom par
  défaut, moments) — ne pas généraliser l'UI avant un second cas réel ;
  sinon on habille du vide.
- **Dérivation par situation future** : si les arcs divergent, le même
  garde-fou que parcours_progress s'applique (le serveur borne à la
  dérivation, l'UI affiche complété au-delà).
- **Contenu pilotant l'architecture** : le risque majeur serait de coder E2
  sans contenu réel. La condition est explicite : E2 n'ouvre que quand des
  couvertures non-mariage réelles existeront.

## DÉCISION — implémentation minimale justifiée (E1, et E1 seulement)

L'audit démontre qu'il est **prématuré de coder** les parcours non-mariage,
les séances, les intervenants, le lieu, l'économie, la transmission et
l'attestation : aucune donnée réelle ne les fonde. Mais **une** modification
minimale du domaine est justifiée maintenant, parce qu'elle est le pivot du
modèle cible, purement additive, rétrocompatible, testable — et qu'elle
transforme le garde-fou « programme inexistant = aucune donnée inventée »
en invariant vérifié :

1. Vocabulaire `projectSituations` (6 clés du brief, modélisées) +
   `settableProjectSituations = ["mariage"]` (une seule situation réelle) +
   labels éditoriaux — pattern exact de `dossierStates`/
   `settableDossierStates`.
2. Colonne `wedding_projects.situation` (DEFAULT 'mariage', migration 0004
   additive). Tout l'existant est un mariage — rien d'inventé.
3. `create` accepte une `situation` **optionnelle** : omise → « mariage » ;
   inconnue → 400 « Invalid situation » ; modélisée mais non settable →
   400 « situation is not available yet ». GET renvoie la situation réelle
   du projet. **Aucun changement d'UI** : l'interface ne montre que ce qui
   est utile maintenant.

Micro-phases suivantes (ordres et conditions, à ne pas ouvrir avant que
leur condition soit réelle) :

- **E2 — Première situation non-mariage réelle** (condition : couvertures
  éditoriales réelles, ex. « Devenir parent sereinement », avec données
  marquées « à confirmer » tant que non confirmées) : index (session_id,
  situation), moments par situation, arcs dérivés par situation, UI.
- **E3 — Séances** (condition : de vraies séances proposées) : table
  `parcours_sessions` → dossier_id, statuts §8, inscription dans la
  Timeline existante.
- **E4 — Intervenants** (condition : de vraies personnes identifiées) :
  identité, rôle, qualification si renseignée (jamais déduite), statut
  réel / à confirmer / futur.
- **E5 — Le lieu / espaces** (condition : données réelles de l'Eden) :
  contextualisation avec les trois états de vérité.
- **E6 — Programme annuel, économie, attestation, transmission** :
  documentés ci-dessus, non codés.

## VÉRIFICATIONS (E1, exécutées)

- Lint, typecheck, tests **102/102** (94 précédents intacts + 8 nouveaux :
  3 validation, 3 route, 2 domaine), build sans DATABASE_URL.
- Migrations vérifiées sur PostgreSQL 18.4 embarqué : chaîne complète
  0000→0004 depuis zéro ; **chemin de mise à niveau réel** reproduit (base
  pré-0004 + projet et dossiers existants avec progress 8 et 3) → 0004
  appliquée seule, `situation='mariage'` backfillée, aucune donnée modifiée.
- Runtime local_only : create sans situation → ok ; `situation: "mariage"`
  → ok ; `deuil` → 400 « situation is not available yet » ; `fitness` →
  400 « Invalid situation » ; attach + parcours-step intacts.
- Runtime PostgreSQL : scénario mariage complet identique à avant (create →
  attach → 8 validations → 9e refusée 400), GET renvoie `situation:
  "mariage"` ; session B : create `deuil` refusé **sans créer aucun projet**
  (GET B → null — rien n'est inventé), isolation stricte préservée.
- Chemin 503 (base indisponible) : POST → 503 unavailable, GET avec session
  → 503, GET / → 200. Validation des situations inchangée (400 avant la
  base).
- Intégrité du catalogue : 36 sujets, relations et moments canoniques,
  arcs 7–9 étapes — inchangés.
