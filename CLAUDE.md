@AGENTS.md

# Sighted — project notes for Claude

**Sighted: your wildlife journal.** Snap a photo of an animal, get an AI identification, and keep a
journal, life list and map of everything you've seen. Friends can follow each other's sightings,
react, comment and compete on a leaderboard. Live at **https://sightedwildlife.com** (Vercel).

## About the owner

- Zack is a **beginner**. Explain things simply, avoid jargon, keep answers short, and recommend one
  option instead of listing every possibility.
- Test new features yourself before saying they're done (localhost, phone-sized window).
- Ask before anything outward-facing: purchases, sending messages, deleting real data.

## Rules (important)

- **Secrets live only in `.env.local`** (git-ignored). Never commit it and never paste secret values
  into chat. When a new secret is needed, Zack puts it in `.env.local` directly. `.env.example` lists the variables.
- **`tester-accounts.txt` is private.** Never commit it and never repeat its passwords in chat.
- **Don't log in to the live site with real accounts while testing.** Test on localhost with throwaway
  accounts (e.g. `something@example.test`) and delete them afterwards.
- **The demo account (`demo@demo.com`) is kept empty on purpose.** Don't re-seed it or offer to.
- Commit/push only when asked. Pushing to `main` on GitHub auto-deploys to Vercel production.

## Tech stack

- **Next.js 16 (App Router)** + TypeScript + Tailwind v4. This Next.js version differs from older ones.
  Read `node_modules/next/dist/docs/` before using unfamiliar APIs. Middleware lives in `src/proxy.ts`.
  Its `matcher` list must include every logged-in route. Run `npx next typegen` after adding routes.
- **Postgres on Neon** via **Drizzle ORM** (`src/db/schema.ts`; `npm run db:push` applies changes).
- **Better Auth**: email + password logins, sessions stored in the DB, cookie-based.
- **Claude API** (`claude-opus-5-5`) identifies animals: `src/lib/identify.ts`, `src/app/api/identify/route.ts`.
- **Stripe** (live): Pro is $4.99/month. Free plan gets 3 AI identifications per month (`src/lib/usage.ts`).
- **Vercel Blob (private store)** holds photos and profile pictures. The DB stores only the blob URL.
  Photos are served through `/api/photos/[id]` and `/api/avatars/[id]`, which check who's asking.
- **Resend** sends password-reset emails. **Leaflet + OpenStreetMap** draw the maps.

## Features and where they live

| Feature | Files |
| --- | --- |
| AI identify (uses photo GPS/date or device location to judge range and season) | `src/components/IdentifyClient.tsx`, `src/lib/identify.ts` |
| Journal (list/grid), sighting detail, edit, new | `src/app/(app)/journal/`, `src/app/actions/sightings.ts` |
| Life list, map, year in review, goals | `src/app/(app)/life-list`, `map`, `year-in-review`, `src/app/actions/goals.ts` |
| Friends feed (home screen), leaderboard, friend profiles, invites | `src/app/(app)/friends/`, `src/lib/feed.ts`, `src/lib/friends.ts` |
| Reactions, comments, notifications (bell) | `src/app/actions/feed.ts`, `comments.ts`, `src/lib/notifications.ts` |
| Badges (20), weekly streaks, ranks (Hatchling → Legend), confetti | `src/lib/achievements.ts`, `src/components/Achievements.tsx` |
| Bird of the Week (local challenge) | `src/lib/bird-of-week.ts` |
| Profile page with avatar, Get Started checklist | `src/app/(app)/profile/`, `src/components/GetStarted.tsx` |
| Full-screen photo viewer (pinch/swipe) | `src/components/PhotoViewer.tsx` |
| Offline queue + service worker (PWA) | `src/lib/offline-queue.ts`, `src/components/ServiceWorker.tsx` |
| Billing | `src/app/actions/billing.ts`, `src/app/api/stripe/webhook/route.ts` |
| Account settings / delete account | `src/app/(app)/account/`, `src/app/actions/account.ts` |
| Report & block ("⋯" menu on posts, comments, profiles), admin review at `/admin/reports` | `src/lib/moderation.ts`, `src/app/actions/moderation.ts`, `src/components/ReportMenu.tsx` |

Achievements are **calculated from sightings** (no badge tables). Phone bottom nav order: Friends,
Journal, (center camera) Identify, Life List, Map.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
```

This folder is on the iCloud-synced Desktop. If commands hang, iCloud has offloaded files in
`node_modules`: run `rm -rf node_modules .next && npm install`. (Moving the project out of Desktop fixes it for good.)

If `tsc` complains about files like `.next/types/... 2.ts`, delete the duplicates:
`find .next -name "* 2*" -delete`.

## Open to-dos

1. **Reset the Neon database password.** The old connection string was exposed in a chat. Zack resets it in
   the Neon console and puts the new string in `.env.local`. Then update Vercel production `DATABASE_URL`
   and redeploy. Mention it occasionally, don't nag.
2. **Set `ADMIN_EMAILS`** (Zack's email) in `.env.local` and in Vercel production, so Zack can open
   `/admin/reports` and gets an email for each new report.
3. Ideas not built yet: push notifications, "new posts" pill on the feed, loading skeletons, species
   pages, dark mode, share cards, weekly recap email, monthly challenges, Sentry error alerts.

## Plan: native iOS app in Swift

Zack wants to rebuild the app in **Swift / SwiftUI** (on the other laptop with Xcode). The plan:

- **Keep this website as the back end.** The database, AI identification, Stripe, Blob photo storage and
  emails stay exactly where they are. The iPhone app is a new front end that talks to the same server.
- **The server needs a JSON API first.** Today most actions are Next.js *server actions*, which only the
  website can call. Add `/api/v1/...` routes (feed, sightings, identify, friends, comments, reactions,
  notifications, profile, achievements) that reuse the existing `src/lib/*` functions.
- **Logins from the app:** use Better Auth's **bearer token plugin** (or its Expo/mobile-style flow) so the
  app sends a token instead of a browser cookie. Store the token in the iOS Keychain.
- **Photos:** the app uploads to the identify/sightings API; images load through the same
  `/api/photos/[id]` routes with the token.
- **Push notifications:** add an APNs device-token table and send pushes wherever `notify()` is called.
- **App Store rules to plan for:** report/block for user content; in-app account deletion (already
  exists on the web); paying for Pro: simplest is to not sell it inside the app (upgrade on the website;
  US apps may link out); privacy labels (email, photos, approximate location); Sign in with Apple is only
  required if Google/Facebook login is added.
- Suggested build order: API + token auth → SwiftUI login → feed → identify (camera) → journal/life
  list/map → friends/comments → badges/profile → push → TestFlight → App Store.
- Needs an Apple Developer account ($99/year).
