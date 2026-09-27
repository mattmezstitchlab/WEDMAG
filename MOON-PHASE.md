# MOON PHASE — ARCHITECTURE & PRIVACY AUDIT

Statut : **AUDIT SEUL — aucun code.** Produit conceptuellement **distinct
de WEDMAG** (même principe que l'EDEN du Mont Noir : projets séparés,
audits séparés, modèles séparés). Éléments à validation marqués
**À VALIDER**. Audit réalisé sur le code de référence `dbb095d`.

Phrase fondatrice : **UNE PHASE POUR DIRE OÙ JE SUIS. UN BIJOU POUR LA
PORTER.** Principe : MA PHASE. MON CHOIX. MA VISIBILITÉ.

## AUDIT DE L'EXISTANT (les 7 points demandés)

1. **Identité utilisateur** : WEDMAG n'a **aucune identité
   utilisateur**. Le cookie `wwm-project` (httpOnly, 365 j) est une clé
   de persistance anonyme, pas une identité : aucun compte, aucun
   login, aucun profil, aucune entité PERSON en base. La « PERSONNE »
   de l'architecture documentée est un concept, pas une donnée.
2. **Préférences** : aucune entité préférence n'existe. Les états
   client vivent en miroirs `localStorage` + lignes serveur indexées
   par la session anonyme (mariage, dossiers, parcours, contacts).
3. **Visibilité** : inexistante — et c'est structurel : WEDMAG est une
   application **monovisiteur** (un navigateur, son mariage). Aucune
   surface sociale, aucun profil public, rien n'est jamais montré à un
   autre humain. Tout est privé par construction, pas par paramètre.
4. **Entités réutilisables** : aucune entité directement (pas de
   PERSON, pas de profil). En revanche, des **patterns** éprouvés sont
   réutilisables : vocabulaire modélisé + exposition progressive,
   validation stricte contre un catalogue, erreurs honnêtes, dérivation
   plutôt que stockage, et le langage visuel éditorial (noir/ivoire/
   serif/texture — compatible avec l'esthétique lunaire demandée).
5. **Où le système doit vivre** — constat majeur : les visibilités
   PUBLIC et COMMUNAUTÉ **n'ont aucune signification dans WEDMAG**
   (personne d'autre ne peut voir une phase : il n'existe ni profils ni
   spectateurs). Intégrer Moon Phase à WEDMAG imposerait de construire
   une couche d'identité + des profils + une surface sociale **dans un
   magazine de mariage** : mélange de produits, et risque de
   confidentialité par contamination (des données relationnelles
   potentiellement sensibles à côté de données d'organisation de
   mariage — violation du principe de minimisation/finalité).
   **Recommandation : produit séparé**, son propre dépôt/audit/modèle.
6. **Données réellement nécessaires** (pour le produit Moon Phase) :
   - un catalogue des **8 phases** : `phase_id, phase_name, symbol,
     description` — des **données éditoriales modifiables** (les
     significations proposées sont des versions initiales, jamais
     codées en dur dans la logique) ;
   - une **sélection** : `person_id, phase_id, visibility, selected_at,
     updated_at` (+ `jewel_id` éventuel plus tard) ;
   - un catalogue **bijoux** (plus tard) : formes (pendentif,
     bracelet, bague, broche, médaillon), le croissant comme symbole
     central de la collection.
   - Les **préférences intimes ne sont nécessaires à RIEN** dans ce
     langage : elles n'entrent pas dans le premier incrément (voir
     risques).
7. **Risques de confidentialité** :
   - une phase publique est **observable** → un tiers peut tenter
     d'inférer une disponibilité. Mitigations : visibilité choisie
     (PRIVÉ par défaut), modifiable et révocable à tout instant, effet
     immédiat, aucune interprétation automatique par le système, aucun
     historique public ;
   - **une phase n'est jamais un consentement** — le consentement reste
     contextuel, explicite et révocable ; jamais de formulation « cette
     phase signifie que cette personne accepte… » ;
   - jamais déduire : orientation, pratiques, disponibilité sexuelle
     réelle, état matrimonial, intention envers quiconque ;
   - stocker des données intimes près d'une identité = risque majeur →
     premier incrément **sans aucune donnée intime** ; si elles existent
     un jour : explicitement déclarées, séparées de la phase, privées
     par défaut, contrôlables par la personne — jamais affichées,
     jamais déduites, jamais liées à la phase ;
   - le **bijou physique** est public par nature quand il est porté :
     la personne doit savoir que le bijou matérialise la phase choisie
     (son choix, son geste) ;
   - l'**historique des phases** (si ajouté un jour) est sensible par
     nature (reconstruire une vie relationnelle) → privé par défaut,
     ajouté seulement si nécessaire ;
   - la session anonyme WEDMAG n'est pas une identité : sans couche
     sociale, PUBLIC n'a pas de sens (renvoie au point 5).

## ARCHITECTURE CONCEPTUELLE (produit séparé)

```
PERSON (identité réelle du produit Moon Phase)
  └── MOON_PHASE_SELECTION (phase_id, visibility, selected_at, updated_at)
        └── JEWEL (catalogue, lien éventuel, plus tard)
MOON_PHASES = catalogue de 8 phases (id, name, symbol, description) — DONNÉES
VISIBILITY = prive | public | communaute
```

Roue des 8 phases (vocabulaire initial proposé, modifiable sans casser
le système — les significations sont des données) :

| Phase | Symbole | Signification initiale |
|---|---|---|
| Nouvelle Lune | 🌑 | DISCRET — rien à afficher publiquement |
| Premier Croissant | 🌒 | OUVERT — ouvert à la rencontre |
| Premier Quartier | 🌓 | EXPLORATION — ouvert à découvrir une relation |
| Gibbeuse Croissante | 🌔 | INTÉRÊT — une connexion est en construction |
| Pleine Lune | 🌕 | ENGAGÉ — relation assumée, engagement choisi |
| Gibbeuse Décroissante | 🌖 | ÉVOLUTION — relation en transformation |
| Dernier Quartier | 🌗 | TRANSITION — situation en changement |
| Dernier Croissant | 🌘 | RETRAIT — besoin de distance ou de discrétion |

Règle fondamentale verrouillée : **LA PERSONNE CHOISIT. LE SYSTÈME
AFFICHE. LE SYSTÈME N'INTERPRÈTE PAS À SA PLACE.**

## NON CONSTRUIT (ce premier périmètre)

Boutique, paiement, commande ou personnalisation de bijou (architecture
préparée uniquement : `jewel_id`) · préférences intimes (aucune donnée) ·
historique des phases · toute fonction de rencontre/matching · tout
affichage public sans couche sociale réelle.

## À VALIDER

1. **Moon Phase = produit séparé** (comme l'EDEN), pas dans WEDMAG —
   nouveau dépôt/projet à créer à ta convenance. Je ne crée rien sans
   validation.
2. **Significations initiales** des 8 phases (DISCRET → RETRAIT) comme
   vocabulaire de départ modifiable — OK ?
3. **Premier incrément sans aucune donnée intime** — OK ?
4. **Bijou** : maquette/représentation visuelle uniquement (aucune
   boutique, aucun paiement) — OK ?
5. **Visibilité par défaut = PRIVÉ** — OK ?
