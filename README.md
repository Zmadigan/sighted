# 🌿 Sighted: your wildlife journal

Snap a photo of any animal. Get an instant ID. Build your lifelong wildlife journal.

Built with Next.js (App Router) + TypeScript + Tailwind, Postgres on Neon (via Drizzle ORM),
Better Auth (email + password), the Claude API for identification, and Leaflet + OpenStreetMap maps.

## Setup

1. Install dependencies: `npm install`
2. Fill in `.env.local` (see `.env.example` for what each variable is):
   - `DATABASE_URL`: Neon connection string
   - `BETTER_AUTH_SECRET`: any long random string
   - `BETTER_AUTH_URL`: `http://localhost:3000` locally
   - `ANTHROPIC_API_KEY`: from console.anthropic.com
3. Create the database tables: `npm run db:push`
4. Create the demo account: `npm run seed`
5. Start the app: `npm run dev` → http://localhost:3000

## Demo account

`demo@demo.com` / `password123!` (Pro plan, ~20 sample sightings across the northeastern US).

`npm run seed` is safe to run repeatedly. It updates the demo user and its sample sightings in place,
never duplicating them. To seed a different database (e.g. production), set `DATABASE_URL` for that one
command; it takes priority over `.env.local`:

```bash
DATABASE_URL="your-production-connection-string" npm run db:push
DATABASE_URL="your-production-connection-string" npm run seed
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run locally with hot reload |
| `npm run build` | Production build (what Vercel runs) |
| `npm run db:push` | Create/update database tables from `src/db/schema.ts` |
| `npm run seed` | Create/refresh the demo account |
| `npm run lint` / `npm run typecheck` | Code checks |

## Where things live

- `src/app/page.tsx`: public homepage
- `src/app/(auth)/`: sign up / log in
- `src/app/(app)/`: logged-in pages (identify, journal, life list, map)
- `src/lib/identify.ts`: Claude API call that identifies the animal
- `src/lib/usage.ts`: free-plan monthly limit (5 IDs)
- `src/app/actions/sightings.ts`: save / edit / delete sightings
- `src/db/schema.ts`: database tables
- `scripts/seed.ts`: demo data
