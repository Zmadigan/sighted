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
   - `STRIPE_SECRET_KEY`: Stripe Dashboard → Developers → API keys (use the `sk_test_` key while testing)
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

## Payments (Stripe)

Pro is a $4.99/month Stripe subscription. The price is defined in `src/lib/stripe.ts`, so nothing needs
to be created in the Stripe dashboard. Test with card `4242 4242 4242 4242`, any future date and any CVC.

To connect a deployed site to Stripe (registers the webhook and saves the Stripe secrets in Vercel):

```bash
node scripts/setup-stripe.mjs https://your-site.vercel.app
```

To take real payments, add `STRIPE_LIVE_SECRET_KEY` to `.env.local` and run the live version. It switches only the
production site; local and preview deployments stay in test mode. `--reset-test-billing` clears test-mode
subscriptions from accounts (complimentary Pro accounts like the demo are never touched):

```bash
node scripts/setup-stripe.mjs https://your-site.vercel.app --live --reset-test-billing
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
- `src/lib/stripe.ts`, `src/app/actions/billing.ts`, `src/app/api/stripe/webhook/route.ts`: Pro subscription
- `src/app/actions/sightings.ts`: save / edit / delete sightings
- `src/app/(app)/friends/`, `src/app/invite/`, `src/lib/friends.ts`: friends, invite links and the leaderboard
  (friends see each other's sightings, photos and notes, but never locations)
- `src/lib/feed.ts`, `src/components/Feed.tsx`: friends feed (photo sightings, "Nice spot!" reactions,
  infinite scroll; private sightings and locations never appear)
- `src/lib/bird-of-week.ts`, `src/components/BirdOfWeekCard.tsx`: Bird of the Week (Claude picks a findable bird per
  ~100 km area each Monday; it counts as found when a photo ID matches it)
- `src/db/schema.ts`: database tables
- `scripts/seed.ts`: demo data
