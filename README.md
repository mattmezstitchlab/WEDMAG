# World Wedding Magazine (WEDMAG)

An editorial wedding-planning experience: you browse magazine covers, tick what
appeals to you, and your project builds itself — surfacing the links and the
practical constraints between your choices.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind 4**,
**Drizzle ORM** and **Postgres**.

> ⚠️ The Next.js app lives in **`premium-wedding-editorial-experience/`**, not at
> the repository root. This matters for Vercel (see below).

---

## Quick start

```bash
cd premium-wedding-editorial-experience
npm ci
npm run dev
```

Open <http://localhost:3000>. **No database is required** to run the app.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | No | Postgres connection string. Without it, selections are stored in the browser only. |

Copy `.env.example` to `.env` to enable server-side persistence.

The app degrades on purpose:

- **No `DATABASE_URL`** → the API answers `{ persistence: "local_only" }` and the
  project lives in `localStorage`. Everything still works on a single browser.
- **With `DATABASE_URL`** → selections are also persisted server-side, keyed by an
  anonymous `wwm-project` session cookie.
- **Database configured but unreachable** → the API returns `503` with
  `{ persistence: "unavailable" }`; the UI keeps working from `localStorage`.

### API contract

`POST /api/wedding/selections` is strictly validated against the catalogue
(the single source of truth in `src/lib/wedding-data.ts`):

- `subjectId` must exist in the catalogue (which also bounds its length) —
  anything else is a `400` and never reaches the database;
- `status`, when present, must be one of `interested`, `contacted`,
  `chosen` — invalid values are rejected with `400` instead of being
  silently coerced, so an invalid request can never downgrade an existing
  valid status;
- absent `status` keeps the documented default (`interested`), matching the
  schema's own default.

The PACTE marriage layer adds `GET` / `POST /api/wedding/project` with the
same rules: `create` (idempotent, one project per session, optional name
and optional `situation` — the life situation the project accompanies),
`attach` (opens the subject's **dossier**, initial state `selection`) /
`detach`, `set-state` (dossier state) and `parcours-step` (validates the
next step of the dossier's recommended parcours — the arc is derived from
the catalogue subject, progress is a simple counter on the dossier). The dossier lifecycle is fully
modelled (inspiration → sélection → contact → proposition → engagement →
contrat → confirmé → préparation → jour J → archive) but only `inspiration`
and `selection` are settable for now — reserved states are refused with
`400`, never simulated. **`contact` included**: the dossier reaches the
contact state ONLY through the couple's explicit declaration
(`contact-attest`), never through `set-state`. Likewise, the life situations are modelled
(`mariage`, `naissance`, `deuil`, `reconnexion`, `couple-famille`,
`transmission`) but only `mariage` is real today: an unknown situation is
refused with `400` (`Invalid situation`) and a modelled-but-not-real one
with `situation is not available yet` — nothing is ever invented.

`GET` returns each dossier's real people (`contacts`): either a catalogue
reference (`professionalRef` = `subjectId:professionalId`, resolved live —
never a copy) or a person the couple declares they met (`declaredName`,
optional `declaredRole`). A contact carries a `status`
(`selectionne` / `contacte` — `confirme` is modelled and reserved), an
optional `note` and, once attested, `attestedAt`. There is deliberately
**no** email, phone, price, availability or qualification anywhere, and no
global person registry: contacts exist only inside their dossier (no CRM).
`contact-add` returns the created `contactId`; `contact-attest`
{`subjectId`, `contactId`, `note`?} records the couple's declaration and
moves the dossier to the contact state in one atomic transaction — WEDMAG
records the declaration, it verifies and certifies nothing;
`contact-confirm` (B1) records the couple's declaration that the
professional confirmed (`selection → contacte → confirme`, strict
sequence) with its own real timestamp — again the couple's words, never
a verified fact, never a contract, and it never touches the dossier's
state; `contact-proposition` (B2) records the couple's declaration that
they received the professional's proposition (`confirme → proposition`
required, the fact only — no price, no content, no document is ever
stored) and moves the dossier to the proposition state in one atomic
transaction, never backwards; `contact-engage` (B2) records the couple's
declared choice (`proposition → engage`) and moves the dossier to the
engagement state — still their words, never a contract or a verified
booking; `contact-remove` removes the person (including a confirmed or
engaged one) without rewriting the dossier's history;
`moment-hour` (C) sets the couple's own hour for a moment of the
pre-drawn day ({moment, hour | null} — a strict `HH:MM` or null to
fall back to the proposed hour; stored as a `moment_hours` jsonb
override map on the project, GET returns it as `momentHours`). Every declared
moment carries a persistent timestamp (`attestedAt`, `confirmedAt`,
`propositionAt`, `engagedAt` — real columns, never a substitute via
`updatedAt`). See
[`PACTE-MARIAGE.md`](../PACTE-MARIAGE.md) and
[`WEDMAG-DOSSIERS.md`](../WEDMAG-DOSSIERS.md).

### Restore rule (server vs localStorage)

On load, the project is restored in one pass with a deterministic rule
(`mergeRestoredProject` in `src/lib/wedding-project.ts`):

- `local_only` or unreachable API → `localStorage` is the project;
- `server` with a **non-empty** snapshot → the server snapshot is
  authoritative: a selection removed from another browser disappears
  instead of being resurrected by stale `localStorage`;
- `server` with an **empty** snapshot → `localStorage` is kept (an empty
  snapshot cannot distinguish "never synced" from "everything was removed
  elsewhere"; the non-destructive choice wins);
- anything ticked while the restore is in flight always wins.

Known, accepted limitation: selections made while offline (their POST
failed silently) can be dropped from the view when a non-empty server
snapshot is later restored.

The wedding project itself (`Mon mariage` → `Créer mon projet`) follows the
symmetric rule (`mergeRestoredWedding`): a non-null `server` project is
authoritative, otherwise `localStorage` keeps it, and anything created or
attached while loading wins. A project created while the database was
unavailable is not replayed to the server afterwards.

## Database

Three migrations exist: `wedding_selections` (selections),
`wedding_projects` + `wedding_project_items` (PACTE MVP), and
`wedding_dossiers` (migration 0002 — the dossiers layer renames/evolves
`wedding_project_items` non-destructively: same rows, plus a stable `id`,
a `state` lifecycle and `updated_at`).

```bash
npm run db:generate   # regenerate SQL after editing src/db/schema.ts
npm run db:migrate    # apply migrations (needs DATABASE_URL)
npm run db:push       # or push the schema directly, for local dev
```

Migrations are committed under `drizzle/`.

> In production use a **pooled** connection string (Neon pooler, Supabase
> pgBouncer). Serverless functions exhaust direct Postgres connections. The pool
> is capped at `max: 1` per instance for this reason.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` / `db:migrate` / `db:push` | Drizzle migrations |

## Deploying to Vercel

1. **Set _Root Directory_ to `premium-wedding-editorial-experience`.** Without
   this, Vercel finds no framework at the repo root and the deploy fails.
2. Framework preset: Next.js (auto-detected once step 1 is done).
3. Optionally add `DATABASE_URL` (Production + Preview). The build succeeds
   without it.
4. If you set `DATABASE_URL`, run the migration once against that database
   before relying on persistence.

## Project structure

```
premium-wedding-editorial-experience/
├── drizzle/              # generated SQL migrations
├── public/covers/        # cover imagery
└── src/
    ├── app/
    │   ├── api/health/            # liveness + database status
    │   ├── api/wedding/selections # project persistence (GET / POST)
    │   ├── globals.css            # the whole design system
    │   ├── layout.tsx
    │   └── page.tsx               # the entire experience
    ├── db/               # lazy Drizzle/pg setup + schema
    └── lib/
        └── wedding-data.ts        # the editorial catalogue
```

## Current state

The catalogue currently ships **36 written covers** out of the 365 the full
edition aims for. The UI reflects this honestly (`001—036 / 36 PUBLIÉES`, with a
`037—365` teaser). Ten subjects have a dedicated local cover under
`public/covers/`; the remaining visuals (the shared image pool used by the
other subjects, the hero and the closing section) are still served from
external Pexels URLs via CSS `background-image` — sources and licence are
recorded in `public/covers/CREDITS.md`. Moving that pool in-house and onto
`next/image` is the main outstanding front-end task.

See [`AUDIT-PRE-DEPLOIEMENT.md`](./AUDIT-PRE-DEPLOIEMENT.md) for the full
pre-deployment audit and the remaining roadmap.
