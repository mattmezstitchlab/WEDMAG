# PACTE Mariage — Couche structurante du Wedmag

**Date :** 27 septembre 2026 · **Branche :** `arena/01a0e298-wedmag`
**Statut :** architecture validée · **MVP implémenté et vérifié** (create / attach /
detach, timeline AVANT–LE JOUR–APRÈS, 67/67 tests, runtime PostgreSQL validé —
voir `§3` et le résumé de fin de document)

> Wedmag reste la porte éditoriale : inspiration, photographie, acquisition.
> PACTE fournit la logique structurante **derrière**. Ce document décrit comment
> la couche PACTE s'intègre sans refonte et sans dupliquer Wedmag en une
> deuxième application.

---

## 1. Audit de l'architecture actuelle (avant code)

### 1.1 Modèle de données

| Élément | Forme | Rôle |
|---|---|---|
| Catalogue | 36 `Subject` dans `src/lib/wedding-data.ts` (code, pas de table) | **Source de vérité éditoriale** : id, coverNumber, moments, relations, contraintes, professionnels |
| Sélections | `Record<subjectId, status>` — 3 statuts (`interested`, `contacted`, `chosen`) | Ce que le visiteur a coché |
| Table `wedding_selections` | PK `(session_id, subject_id)` | Persistance serveur des sélections |
| Session | cookie anonyme `wwm-project` (httpOnly, SameSite=lax, Secure, 1 an) | Identité du navigateur, propriétaire des sélections |

### 1.2 Catalogue
36 sujets, 19 univers, **12 moments canoniques** (`weddingMomentOrder`) :
Avant le mariage, Veille, Préparatifs, Cérémonie, Cocktail, Couple, Dîner,
Première danse, Soirée, Lendemain, Brunch, Après le mariage. Relations
croisées (`related`), contraintes (`constraints`), apports (`brings`).

### 1.3 Sélection utilisateur
État React (`page.tsx`) → drawer « MON MARIAGE » groupé par moment
(`sortWeddingSelectionsByMoment`, moteur pur et testé) + insights
(contraintes à vérifier, suggestions par liens croisés).

### 1.4 Persistance
Trois états honnêtes : `local_only` (pas de `DATABASE_URL`), `server`,
`unavailable` (503). Règle de restauration déterministe
(`mergeRestoredProject`, hardening M3). Validation stricte des entrées
contre le catalogue (hardening M1/M2).

### 1.5 Routes
`/` (statique, pré-rendue) · `/api/health` · `/api/wedding/selections`
(GET/POST). Aucune autre surface.

### 1.6 Composants
Page unique ; drawer « Mon mariage » ; fiche sujet (overlay) ; toast.
Hook `use-dialog` (Échap, piège de focus, restitution). Design system
CSS éditorial concentré dans `globals.css`.

### 1.7 Possibilités d'extension
- Le schéma Drizzle est **additif** : de nouvelles tables s'ajoutent sans
  toucher à l'existant.
- Le couple *cookie de session → sélections* est déjà un « projet implicite »
  anonyme : il n'y a qu'un pas conceptuel vers l'entité *projet mariage*.
- La page est un composant client unique : un nouvel état local + une section
  du drawer suffisent, sans nouveau routage.

### 1.8 Premières briques du projet mariage (constat)

| Brique existante | Devient, côté PACTE |
|---|---|
| Sélection cochée (interested/contacted/chosen) | **Inspiration enregistrée** — la matière première |
| `weddingMomentOrder` (12 moments canoniques) | Squelette chronologique → **Timeline** AVANT / LE JOUR / APRÈS |
| `sortWeddingSelectionsByMoment` | Moteur de regroupement réutilisé tel quel pour la timeline |
| Catalogue `subjects` | Référentiel d'objets (destination, lieu, prestation…) — **référencé, jamais copié** |
| Cookie de session anonyme | Propriétaire du projet mariage (même identité, pas de deuxième cookie) |
| Drawer « MON MARIAGE » | **Le point d'intégration le plus propre** : c'est lui qui s'ouvre sur l'espace structuré |

**Conclusion de l'audit : l'intégration est possible sans refonte.** Tout est
additif : deux tables, une route, un état client, une évolution du drawer.

---

## 2. La chaîne PACTE adaptée au mariage

Modèle **interne** — l'interface n'affiche pas la chaîne, elle reste simple.

| # | Concept PACTE | Au mariage | Statut dans cet incrément |
|---|---|---|---|
| 1 | IDENTITÉ | le couple, les marié·e·s, témoins, familles, invités, prestataires | **Réservé** (le nom du projet en est le germe) |
| 2 | OBJET | lieu, prestation, contrat, budget, paiement, réservation… | **Réservé** (l'item de projet est le premier objet) |
| 3 | RELATION | qui intervient, avec quel rôle, dans quel mariage | **Réservé** |
| 4 | ENGAGEMENT | qui s'engage envers qui, sur quoi, à quelle date, à quelles conditions, avec quel document | **Réservé** |
| 5 | ÉVÉNEMENT | la Timeline AVANT / PENDANT / APRÈS | **Matérialisé** (squelette + items rattachés) |
| 6 | DOCUMENT | contrat, devis, facture, email… | **Réservé** (jamais de faux documents) |
| 7 | PREUVE | preuve de paiement, signature… | **Réservé** |
| 8 | DONNÉE | budget prévu/engagé/payé, échéances, invités, capacité… avec source | **Réservé** (la *source* est déjà matérialisée sur chaque item) |
| 9 | ANALYSE | écarts, échéances proches, incohérences — signaler sans inventer | **Réservé** (le drawer « À vérifier » en est l'embryon) |
| 10 | SCÉNARIO | variantes comparables, jamais présentées comme réalité | **Réservé** |
| 11 | DÉCISION | **humaine** — le système présente, le couple décide | **Principe appliqué partout** |

Règle transverse : *le système propose, l'humain valide*. Aucune
transformation silencieuse d'une donnée importante.

---

## 3. Architecture minimale (MVP)

### 3.1 Parcours

```
DÉCOUVRIR (couvertures) → ENREGISTRER (cocher, existant)
  → CRÉER MON MARIAGE (1 clic, 1 nom facultatif)
  → RATTACHER une inspiration (action explicite, proposée par le système)
  → VOIR la Timeline AVANT / LE JOUR / APRÈS (espace projet dans le drawer)
```

### 3.2 Modèle de données (additif)

```
wedding_projects            — le projet mariage (PACTE : OBJET central)
  id            uuid PK
  session_id    text UNIQUE  ← même cookie que les sélections (1 projet par session)
  name          text         ← germe de la couche IDENTITÉ
  created_at / updated_at

wedding_project_items       — un élément structuré du projet (PACTE : premier OBJET)
  project_id    uuid FK → wedding_projects (cascade)
  subject_id    text         ← RÉFÉRENCE au catalogue Wedmag (jamais une copie)
  source        text         ← provenance : "wedmag"
  PK (project_id, subject_id) ← interdit la duplication
```

Pourquoi deux entités plutôt que « la sélection devient l'item » : la
sélection (« ça me plaît », niveau navigateur) et l'item de projet (« ça
fait partie de MON mariage », niveau projet) sont **deux niveaux d'intention
distincts**. La transformation de l'un vers l'autre est un acte explicite de
l'utilisateur (§15). En revanche, **l'entité référencée (le sujet du
catalogue) n'existe qu'une fois** — source de vérité unique respectée.

### 3.3 Routes (additives)

| Route | Effet |
|---|---|
| `GET /api/wedding/project` | le projet de la session (ou `null`) + `persistence` |
| `POST /api/wedding/project` | `create` (idempotent) · `attach` · `detach` |

Mêmes règles que les sélections : validation stricte contre le catalogue
(`subjectId` inconnu/trop long → 400), dégradation `local_only` /
`server` / `unavailable` (503) inchangée, même cookie de session.

### 3.4 Client

- État `WeddingProjectState` (`{ name, items }`) dans `page.tsx`,
  persisté en `localStorage` (miroir, même motif que les sélections).
- Règle de restauration symétrique (`mergeRestoredWedding`) : un projet
  serveur non nul est autoritaire ; sinon localStorage ; les actions en cours
  de chargement gagnent. Limite acceptée et documentée : un projet créé
  pendant une indisponibilité de la base n'est **pas** rejoué automatiquement.
- Le drawer « MON MARIAGE » a deux états : sans projet (comportement actuel
  + invitation à créer), avec projet (**espace structuré** : Timeline par
  phase/moment, pool d'inspirations à rattacher, insights conservés).

### 3.5 Timeline

Les 12 moments canoniques se répartissent en trois phases :

```
01 AVANT LE MARIAGE   Avant le mariage · Veille du mariage · Préparatifs
02 LE JOUR DU MARIAGE Cérémonie · Cocktail · Couple · Dîner · Première danse · Soirée
03 APRÈS LE MARIAGE   Lendemain · Brunch · Après le mariage
   À ORGANISER        (repli : sujet sans moment canonique)
```

`buildProjectTimeline` réutilise `sortWeddingSelectionsByMoment` : un seul
moteur chronologique pour deux vues (liste d'inspirations, timeline projet).

---

## 4. Règles de source de vérité

1. **Une seule donnée pour une même information.** Un sujet du catalogue
   n'existe que dans `wedding-data.ts` ; sélections et items le **référencent**
   par `subjectId`. Jamais de `WedmagDestination` + `PACTEDestination`.
2. La provenance est explicite : chaque item porte `source: "wedmag"`.
3. Un `subjectId` qui n'existe pas au catalogue ne peut jamais atteindre la
   base (validation serveur, 400).
4. Un même sujet ne peut être attaché qu'une fois par projet (PK).

## 5. Progression (ce que le système apprend)

```
consulte → enregistre → [système : c'est une préférence potentielle]
  → crée son mariage → [système propose le rattachement]
  → l'utilisateur valide → l'information devient structurée (timeline)
```

Aucun formulaire géant : la création demande **au plus un nom** (facultatif,
défaut « Mon mariage »). Les rattachements sont individuels et explicites.

## 6. Garde-fous (ce que cette couche ne fait PAS)

- pas de dashboard SaaS sur les pages éditoriales — la couche n'apparaît que
  dans le drawer, au moment où elle devient utile ;
- pas de personnes/relations/prestataires/engagements/documents/budget dans
  cet incrément (réservés, voir §2 et §7) ;
- aucune donnée fictive, aucun faux contrat, aucun faux paiement, aucune
  disponibilité inventée ;
- aucune conclusion juridique automatique ;
- l'IA n'est jamais une autorité : *AI points. ME decides.*

## 7. Étagement prévu (post-MVP, dans l'ordre)

Chaque couche s'ajoute **par tables additives et routes additives**, sans
casser le présent :

1. **Identités & relations** — `wedding_identities` (kind : couple, marié,
   témoin, famille, invité, wedding planner, lieu, photographe, vidéaste, DJ,
   musicien, traiteur, fleuriste, officiant, autre prestataire) et
   `wedding_relations` (le **rôle appartient à la relation**, pas à la
   personne — une même personne n'est jamais dupliquée entre projets).
2. **Objets** — prestations, budgets, paiements, réservations,
   hébergements, transports, repas, musiques, décorations, tâches,
   échéances, invitations, plans de table : tables dédiées reliées au projet.
3. **Engagements** — qui → envers qui → sur quoi → à quelle date → à quelles
   conditions → avec quel document. Structure l'information contractuelle,
   sans jamais conclure à sa place.
4. **Événements riches** — la Timeline gagne les jalons AVANT (réservation
   du lieu, signatures, acomptes, invitations, préparation), PENDANT
   (cérémonie, cocktail, dîner, musique, soirée), APRÈS (solde, récupération
   des documents, clôture).
5. **Documents & preuves** — reliés aux objets et engagements ; jamais
   inventés.
6. **Données** — montants, échéances, invités, capacité, disponibilités,
   contraintes : chaque donnée porte sa source.
7. **Analyse** — budget prévu vs engagé vs payé, échéances proches,
   prestations sans contrat, paiements sans preuve : signaler les
   incohérences réelles, n'en inventer aucune.
8. **Scénarios** — variantes identifiables comme scénarios (100 vs 70
   invités, destination différente), jamais présentées comme réalité.
9. **Décision** — reste humaine : le système présente les informations et
   les conséquences observables.

## 8. Vocabulaire exposé à l'utilisateur (volontairement pauvre)

« Mon mariage », « inspiration », « rattacher / détacher », « la timeline de
votre mariage », « Avant le mariage / Le jour du mariage / Après le
mariage », « source Wedmag ». La chaîne PACTE complète n'apparaît pas.
