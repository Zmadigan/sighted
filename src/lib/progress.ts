import "server-only";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdChallenge, goal, sighting } from "@/db/schema";
import { categoryInfo, CATEGORIES } from "./categories";

export const MAX_GOALS = 6;

const speciesKey = (s: { scientificName: string | null; commonName: string }) =>
  (s.scientificName || s.commonName).trim().toLowerCase();

function periodStart(period: string, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return period === "month" ? today.slice(0, 8) + "01" : today.slice(0, 5) + "01-01";
}

/** Each goal with how many species the user has seen toward it so far. */
export async function goalsWithProgress(userId: string) {
  const goals = await db.select().from(goal).where(eq(goal.userId, userId)).orderBy(asc(goal.createdAt));
  if (goals.length === 0) return [];

  const yearStart = periodStart("year");
  const rows = await db
    .select({
      commonName: sighting.commonName,
      scientificName: sighting.scientificName,
      category: sighting.category,
      observedOn: sighting.observedOn,
    })
    .from(sighting)
    .where(and(eq(sighting.userId, userId), gte(sighting.observedOn, yearStart)));

  return goals.map((g) => {
    const start = periodStart(g.period);
    const species = new Set(
      rows
        .filter((r) => r.observedOn >= start && (!g.category || r.category === g.category))
        .map(speciesKey),
    );
    const what = g.category ? `${categoryInfo(g.category).label.toLowerCase()} species` : "species";
    return {
      id: g.id,
      label: `See ${g.target} ${what} this ${g.period}`,
      period: g.period,
      category: g.category,
      target: g.target,
      current: species.size,
      done: species.size >= g.target,
    };
  });
}

/** Everything for the Year in Review page. */
export async function yearInReview(userId: string, year: number) {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const rows = await db
    .select({
      commonName: sighting.commonName,
      scientificName: sighting.scientificName,
      category: sighting.category,
      observedOn: sighting.observedOn,
      hasPhoto: sql<boolean>`${sighting.photo} is not null`,
    })
    .from(sighting)
    .where(and(eq(sighting.userId, userId), gte(sighting.observedOn, start), lt(sighting.observedOn, end)))
    .orderBy(asc(sighting.observedOn));

  // Species seen for the very first time ever (lifers) during this year.
  const before = await db
    .select({ commonName: sighting.commonName, scientificName: sighting.scientificName })
    .from(sighting)
    .where(and(eq(sighting.userId, userId), lt(sighting.observedOn, start)));
  const seenBefore = new Set(before.map(speciesKey));

  const bySpecies = new Map<string, { name: string; count: number; category: string }>();
  for (const r of rows) {
    const key = speciesKey(r);
    const s = bySpecies.get(key) ?? { name: r.commonName, count: 0, category: r.category };
    s.count++;
    bySpecies.set(key, s);
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(Date.UTC(year, i, 15)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    sightings: rows.filter((r) => Number(r.observedOn.slice(5, 7)) === i + 1).length,
  }));
  const busiest = months.reduce((a, b) => (b.sightings > a.sightings ? b : a), months[0]);

  const perCategory = CATEGORIES.map((c) => ({
    category: c,
    species: [...bySpecies.values()].filter((s) => s.category === c).length,
  })).filter((c) => c.species > 0);
  const topCategory = perCategory.reduce<(typeof perCategory)[number] | null>(
    (a, b) => (!a || b.species > a.species ? b : a),
    null,
  );

  const mostSeen = [...bySpecies.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] ?? null;

  const [{ birdsOfWeek }] = await db
    .select({ birdsOfWeek: sql<number>`count(*)::int` })
    .from(birdChallenge)
    .where(
      and(
        eq(birdChallenge.userId, userId),
        sql`${birdChallenge.foundAt} is not null`,
        gte(birdChallenge.week, start),
        lt(birdChallenge.week, end),
      ),
    );

  return {
    year,
    sightings: rows.length,
    species: bySpecies.size,
    lifers: [...bySpecies.keys()].filter((k) => !seenBefore.has(k)).length,
    photos: rows.filter((r) => r.hasPhoto).length,
    first: rows[0] ? { name: rows[0].commonName, date: rows[0].observedOn } : null,
    mostSeen,
    busiest: busiest.sightings > 0 ? busiest : null,
    months,
    perCategory,
    topCategory,
    birdsOfWeek,
  };
}
