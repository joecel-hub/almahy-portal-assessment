# Almahy Management Portal

An internal admin dashboard and management portal for a legal and advisory practice: clients, cases, consultations and documents.

> **Technical assessment project.** Not affiliated with or endorsed by Almahy. All names, clients, cases and figures are fictional demo data.

- **Live URL:** _added after first deployment_
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix UI · TanStack Query · React Hook Form + Zod · Recharts · Drizzle ORM + Neon Postgres · Vitest + Testing Library

---

## Getting started

Requirements: Node.js 20.9 or later, and a Postgres database (a free [Neon](https://neon.tech) project works).

```bash
npm install
cp .env.example .env.local   # then fill in the values (see "Environment variables")
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js core-web-vitals and TypeScript rules) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit and component tests (Vitest, jsdom) |
| `npm run check` | Lint, typecheck and test: what CI and a pre-push check run |

## Environment variables

All variables are documented in [`.env.example`](./.env.example). Real values live only in `.env.local` (git-ignored) and in the hosting provider's settings. Nothing secret is committed.

| Variable | Required | Used by | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | server | Postgres connection string (Neon pooled URL) |
| `AUTH_SECRET` | yes | server | Signs the session cookie. Generate with `openssl rand -base64 32` |
| `SEED_DEMO_PASSWORD` | seed only | seed script | Password given to the seeded demo accounts |

None of these use the `NEXT_PUBLIC_` prefix, so none of them are ever bundled into client JavaScript.

## Architecture

_In progress. Will document: folder structure, the route handler → service → database layers, rendering strategy (Server vs Client Components), state management, caching and optimistic updates, security model, and scaling notes._
