# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**IT Asset Nexus** — IT asset management and equipment loan system for a Malaysian government department, built with Next.js. Admins track physical inventory; staff request equipment loans digitally.

## Commands

- `npm run dev` — start dev server on port 9002 (Turbopack)
- `npm run build` — production build (`NODE_ENV=production next build`)
- `npm run start` — run production build
- `npm run lint` — Next.js lint
- `npm run typecheck` — `tsc --noEmit`
- `npm run prisma:generate` — regenerate Prisma client after schema changes
- `npm run prisma:dbpush` — push `prisma/schema.prisma` changes to the SQLite DB (no migration files are used — schema is pushed directly)

There is no test suite in this repo.

`next.config.ts` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` — production builds will succeed even with type/lint errors, so run `npm run typecheck` and `npm run lint` explicitly before relying on `npm run build` to catch issues.

## Architecture

### Data layer: Prisma + SQLite, not localStorage

The `README.md` and `docs/blueprint.md` describe this app as `localStorage`-based — that reflects the original scaffold, not the current code. The app now persists through **Prisma + SQLite** (`prisma/schema.prisma`, DB file at `prisma/prisma/dev.db`, `DATABASE_URL` in `.env.local`).

- `src/lib/prisma.ts` — Prisma client singleton (`global.prisma` cached in dev to survive HMR), plus `seedDefaultData()` which seeds default `AssetCategory` rows on first run (called from the login route).
- `src/lib/storage.ts` — client-side `Storage` object. Despite the name, it is **not** a localStorage wrapper for app data anymore — it's a thin `fetch` client that calls the `/api/*` routes below. The only thing actually kept in `localStorage` is the logged-in session (`it_session`), via `Storage.getSession()` / `Storage.setSession()`.
- `src/hooks/use-auth.ts` — client hook wrapping login/logout/session state, used by both admin and user layouts to gate access and redirect (`/admin/dashboard` for admin, `/user/catalogue` for staff).

### API routes (`src/app/api/*/route.ts`)

Thin REST wrappers around Prisma, called by `Storage`:
- `auth/login` — looks up `User` by email, plaintext password compare (no hashing, no sessions/JWT — auth state lives entirely in client `localStorage`)
- `users`, `assets`, `units`, `requests`, `categories` — CRUD per model
- `bulk` — generic bulk upsert endpoint, dispatches on a `{ type: 'users'|'assets'|'units'|'requests'|'categories', data }` body; used for bulk import features

### Data model (`prisma/schema.prisma`)

- `Asset` (a purchasable/loanable item type) has many `AssetUnit` (individual physical, serial-tracked units — each unit tracks its own `currentStatus`, `currentBorrowerId`, `condition`, `borrowHistory`)
- `BorrowRequest` (one per staff request) has many `BorrowRequestItem` (one per asset type requested within that request; each item can be assigned a specific `AssetUnit` on approval)
- `AssetCategory` is a separate lookup table (seeded by `seedDefaultData()`), distinct from `Asset.category` (a plain string field — not a foreign key)
- `User.role` is `'admin' | 'user'` (note: role string is `'user'`, but UI/routes refer to this role as "Staff")

### App structure

- `src/app/admin/*` — admin pages (dashboard, assets, inventory, requests, users), under `src/app/admin/layout.tsx` which gates on `useAuth().user.role === 'admin'`
- `src/app/user/*` — staff pages (catalogue, my-requests), under `src/app/user/layout.tsx`
- `src/components/ui/*` — ShadCN UI primitives (Radix-based); path alias `@/*` → `src/*` (see `tsconfig.json` / `components.json`)
- `src/lib/print-borang.ts` — generates the KEW.PA-9 government loan form as a PDF (uses `pdf-lib`/`jspdf`/`html2canvas`) with auto-filled request data
- `src/ai/*` — Genkit (`@genkit-ai/google-genai`) setup; run with `npm run genkit:dev` / `genkit:watch`. Check `src/ai/dev.ts` before assuming any AI feature is wired into the main app — it may be scaffold-only.

### Deployment

`apphosting.yaml` configures Firebase App Hosting (`maxInstances: 1`). `.idx/` and `dev.nix` are leftover Firebase Studio / Project IDX environment config.
