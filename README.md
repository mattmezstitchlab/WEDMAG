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

## Database

The `wedding_selections` table must be created before server persistence works.

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
`037—365` teaser). Cover imagery is still served from external Pexels URLs via
CSS `background-image`; moving it in-house and onto `next/image` is the main
outstanding front-end task.

See [`AUDIT-PRE-DEPLOIEMENT.md`](./AUDIT-PRE-DEPLOIEMENT.md) for the full
pre-deployment audit and the remaining roadmap.
