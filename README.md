# Almahy Management Portal

An internal admin dashboard and management portal for a Dubai legal and advisory practice. It covers clients, cases, consultations and documents.

> **Technical assessment project.** Not affiliated with or endorsed by Almahy. All names, clients, cases and figures are fictional demo data.

| | |
|---|---|
| **Live URL** | https://almahy-portal-assessment.vercel.app |
| **Demo accounts** | `admin@almahy.demo` · `manager@almahy.demo` · `viewer@almahy.demo`. The password is shared with reviewers separately and is never stored in the repo. |
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix UI · TanStack Query 5 · nuqs · React Hook Form + Zod 4 · Recharts · Drizzle ORM · Postgres (Neon) · Vitest + Testing Library · Vercel |

---

## Contents

1. [What's inside](#whats-inside)
2. [Getting started](#getting-started)
3. [Environment variables](#environment-variables)
4. [Architecture](#architecture)
5. [Rendering strategy](#rendering-strategy)
6. [State management](#state-management)
7. [API](#api)
8. [Security](#security)
9. [Performance](#performance)
10. [Accessibility and UX](#accessibility-and-ux)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Scaling to a larger production environment](#scaling-to-a-larger-production-environment)
14. [Trade-offs and known limitations](#trade-offs-and-known-limitations)

---

## What's inside

| Area | Where | Highlights |
|---|---|---|
| **Dashboard** | `/dashboard` | 6 KPIs with deltas vs the previous period; opened-vs-closed trend; practice-area mix; lawyer workload; upcoming consultations. Date-range presets and a custom range, kept in the URL. Each widget streams in on its own. |
| **Management module** | `/cases` | Server-side pagination, debounced search, multi-select filters (status, priority, practice area) and sortable columns, all synced to the URL. Bulk select with status/assign/delete actions. Confirmation modal. Optimistic updates with rollback. |
| **Detail module** | `/cases/[id]`, `/clients/[id]` | Dynamic routes. Inline-editable "Matter details" and "Engagement" sections. Activity timeline. Related documents, consultations and other cases for the same client. |
| **Advanced form** | `/cases/new` | 4-step wizard. Each step is validated before continuing, and the server validates everything again. Conditional fields (company vs individual, litigation court, fee label). Draft autosave and restore. Loading, success and error states. |
| **Directory pages** | `/clients`, `/consultations`, `/documents`, `/settings` | Server-rendered lists with URL filters and link pagination. The settings page shows the RBAC matrix. |
| **Auth and RBAC** | `/login` | Admin / Case manager / Viewer. Enforced in the API and reflected in the UI. |

---

## Getting started

**Requirements:** Node.js 20.9 or later, and a Postgres database. A free [Neon](https://neon.tech) project works, as does local Postgres.

```bash
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run db:push              # create tables from src/server/db/schema.ts
npm run db:seed              # load deterministic demo data (~26 months of history)
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js core-web-vitals, TypeScript, React Compiler rules) |
| `npm run typecheck` | Generates route types (`next typegen`), then runs `tsc --noEmit` |
| `npm test` | Unit and component tests (Vitest) |
| `npm run check` | Lint, typecheck and test. Run this before pushing. |
| `npm run db:push` / `db:seed` / `db:studio` | Sync the schema, reseed the demo data, browse the DB |

---

## Environment variables

Every variable is documented in [`.env.example`](./.env.example). Real values live only in `.env.local` (git-ignored) and in Vercel's project settings.

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | server | Postgres URL. On Neon, use the **pooled** connection string. |
| `AUTH_SECRET` | ✅ | server | Signs session cookies (HS256). **At least 32 characters.** Generate with `openssl rand -base64 32`. The app refuses to run with a shorter one. |
| `SEED_DEMO_PASSWORD` | seed only | `npm run db:seed` | Password for the demo accounts. It is stored only as a bcrypt hash. |

- No variable uses the `NEXT_PUBLIC_` prefix, so **nothing is bundled into browser JavaScript**.
- Server-only modules (`src/server/**`) import `server-only`. Importing them from a Client Component fails the build.
- Environment values are validated with Zod on first use (`src/server/env.ts`), with a clear error message if something is missing.

---

## Architecture

```
src/
├── app/                     Routes only: thin pages, layouts, route handlers
│   ├── (portal)/            Signed-in area (shared shell and session check)
│   │   ├── dashboard/  cases/  cases/[id]/  cases/new/  clients/  clients/[id]/ …
│   │   └── error.tsx        Error boundary for every portal page
│   ├── api/                 REST endpoints (Route Handlers)
│   ├── login/
│   └── layout.tsx           Fonts, theme script, client providers
├── components/              UI, grouped by feature
│   ├── ui/                  Design-system primitives (Radix-based): Button, Dialog, Tabs…
│   ├── data-table/          Generic typed DataTable, Pagination, FacetFilter
│   ├── cases/  dashboard/  lists/  layout/
│   └── confirm-dialog.tsx, states.tsx (empty and error), form-field.tsx
├── hooks/                   Client data hooks (TanStack Query) and small utilities
├── lib/                     Shared by server AND client: no secrets, no DB
│   ├── domain.ts            Domain vocabulary (statuses, roles…) and labels, defined once
│   ├── validation/          Zod schemas: the single source of validation truth
│   ├── auth/                RBAC map and session token (sign/verify)
│   ├── cases/ dashboard/ lists/   URL contracts, query keys, types, pure helpers
│   └── api/                 Typed fetch client and response types
├── server/                  Server-only
│   ├── db/                  Drizzle schema, client and seed
│   ├── services/            Business logic and queries (one file per area)
│   ├── api/route.ts         route() wrapper: auth, RBAC, JSON and error mapping
│   └── auth/  env.ts  rate-limit.ts
└── proxy.ts                 Next 16 "proxy" (formerly middleware): fast auth redirects
```

### Layers

```
Browser ──fetch──▶ Route Handler (app/api) ──▶ Service (server/services) ──▶ Postgres
                    auth · RBAC · Zod              business rules · SQL
                                                        ▲
Server Component (app/(portal)) ────────────────────────┘  (calls services directly)
```

- **Route Handlers are thin.** `route(permission, handler)` handles authentication, the permission check, JSON serialization and error mapping (400/401/403/404/415/429/500). Each handler contains only its endpoint's logic.
- **Services hold the logic**, for example "status → closed sets `closedAt`" or "every change writes a timeline entry in the same transaction".
- **Server Components call services directly**, not their own API over HTTP. That avoids an extra network hop, and the same service backs both paths.
- **`lib/` is shared.** Zod schemas, the RBAC map, URL parsers and domain constants run on both server and client, so rules can't drift between them. For example, one `caseCreateSchema` validates the wizard's steps in the browser and the `POST /api/cases` body on the server.

### Data model

`users` · `clients` · `cases` · `consultations` · `documents` · `activities`

- `activities` is an append-only history table that powers the case timeline.
- Enums (status, priority, practice area…) are Postgres enums generated from the same TypeScript tuples the UI uses.
- Indexes match the list filters and the dashboard's date-range queries.

---

## Rendering strategy

| Page | Strategy | Why |
|---|---|---|
| `/login` | **Static** (prerendered) | No per-user data |
| `/dashboard` | **Dynamic Server Components + Suspense streaming** | Each widget is an async Server Component in its own `<Suspense>`, so fast KPIs appear before the slower trend query finishes. Changing the date range updates the URL non-shallowly inside a **React transition**, which keeps the old numbers visible (dimmed) until the new ones stream in. |
| `/cases` | **Server prefetch → client hydration** | The page queries page 1 on the server and passes it to TanStack Query via `HydrationBoundary`, so the first paint has data. After that, filters and paging are fetched client-side from the REST API, which gives an instant, app-like table. |
| `/cases/[id]` | **Server prefetch → client hydration** | Same pattern, so inline edits can update the cache optimistically. `generateMetadata` and the page share one request-cached query (React `cache`). |
| `/cases/new` | **Client-only, lazy** (`next/dynamic`, `ssr: false`) | The wizard restores a draft from `localStorage` on first render. It exists only in the browser, and loading it lazily keeps the form code out of other pages. |
| `/clients`, `/consultations`, `/documents`, `/settings` | **Server Components, very little JavaScript** | Read-mostly lists. Filters live in the URL, pagination is plain links, and only the filter toolbar is interactive. |

**Rule of thumb used throughout:** fetch on the server, interact on the client. `"use client"` appears only on leaf components that need state, effects or event handlers: the table, forms, menus, charts and the filter bar.

---

## State management

Each kind of state has exactly one owner:

| State | Owner | Example |
|---|---|---|
| **Server data** | TanStack Query cache | Case list pages, case detail |
| **List filters, sort, page, date range** | **The URL** (nuqs) | `/cases?status=open,on_hold&sort=feeAmount&page=2` |
| **Form state** | React Hook Form | Wizard steps, inline edit forms |
| **Draft** | `localStorage` (versioned, per user) | New-case wizard autosave |
| **Session** | httpOnly cookie → server → React context | `useSession()`, `useCan("case:delete")` |
| **Ephemeral UI** | `useState` | Open dialogs, row selection |

There's no global store (Redux or Zustand): nothing needs one.

**Caching and revalidation (TanStack Query):**
- `staleTime` is 30 s, so remounts within that window don't refetch. `gcTime` is 5 min, so back-navigation is instant.
- Query keys are hierarchical (`["cases", "list", params]`, `["cases", "detail", id]`), so a mutation can invalidate a whole family.
- 4xx errors are never retried, and 5xx or network errors are retried twice.

**Optimistic updates:** bulk status/assign/delete, status changes and inline edits.
1. `onMutate` cancels in-flight fetches, snapshots the cache and writes the expected result.
2. `onError` restores the snapshot and shows a toast.
3. `onSettled` invalidates, so the server's version (including the new timeline entry) wins.

The transforms are pure functions (`applyBulkToPage`, `applyCasePatch`) with unit tests.

**Error recovery:**
- API errors become a typed `HttpError`. Field errors come back keyed by dotted path (`matter.courtName`) and appear under the matching input, and the wizard jumps to that step.
- A 401 sends the user to `/login?next=…`, which is protected against open redirects.
- Error boundaries (`error.tsx`) and per-query error states offer "Try again".
- Failed optimistic writes roll back.

---

## API

All endpoints require a session cookie. Payloads are validated with Zod, and errors use one shape: `{ "error": { "code", "message", "fields?" } }`.

| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | Rate-limited on failed attempts. Sets the httpOnly cookie. |
| POST | `/api/auth/logout` | public | Clears the cookie |
| GET | `/api/cases?q&status&priority&area&sort&order&page&size` | `case:read` | Returns `{ data, meta: { page, pageSize, total, totalPages } }` |
| POST | `/api/cases` | `case:create` | Wizard payload. Creates the client (if new), the case and the first timeline entry in one transaction. Returns 201. |
| GET | `/api/cases/:id` | `case:read` | Case with client, documents, consultations, activity and related cases |
| PATCH | `/api/cases/:id` | `case:update` | Any subset of the editable fields. Unknown keys are rejected. |
| DELETE | `/api/cases/:id` | `case:delete` | Admin only |
| POST | `/api/cases/bulk` | `case:update` (+`case:delete` for delete) | `{ action: "set_status" \| "assign" \| "delete", ids, … }`, up to 100 ids |
| GET | `/api/dashboard?range=90d` or `?range=custom&from&to` | `dashboard:view` | KPIs, trend, mix, workload, upcoming |
| GET | `/api/users/assignees` | `case:read` | Lawyers a case can be assigned to |

---

## Security

- **Authentication:** email and password checked with bcrypt. The comparison takes the same time whether or not the email exists, so the endpoint can't be used to discover accounts. The session is an **HS256 JWT in an httpOnly, `Secure` (in production), `SameSite=Lax` cookie** with an 8-hour lifetime, so JavaScript (and XSS) can't read it.
- **Authorization:** one RBAC map (`lib/auth/permissions.ts`), enforced in three places.
  1. `proxy.ts` gives fast redirects for signed-out users (optimistic only).
  2. Every page calls `requireSession(permission)` on the server.
  3. Every API route goes through `route(permission, …)`. This is the real boundary.

  The UI hides what a role can't do (`useCan`), but that's only for usability. For example, a manager calling `DELETE` with curl still gets a 403.
- **CSRF:** `SameSite=Lax` cookies, and mutations only accept `application/json`, which a cross-site HTML form can't send.
- **Input validation:** Zod on every body and parameter. Sort columns are whitelisted, `LIKE` wildcards are escaped, and all SQL goes through Drizzle (parameterized). Unknown fields are rejected on PATCH.
- **Brute force:** failed logins are rate-limited per IP (10 per 15 min). Successful logins and server errors don't count.
- **Secrets:** nothing secret is in the repo. `.env*` is git-ignored except `.env.example`, secrets are validated at runtime, `server-only` guards against client imports, and demo passwords come from an environment variable.
- **Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy` and a restrictive `Permissions-Policy`. `X-Powered-By` is removed.
- **Error hygiene:** unexpected errors are logged on the server, and clients only see a generic message (no stack traces or SQL).

---

## Performance

- **Server Components by default:** KPI tiles, tables on the directory pages and page shells ship no JavaScript.
- **Streaming:** dashboard widgets stream independently through `<Suspense>`, and every route has a skeleton `loading.tsx`.
- **Code-splitting:** Recharts (the largest dependency) and the wizard load through `next/dynamic` only where they're used.
- **Efficient queries:**
  - All six KPIs come from **one table scan** using `FILTER` aggregates.
  - The list query and the count query run in parallel.
  - The detail page's related lists run in parallel.
  - React `cache` removes duplicate queries within a request.
  - Indexes match the filters.
- **Efficient requests:**
  - Search is debounced.
  - `AbortSignal` cancels outdated requests.
  - `keepPreviousData` avoids empty flashes between pages.
  - The next page is prefetched in the background.
  - Only changed fields are sent on edit.
- **Fewer re-renders:** table rows are `memo`ized and selection uses functional updates, so ticking a checkbox re-renders one row, not the table. Column definitions are memoized, and React Hook Form keeps typing out of React state.
- **Fonts and images:** `next/font` self-hosts Geist with no layout shift. `next.config.ts` serves images as AVIF/WebP through `next/image`, though the demo has no raster images: icons are inline SVG (lucide).
- **Region:** `vercel.json` pins functions to `fra1`, next to the Neon database in `eu-central-1`.

---

## Accessibility and UX

- **Keyboard:** everything is reachable and operable by keyboard.
  - There's a skip link, and the current nav item is marked with `aria-current`.
  - Radix handles focus trapping, Escape and focus return in dialogs, menus and tabs.
  - The confirm dialog focuses **Cancel** first.
  - Edit forms focus their first field and return focus to "Edit" on close. The wizard moves focus to each step heading and to the first invalid field.
- **Screen readers:**
  - Labelled inputs with `aria-invalid` and `aria-describedby` errors.
  - `aria-sort` on sortable headers, `aria-busy` while loading, and `aria-live` for "Updating…" and pagination.
  - Table captions, and a data-table alternative for every chart.
- **Not colour alone:** priorities have icons, KPI deltas say "improvement" or "decline", and the two chart series have a legend and direct labels. Chart colours were checked for colour-blind separation in both themes.
- **Responsive:**
  - The sidebar becomes a slide-in sheet on mobile.
  - Lower-priority table columns hide on small screens, and tables scroll horizontally if needed.
  - Every page was checked at 360 px with no horizontal overflow.
- **Motion:** subtle transitions on dialogs, menus, tabs and wizard steps, all turned off when the OS asks for reduced motion.
- **Dark mode:** a class-based theme with its own token values, applied before first paint (no flash).
- **States:** skeleton loaders, empty states with a next step, error states with retry, and success toasts.

---

## Testing

`npm test` runs **53 unit and component tests** (Vitest + Testing Library) on the critical logic:

| Area | Tests |
|---|---|
| Security | RBAC matrix; JWT tampering and secret rotation; open-redirect guard; login rate limiter |
| URL contracts | Case list params parsing and fallbacks for hostile input; dashboard range resolution |
| Validation | Wizard conditional rules (company fields, litigation court, fee); email normalisation; coercion |
| State | Optimistic bulk transforms (and no cache mutation); optimistic patch merge; draft storage (corruption and quota) |
| Components | Keyboard-operable Button; ConfirmDialog (alertdialog role, focus on Cancel, Escape); KPI deltas described in words |

The end-to-end flows (login, filters, bulk actions, optimistic rollback, wizard with a server error, dashboard ranges, role restrictions, 360 px layouts) were exercised in Chromium with Playwright during development. Adding them as a committed E2E suite is the first item under [Scaling](#scaling-to-a-larger-production-environment).

---

## Deployment

The app is hosted on **Vercel** (Next.js), with **Neon** serverless Postgres in Frankfurt.

1. Import the GitHub repo into Vercel. The framework (Next.js) is detected automatically.
2. Add `DATABASE_URL` (Neon pooled URL) and `AUTH_SECRET` under **Settings → Environment Variables**.
3. Create the schema and demo data from a machine with the same `DATABASE_URL`: `npm run db:push && npm run db:seed`.
4. Every push to `main` deploys to production. `vercel.json` pins the function region to `fra1`.

---

## Scaling to a larger production environment

What I would change as usage, data and the team grow:

**Data and API**
- **Pagination:** switch from offset to **cursor/keyset pagination** for deep pages.
- **Search:** add Postgres full-text search, or `pg_trgm` indexes for `ILIKE`, then a dedicated search service if needed.
- **Dashboard:** precompute aggregates (materialized views refreshed on a schedule) instead of computing them per request.
- **Caching:** cache read-heavy endpoints (Next `use cache` / `cacheTag` with tag invalidation on writes, or Redis).
- **Rate limiting:** move it to a shared store (Redis/Upstash) so all serverless instances share the counts.
- **API contract:** publish the Zod schemas as an OpenAPI spec and version the API.

**Security**
- SSO (SAML or OIDC through the firm's identity provider), MFA, and session revocation (store session ids server-side).
- Audit log for every read of sensitive records, and a nonce-based Content-Security-Policy.
- Row-level security or tenant scoping if multiple offices or firms share the system.

**Features**
- Real document storage (S3 with presigned URLs, virus scanning, versioning).
- Background jobs for notifications and reminders (a queue).
- Real-time updates (SSE or WebSockets) when several lawyers edit the same case.
- **i18n with Arabic and RTL**, which matters for a Dubai firm.

**Engineering**
- Committed Playwright E2E tests, visual regression tests and axe accessibility checks in CI.
- Error monitoring and tracing (Sentry, OpenTelemetry).
- Feature flags, preview environments per pull request (Vercel already provides these), and database branching per preview (Neon).
- As the team grows: move to feature-first folders (`features/cases/{components,hooks,api}`), extract `components/ui` into a shared design-system package, and run versioned migrations (`drizzle-kit generate` + migrate in CI) instead of `push`.

---

## Trade-offs and known limitations

- **Custom auth instead of Auth.js:** credentials-only login needed ~100 lines that are easy to explain and audit. With SSO or OAuth requirements, Auth.js or the identity provider's SDK would replace it.
- **Two data-fetching patterns, on purpose:**
  - The highly interactive Cases table uses a client cache (TanStack Query), which gives optimistic updates and instant paging.
  - The read-mostly pages and the dashboard re-render on the server, which gives less JavaScript and simpler code.
- **`drizzle-kit push`** keeps the schema in sync for a demo. A production team would use versioned migration files.
- **The in-memory rate limiter** works per instance. See Scaling.
- **Documents are metadata only.** No files are uploaded or stored.
- **Client editing:** new clients can be registered through the New Case wizard, but there's no standalone client edit form yet.
- **Data freshness:** the seed is deterministic, so running `npm run db:seed` resets all demo data.
