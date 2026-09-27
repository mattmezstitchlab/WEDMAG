# Rapport de hardening — WEDMAG — 27 septembre 2026

**Branche :** `arena/01a0e298-wedmag` · **Référence :** `AUDIT-2026-09-27.md`
**Périmètre :** correctifs ciblés des constats M1, M2, M3 (partiel), m1, m2, m3, m5 (favicon) + anomalies techniques associées. Aucune refonte, aucune fonctionnalité métier ajoutée, aucun changement de concept, de design, de textes ou d'architecture.

---

## Corrigé

### 1. Validation stricte de `subjectId` (audit M1) — PRIORITÉ HAUTE
- Nouveau module `src/lib/selection-validation.ts` : validation pure, **source de vérité unique = le catalogue** (`subjects` de `wedding-data.ts`, un seul `Set` d'ids, aucune duplication de liste).
- `POST /api/wedding/selections` rejette en `400` : sujet absent du catalogue (`Unknown subjectId`), identifiant > 64 caractères (`subjectId is too long`), identifiant manquant/vide/espaces/non-chaîne (`subjectId is required`), corps non-objet (`Invalid request body`).
- **Aucune écriture en base pour un sujet inexistant** — vérifié sur PostgreSQL réel : 30 requêtes de spam + payloads de 4 000 caractères → **0 ligne créée** (avant le correctif, le même test créait 63 lignes / 62 sessions).

### 2. Validation stricte des statuts (audit M2) — PRIORITÉ HAUTE
- Un statut présent mais invalide (`"HACKED"`, `"CHOSEN"`, `42`, `true`, …) → `400 {"error":"Invalid status"}`, **sans jamais transformer silencieusement** la valeur.
- Statut invalide rejeté même sur une action `remove` ; `action` inconnue → `400`.
- **Régression M2 vérifiée sur base réelle** : `dj` positionné à `chosen`, puis POST `{"status":"HACKED"}` → 400, et le GET suivant renvoie toujours `chosen` (avant : rétrogradé en `interested`).
- Statut absent → conserve le défaut documenté `interested` (cohérent avec le `DEFAULT` du schéma SQL) — comportement inchangé, documenté dans le README.

### 3. Synchronisation localStorage / serveur (audit M3) — PRIORITÉ MOYENNE
- Nouvelle fonction pure `mergeRestoredProject` (`src/lib/wedding-project.ts`), utilisée par le montage de `page.tsx`, règle déterministe et documentée (README § « Restore rule ») :
  - `local_only` / API injoignable (503) → `localStorage` fait foi (comportement local_only **inchangé**) ;
  - snapshot serveur **non vide** → le serveur est autoritaire : une sélection supprimée depuis un autre navigateur **ne ressuscite plus** ;
  - snapshot serveur **vide** → `localStorage` conservé (choix non destructeur : « vide » ne permet pas de distinguer « jamais synchronisé » de « tout supprimé ailleurs ») ;
  - tout ce qui est coché **pendant** le chargement gagne toujours (comportement existant préservé).
- 6 tests unitaires couvrent la règle (dont la régression de résurrection).

### 4. Images du catalogue (audit M4) — PRIORITÉ MOYENNE (partiel, voir « Non corrigé »)
- Les 36 couvertures vérifiées : 10 sujets ont leur couverture locale dédiée (toutes présentes sur disque), 26 utilisent le pool de 8 URLs Pexels (pool partagé aussi par hero + clôture).
- `public/covers/CREDITS.md` ajouté : registre de provenance des 8 photos Pexels (IDs, URLs sources, licence), point d'entrée du futur rapatriement.
- **9 images réellement mortes supprimées** (`111–119`, 2,0 Mo) après vérification d'usage (grep complet du dépôt : zéro référence applicative).

### 5. Petites corrections techniques
- **Favicon** : `src/app/icon.svg` ajouté (marque minimale noir/papier/fuchsia, convention App Router). Servi en `200 image/svg+xml` avec `<link rel="icon">` injecté automatiquement.
- **Classes orphelines** : `plan-block`, `selected-section`, `suggestion-section` avaient 0 règle CSS — tokens retirés du JSX (aucun changement visuel, aucune autre référence).
- **Accessibilité des dialogues** (audit m1) : nouveau hook `src/lib/use-dialog.ts`, branché sur la fiche sujet et le drawer — fermeture par `Échap` (dialogue du dessus en priorité), piège de focus `Tab`/`Shift+Tab`, focus déplacé dans le dialogue à l'ouverture, restitution du focus à la fermeture. Gère l'empilement drawer/fiche. Toast : `role="status"` + `aria-live="polite"` + libellé du bouton. **Aucun changement d'apparence ni de comportement fonctionnel.**
- **Script de tests corrigé** : `node --import tsx --test "src/**/*.test.ts"` (glob entre guillemets interprété par Node) — l'ancien glob `sh` ne descendait que d'un niveau ; les tests de route imbriqués sont maintenant exécutés.

---

## Vérifié

Batterie exécutée intégralement sur l'état final (Node 22.22.3) :

1. `npm ci` propre (lockfile inchangé) ;
2. `eslint .` → 0 erreur / 0 avertissement ;
3. `tsc --noEmit` → 0 erreur ;
4. `npm test` → **36/36** (10 existants + 14 validation + 6 fusion + 6 route) ;
5. `next build` **sans** `DATABASE_URL` → succès (`/` statique, `/icon.svg` généré) ;
6. Runtime sans base : `/` 200 (35,7 Ko, 36 cartes pré-rendues), `/api/health` 200 `not_configured`, GET/POST `local_only` ;
7. Runtime base injoignable : `/api/health` 503 `unreachable`, POST 503 `unavailable`, page `/` toujours 200, validation en 400 **avant** la base ;
8. Runtime PostgreSQL 18.4 réel (embedded-postgres hors dépôt) : `drizzle-kit migrate` OK, `health` → `connected`, cycle complet POST → cookie (`HttpOnly`/`SameSite=lax`/`Secure`/1 an) → GET → update → remove ;
9. `subjectId` inexistant (`album`) → 400, **0 ligne créée** ;
10. `subjectId` de 4 000 caractères → 400 `subjectId is too long`, **0 ligne créée** ;
11. Statut invalide → 400 `Invalid status` ;
12. Statut valide **préservé** face à une requête invalide (`chosen` intact après tentative d'écrasement) — régression M2 ;
13. Comportement localStorage/serveur : 6 tests unitaires `mergeRestoredProject` (règle déterministe) ;
14. Catalogue complet : `tools/data-integrity.ts` → 0 problème, 0 doublon, 0 relation orpheline, 0 fichier image non référencé ;
15. 36 couvertures : 10 locales vérifiées sur disque + servies en 200, 26 Pexels recensées dans CREDITS.md ;
16. Favicon : `GET /icon.svg` → 200, balise `<link rel="icon">` présente dans le HTML ;
17. Dialogues : logique vérifiée au niveau code + présence confirmée dans le bundle client (`Escape`, `role:"status"`) — smoke test navigateur impossible (voir « Non corrigé ») ;
18. Routes principales : `/`, `/api/health`, `/api/wedding/selections` (GET/POST), `/icon.svg`, `/covers/*`, 404 propre sur route inconnue.

---

## Non corrigé (avec justification)

| Point | Justification |
|---|---|
| **Localisation des 8 images Pexels (M4)** | `images.pexels.com` est **injoignable depuis cet environnement** (erreur SSL, egress restreint). Les seuls visuels locaux disponibles (111–119) étaient des images différentes : les substituer aurait été un **remplacement arbitraire** interdit par la mission. Atténué : CREDITS.md (registre de provenance + licence) et README à jour ; le chantier est prêt à être exécuté depuis un environnement avec accès réseau. |
| **Rate-limit sur l'API** | Non demandé par la mission ; la validation catalogue élimine le risque constaté (croissance de table) — le résiduel est du trafic 400, sans stockage. L'audit le mentionnait comme optionnel. |
| `statusLabel` export inutilisé (m10) | Hors de la liste §5 de la mission ; suppression non demandée. |
| `GET` sans cookie → `persistence:"server"` sans test de base (m7) | Hors périmètre ; cosmétique, documenté dans l'audit. |
| Colonne `sort_order` jamais lue (m8), en-têtes de sécurité (m11), Tailwind inutilisé (m4) | Hors périmètre (mission §6 : ne pas modifier inutilement). |
| Smoke test visuel headless | **Aucun Chromium/navigateur headless disponible** dans cet environnement (installation impossible : egress restreint). Dialogues vérifiés aux niveaux code + bundle + build. |

---

## Risques restants (constatés)

1. **Hotlink Pexels toujours actif** pour 26 couvertures + hero + clôture : dépendance de disponibilité externe et conditions d'usage à valider — documenté (CREDITS.md, README), reprise préparée.
2. **Limite connue et acceptée de la règle de restauration** : des sélections faites hors-ligne (POST échoué silencieusement) peuvent disparaître de la vue si un snapshot serveur non vide est restauré ensuite (documenté README).
3. **Cas résiduel M3** : la suppression de *tous* les éléments depuis un autre navigateur (snapshot serveur vide) ne se propage pas — choix non destructeur délibéré, documenté.
4. **Dialogues non testés dans un vrai navigateur** (pas de headless disponible) : le comportement clavier/focus est vérifié au niveau code et bundle uniquement.
5. Cookie `Secure` inexploitable en `http://localhost` en production build (m12, préexistant, sans impact Vercel/HTTPS).

---

## Résultats

```
lint:               PASS
typecheck:          PASS
tests:              PASS  (36/36)
build:              PASS  (sans DATABASE_URL)
runtime local_only: PASS
runtime 503:        PASS
runtime PostgreSQL: PASS  (18.4 réel, migration + cycle complet)
API validation:     PASS  (400 sur sujet inconnu / trop long / statut invalide / action inconnue ;
                          statut valide préservé ; 0 ligne parasite en base)
catalogue:          PASS  (0 problème, 0 asset mort, 36 couvertures vérifiées)
```

Aucun contrôle critique n'a échoué. Aucune route existante cassée, aucune fonctionnalité régressée, aucune donnée fictive introduite, aucun faux état de succès : les réponses `local_only` / `server` / `unavailable` restent strictement exactes, et les erreurs de validation sont désormais explicites.
