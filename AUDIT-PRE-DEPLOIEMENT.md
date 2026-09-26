# Audit pré-déploiement Vercel — WEDMAG

> ## ✅ MISE À JOUR — correctifs appliqués
>
> Le plan « déployer aujourd'hui » a été exécuté. **Le build passe désormais
> sans `DATABASE_URL`**, lint et typecheck sont verts, et les migrations
> existent. Voir la section *« Ce qui a été corrigé »* en fin de document.
>
> Reste à faire côté Vercel : **régler _Root Directory_ sur
> `premium-wedding-editorial-experience`**.
>
> Le document ci-dessous conserve l'état initial du diagnostic, pour mémoire.

---

**Date :** 26 septembre 2026
**Branche :** `arena/01a0deff-wedmag`
**Commit analysé :** `aebbbe8` — *« Merge semantic 365-cover editorial catalogue »*
**App :** `premium-wedding-editorial-experience/` (Next.js 16.2.6, React 19, Tailwind 4, Drizzle + Postgres)

---

## Verdict

**🔴 NE PAS DÉPLOYER EN L'ÉTAT.** Le build échoue.

Il y a **1 bloqueur dur** (build cassé), **3 bloqueurs fonctionnels** (la
persistance ne peut pas marcher en prod) et un **écart important entre ce
que le message de commit annonce et ce que le code contient**.

La bonne nouvelle : le front-end est réel et de bonne qualité. Ce n'est pas
une maquette vide — c'est un produit à ~40 % livré dont l'emballage prétend
être à 100 %.

---

## Résultats des contrôles

| Contrôle | Résultat | Détail |
|---|---|---|
| `tsc --noEmit` | ✅ Pass | 0 erreur |
| `next build` **sans** `DATABASE_URL` | ❌ **Fail** | `Failed to collect page data for /api/health` |
| `next build` **avec** `DATABASE_URL` | ✅ Pass | 3 routes, ~6 s |
| `eslint .` | ❌ 1 erreur | `react-hooks/set-state-in-effect` (page.tsx:46) |
| `GET /api/health` | ❌ 500 | pas de base joignable |
| `GET /api/wedding/selections` | ⚠️ 200 `{selections:[]}` | ne lit rien (pas de cookie) |
| `POST /api/wedding/selections` | ❌ 503 `persistence: unavailable` | **la table n'existe pas** |
| `GET /` | ✅ 200 | page statique, rendu correct |

---

## 🔴 Bloqueurs

### 1. Le build casse sans `DATABASE_URL` — bloqueur n°1

`src/db/index.ts` lance `throw new Error("DATABASE_URL is required")` **au
chargement du module**. Next.js 16 importe la route `/api/health` pendant
la phase *Collecting page data*, même si elle est en `force-dynamic`. Le
build meurt donc dès le premier déploiement Vercel tant que la variable
n'est pas définie.

```
Error: DATABASE_URL is required
> Build error occurred
Error: Failed to collect page data for /api/health
```

**Correctif :** rendre l'initialisation paresseuse (créer le `Pool` au
premier appel, pas à l'import) — c'est la bonne pratique serverless de
toute façon. Définir la variable dans Vercel ne fait que masquer la
fragilité.

### 2. Aucune migration — la table n'existera jamais en production

`drizzle.config.json` n'a pas de clé `out`, il n'y a **aucun dossier de
migrations, aucun fichier `.sql`** dans le dépôt, et aucun script
`db:push` / `db:migrate` dans `package.json`. La table
`wedding_selections` n'est créée nulle part.

Conséquence mesurée : `POST /api/wedding/selections` renvoie **503**. En
prod, chaque ajout au panier « Mon mariage » échouera silencieusement côté
serveur.

Cerise : la config pointe en dur sur `postgresql://postgres:postgres@127.0.0.1:5432/app_db`
— credentials locaux commités, à remplacer par `process.env.DATABASE_URL`.

### 3. La persistance serveur est un leurre aujourd'hui

Le repli est *tellement* silencieux (`.catch(() => undefined)` côté client,
503 avalé) que l'app **paraît** fonctionner : tout est en fait sauvegardé
dans `localStorage` uniquement. Un utilisateur qui change de navigateur perd
tout, sans le moindre message. Il faut décider :

- **soit** on branche vraiment Postgres (migrations + pooler) ;
- **soit** on assume le 100 % local et on retire `src/db/`, les routes API
  et les deps `pg`/`drizzle-orm` — le déploiement devient alors trivial et
  sans base.

Pour un premier déploiement, la seconde option livre en 30 minutes.

### 4. `pg.Pool` en serverless

Même une fois la base branchée : `new Pool()` dans une fonction Vercel
ouvre des connexions par instance et les épuise vite. Il faut une
**connection string poolée** (Neon pooler, Supabase pgBouncer) et
`max: 1`. Le `globalThis` de cache est explicitement désactivé en
production (`if (NODE_ENV !== "production")`), donc chaque invocation
recrée un pool.

---

## 🟠 Écart entre le commit et la réalité

Le commit annonce *« semantic 365-cover editorial catalogue, Studio
integration, API compatibility, and generated cover assets »*. Vérification
faite :

| Annoncé | Réel |
|---|---|
| Catalogue 365 couvertures | **36 sujets** définis (`coverNumber` 1→36) |
| Assets de couverture générés | **9 fichiers** dans `public/covers/` (n° 111→119) |
| Intégration « Studio » | **Aucune** — pas de route, pas de page, pas de composant |

Pire : `src/lib/cover-assets.ts` (163 lignes) mappe **119 chemins d'images**
dont **110 n'existent pas sur le disque**… et ce module **n'est importé
nulle part**. C'est du code mort, tout comme les 9 images livrées, que
l'UI n'affiche jamais.

L'UI affiche en réalité **8 URLs Pexels externes** (`wedding-data.ts`,
tableau `images[]`) réutilisées en boucle sur les 36 sujets. Donc :

- hotlinking sur Pexels en production (disponibilité + conditions d'usage
  à vérifier) ;
- 0 optimisation d'image (tout est en `background-image` CSS, `next/image`
  n'est jamais utilisé) ;
- l'UI affiche fièrement « `001—036` / **365** COUVERTURES » et une section
  « 037—365 » qui ne mène à rien.

---

## 🟡 Qualité / propreté

- **4 liens `related` cassés** : `album`, `chaussures`, `cocktail`,
  `souvenirs` sont référencés mais n'existent pas comme sujets. Le code les
  filtre (`related ? ... : null`), donc pas de crash — juste des relations
  qui disparaissent en silence.
- **Import mort** : `statusLabel` est importé dans `page.tsx` et jamais
  utilisé.
- **4 classes CSS sans règle** : `plan-block`, `selected-section`,
  `suggestion-section` (inoffensif, mais signe de code copié/tronqué).
- **Aucun `.gitignore`** dans tout le dépôt. Après un simple
  `npm install && npm run build`, `node_modules/` et `.next/` apparaissent
  comme untracked et peuvent être commités par accident.
- **Aucun `package-lock.json` commité.** Les versions sont épinglées à
  l'exacte dans `package.json`, donc le risque est limité, mais Vercel
  construira sans lockfile — builds non reproductibles et plus lents.
- **Aucun README, aucune doc, aucun `.env.example`.** Personne ne peut
  reprendre le projet sans rétro-ingénierie.
- **Aucun test.**

---

## 🟢 Ce qui est solide

Il faut le dire, car c'est la vraie valeur du dépôt :

- **Le design tient la route.** 134 lignes de CSS très dense (direction
  artistique éditoriale cohérente : noir/paper/fuchsia, Georgia en
  display), avec **2 breakpoints responsive réellement travaillés**
  (860px, 400px) couvrant header, hero, grille, overlay et drawer.
- **L'accessibilité a été pensée** : `aria-label` systématiques,
  `role="dialog"` + `aria-modal`, `aria-labelledby`, `:focus-visible`
  stylé, `lang="fr"`.
- **Le contenu éditorial est riche et rédigé** : les 36 sujets ont intro,
  description, moments, services, `brings`, `toPlan`, `constraints`,
  relations et professionnels. Ce n'est pas du lorem ipsum.
- **Le moteur de suggestions fonctionne** : le calcul de relations
  croisées + contraintes à vérifier dans le drawer est une vraie
  fonctionnalité, correctement mémoïsée.
- **TypeScript strict passe sans erreur**, typage propre (`Subject`,
  `WeddingStatus`).
- **La page `/` est statique** → excellente perf sur Vercel.

---

## Configuration Vercel à prévoir

1. **Root Directory = `premium-wedding-editorial-experience`** ⚠️
   L'app n'est pas à la racine du dépôt. Sans ce réglage, Vercel ne
   détectera aucun framework.
2. `DATABASE_URL` en variable d'environnement (Production + Preview) —
   mais ne pas s'en servir comme pansement sur le bloqueur n°1.
3. Node 20+ (aucun `engines` déclaré — à ajouter).
4. Framework preset : Next.js (auto-détecté une fois le point 1 réglé).

---

## Plan d'action recommandé

### Pour déployer aujourd'hui (~1 h) — version vitrine
1. Rendre `src/db/index.ts` paresseux → débloque le build.
2. Ajouter un `.gitignore` et commiter `package-lock.json`.
3. Corriger l'erreur ESLint (`page.tsx:46`, initialiser via
   `useState(() => ...)` ou garder le `useEffect` avec un `// eslint-disable`
   assumé).
4. Retirer l'import mort `statusLabel` et le module mort `cover-assets.ts`.
5. Aligner l'affichage : « 36 couvertures » au lieu de « /365 », ou assumer
   « 36 publiées sur 365 ».
6. Régler Root Directory sur Vercel et déployer.

→ Résultat : un site vitrine élégant et fonctionnel, persistance locale.

### Avant de parler de « produit » (~1 semaine)
7. Migrations Drizzle + `db:push`, pooler Postgres, `max: 1`.
8. Remonter les erreurs de persistance à l'utilisateur au lieu de les
   avaler.
9. Rapatrier les images en local (ou CDN maîtrisé) et passer à
   `next/image`.
10. Combler les 4 relations cassées, produire les couvertures manquantes.
11. README + `.env.example` + quelques tests.

---

## Résumé en une phrase

Un front-end éditorial soigné et un vrai contenu, emballés dans un commit
qui sur-promet, posés sur une couche base de données non fonctionnelle —
et **le build échoue avant même d'arriver sur Vercel**. Deux heures de
travail suffisent pour un premier déploiement honnête.


---

# Ce qui a été corrigé

Session du 26/09/2026, sur `arena/01a0deff-wedmag`.

## Bloqueurs levés

| # | Problème | Correctif |
|---|---|---|
| 1 | Build cassé sans `DATABASE_URL` | `src/db/index.ts` réécrit : `getPool()` / `getDb()` paresseux, plus aucun `throw` à l'import. **Build vérifié sans la variable → succès.** |
| 2 | Aucune migration | `drizzle.config.ts` (avec `out: "./drizzle"`, URL via env) remplace le JSON à credentials en dur. Migration générée et commitée : `drizzle/0000_funny_wasp.sql` crée `wedding_selections`. |
| 3 | Persistance en trompe-l'œil | L'API distingue désormais `local_only`, `server` et `unavailable`. Sans base : **200 honnête** au lieu d'un 503 avalé. |
| 4 | `pg.Pool` en serverless | `max: 1`, et le pool est mis en cache sur `globalThis` en production aussi (il ne l'était pas). |

## Résultats après correctifs

| Contrôle | Avant | Après |
|---|---|---|
| `next build` **sans** `DATABASE_URL` | ❌ Fail | ✅ **Pass** |
| `eslint .` | ❌ 1 erreur | ✅ 0 erreur |
| `tsc --noEmit` | ✅ | ✅ |
| `GET /api/health` | ❌ 500 | ✅ 200 `{ok:true, database:"not_configured"}` |
| `POST /api/wedding/selections` | ❌ 503 | ✅ 200 `{ok:true, persistence:"local_only"}` |
| POST JSON invalide | 💥 500 non géré | ✅ 400 `{error:"Invalid JSON body"}` |

## Nettoyage

- `src/lib/cover-assets.ts` supprimé (163 lignes jamais importées, mappant 110 images inexistantes).
- Import mort `statusLabel` retiré de `page.tsx`.
- **4 relations cassées supprimées** (`album`, `chaussures`, `cocktail`, `souvenirs`) — vérifié : 0 référence orpheline restante.
- Compteurs dérivés des données (`publishedCoverCount` = `subjects.length`) : l'UI affiche « 001—036 / 36 PUBLIÉES » au lieu de sous-entendre 365 couvertures existantes. Le teaser « 037—365 » est lui aussi calculé.
- Effet de montage restructuré : lecture `localStorage` + API en une seule passe async, une seule mise à jour d'état, et les choix faits pendant le chargement ne sont plus écrasés.
- `.gitignore` ajouté (absent du dépôt), `package-lock.json` commité.
- `README.md` + `.env.example` ajoutés, scripts `db:generate` / `db:migrate` / `db:push`, `engines.node >= 20.9.0`.

## ⚠️ Non vérifié

**Le chemin « base de données réellement branchée » n'a pas pu être testé** :
ni Postgres ni Docker ne sont disponibles dans cet environnement. Le SQL est
généré par `drizzle-kit` à partir du schéma (donc fiable), mais
`persistence: "server"` — lecture/écriture réelles, cookie de session, pooler —
**reste à valider sur un vrai environnement** avant d'annoncer la persistance
multi-appareils aux utilisateurs.

## Reste à faire (inchangé)

Rapatrier les images en local + `next/image`, produire les couvertures
manquantes (36/365), remonter les erreurs de persistance à l'utilisateur,
ajouter des tests.
