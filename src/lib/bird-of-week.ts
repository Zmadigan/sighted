import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { birdChallenge, sighting, weeklyBird } from "@/db/schema";

let client: Anthropic | undefined;

const BirdPickSchema = z.object({
  has_bird: z.boolean(),
  region_name: z.string(),
  common_name: z.string(),
  scientific_name: z.string(),
  tip: z.string(),
});

/** Monday of the current week (UTC) as YYYY-MM-DD; a new bird every Monday. */
export function currentWeek(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function previousWeek(week: string) {
  const d = new Date(week + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** Rounds a location to a ~100 km grid square, so nearby users share a bird and exact spots aren't stored. */
export function areaKeyFor(lat: number, lng: number) {
  return `${Math.round(lat)}_${Math.round(lng)}`;
}

function areaCenter(areaKey: string) {
  const [lat, lng] = areaKey.split("_").map(Number);
  return { lat, lng };
}

/** Asks Claude for a common, findable bird for this area and time of year, avoiding recent picks. */
async function pickBird(areaKey: string, week: string) {
  const { lat, lng } = areaCenter(areaKey);
  const recent = await db
    .select({ commonName: weeklyBird.commonName })
    .from(weeklyBird)
    .where(and(eq(weeklyBird.areaKey, areaKey), lt(weeklyBird.week, week), isNotNull(weeklyBird.commonName)))
    .orderBy(desc(weeklyBird.week))
    .limit(8);
  // A per-area/week seed nudges different areas toward different picks.
  const seed = createHash("sha256").update(`${areaKey}:${week}`).digest("hex").slice(0, 8);

  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(BirdPickSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: `You choose the "Bird of the Week" for Sighted, a wildlife journal app. Users try to find and photograph the bird during the week, so pick a wild bird species that a casual, non-expert birder has a good chance of finding in the given area during that week of the year.

Rules:
- It must be a real species (not "gull sp."), genuinely present and reasonably common in that area at that time of year (consider migration and season).
- Prefer birds that are fun and recognizable; avoid rarities, birds that need special trips or permits, and night-only birds.
- Avoid repeating any of the area's recent picks.
- region_name: a short, friendly name for the area, e.g. "New York City area" or "Southern Vermont".
- tip: one or two short, friendly sentences on where, when and how to spot it this week (habitat, time of day, what to look or listen for).
- If the area is open ocean or has no suitable birds, set has_bird to false and leave the bird fields empty.`,
    messages: [
      {
        role: "user",
        content: `Area: about 100 km around latitude ${lat}, longitude ${lng}.
Week starting: ${week}.
Recent picks for this area (don't repeat): ${recent.map((r) => r.commonName).join(", ") || "none"}.
Variety seed: ${seed}.`,
      },
    ],
  });

  const pick = response.stop_reason === "refusal" ? null : response.parsed_output;
  if (!pick) throw new Error("No Bird of the Week pick was returned");
  return pick.has_bird && pick.common_name ? pick : { ...pick, common_name: "", scientific_name: "", tip: "" };
}

async function weeklyBirdFor(areaKey: string, week: string): Promise<typeof weeklyBird.$inferSelect> {
  const [cached] = await db
    .select()
    .from(weeklyBird)
    .where(and(eq(weeklyBird.areaKey, areaKey), eq(weeklyBird.week, week)));
  if (cached) return cached;

  const bird = await pickBird(areaKey, week);
  const [row] = await db
    .insert(weeklyBird)
    .values({
      areaKey,
      week,
      regionName: bird.region_name || null,
      commonName: bird.common_name || null,
      scientificName: bird.scientific_name || null,
      tip: bird.tip || null,
    })
    .onConflictDoNothing()
    .returning();
  // If two people in the same area loaded it at once, use whichever was saved first.
  return row ?? (await weeklyBirdFor(areaKey, week));
}

/** The user's last sighting location, used when they don't share their current location. */
async function lastSightingArea(userId: string) {
  const [last] = await db
    .select({ lat: sighting.latitude, lng: sighting.longitude })
    .from(sighting)
    .where(and(eq(sighting.userId, userId), isNotNull(sighting.latitude), isNotNull(sighting.longitude)))
    .orderBy(desc(sighting.observedOn), desc(sighting.createdAt))
    .limit(1);
  return last ? areaKeyFor(last.lat!, last.lng!) : null;
}

/** Weeks in a row the user found their bird (this week counts once it's found). */
async function streak(userId: string, week: string) {
  const found = await db
    .select({ week: birdChallenge.week })
    .from(birdChallenge)
    .where(and(eq(birdChallenge.userId, userId), isNotNull(birdChallenge.foundAt)));
  const weeks = new Set(found.map((f) => f.week));
  let count = 0;
  let w = weeks.has(week) ? week : previousWeek(week);
  while (weeks.has(w)) {
    count++;
    w = previousWeek(w);
  }
  return count;
}

export type BirdOfWeek =
  | { status: "needs-location" }
  | { status: "no-bird" }
  | {
      status: "ok";
      commonName: string;
      scientificName: string;
      regionName: string | null;
      tip: string | null;
      found: boolean;
      streak: number;
    };

/**
 * This week's bird for the user. The first time each week, their area comes from the location
 * they share (or their last sighting); after that the week's assignment stays fixed.
 */
export async function getBirdOfWeek(
  userId: string,
  location?: { lat: number; lng: number },
  { useLastSighting = true } = {},
): Promise<BirdOfWeek> {
  const week = currentWeek();
  let [challenge] = await db
    .select()
    .from(birdChallenge)
    .where(and(eq(birdChallenge.userId, userId), eq(birdChallenge.week, week)));

  if (!challenge) {
    const areaKey = location
      ? areaKeyFor(location.lat, location.lng)
      : useLastSighting
        ? await lastSightingArea(userId)
        : null;
    if (!areaKey) return { status: "needs-location" };
    [challenge] = await db
      .insert(birdChallenge)
      .values({ userId, week, areaKey })
      .onConflictDoNothing()
      .returning();
    challenge ??= (
      await db
        .select()
        .from(birdChallenge)
        .where(and(eq(birdChallenge.userId, userId), eq(birdChallenge.week, week)))
    )[0];
  }

  const bird = await weeklyBirdFor(challenge.areaKey, week);
  if (!bird.commonName || !bird.scientificName) return { status: "no-bird" };
  return {
    status: "ok",
    commonName: bird.commonName,
    scientificName: bird.scientificName,
    regionName: bird.regionName,
    tip: bird.tip,
    found: Boolean(challenge.foundAt),
    streak: await streak(userId, week),
  };
}

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Same species if genus + species match, or (failing that) the common names match. */
function sameSpecies(
  a: { scientificName: string; commonName: string },
  b: { scientificName: string; commonName: string },
) {
  const [ga, sa] = normalize(a.scientificName);
  const [gb, sb] = normalize(b.scientificName);
  if (ga && sa && ga === gb && sa === sb) return true;
  return normalize(a.commonName).join(" ") === normalize(b.commonName).join(" ");
}

/**
 * Called after every successful photo ID. If it's the user's Bird of the Week, mark it found.
 * Returns true only the moment it's first found (to celebrate once).
 */
export async function checkBirdOfWeekFound(
  userId: string,
  identified: { scientificName: string; commonName: string },
) {
  const week = currentWeek();
  const [challenge] = await db
    .select()
    .from(birdChallenge)
    .where(and(eq(birdChallenge.userId, userId), eq(birdChallenge.week, week)));
  if (!challenge || challenge.foundAt) return false;

  const [bird] = await db
    .select()
    .from(weeklyBird)
    .where(and(eq(weeklyBird.areaKey, challenge.areaKey), eq(weeklyBird.week, week)));
  if (!bird?.scientificName || !bird.commonName) return false;
  if (!sameSpecies(identified, { scientificName: bird.scientificName, commonName: bird.commonName })) return false;

  await db
    .update(birdChallenge)
    .set({ foundAt: new Date() })
    .where(and(eq(birdChallenge.userId, userId), eq(birdChallenge.week, week)));
  return true;
}

/** Which of these users found their Bird of the Week this week (for the friends leaderboard). */
export async function foundThisWeek(userIds: string[]) {
  const rows = await db
    .select({ userId: birdChallenge.userId })
    .from(birdChallenge)
    .where(
      and(inArray(birdChallenge.userId, userIds), eq(birdChallenge.week, currentWeek()), isNotNull(birdChallenge.foundAt)),
    );
  return new Set(rows.map((r) => r.userId));
}
