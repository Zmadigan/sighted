import "server-only";
import { and, inArray, isNotNull, sql } from "drizzle-orm";
import {
  Award,
  Binoculars,
  Bird,
  Bug,
  Camera,
  Compass,
  Crown,
  Egg,
  Eye,
  Feather,
  Fish,
  Flame,
  Footprints,
  Gem,
  Leaf,
  ListChecks,
  MapPinned,
  Medal,
  Mountain,
  PawPrint,
  Shapes,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import { birdChallenge, friendship, sighting } from "@/db/schema";

/**
 * Ranks, weekly streaks and badges. Everything is worked out from the sightings people already
 * have, so editing or deleting a sighting updates them automatically. Nothing extra is stored.
 */

export type Stats = {
  species: number;
  sightings: number;
  /** Unique species per category, e.g. { bird: 12, mammal: 3 } */
  speciesBy: Record<string, number>;
  /** Weeks in a row (Monday–Sunday) with at least one sighting, ending this week or last week. */
  streak: number;
  /** True when this week already has a sighting (so the streak is safe until next Monday). */
  streakSafe: boolean;
  bestStreak: number;
  /** Different places (about 10 km apart). */
  places: number;
  photoIds: number;
  birdsOfWeek: number;
  friends: number;
};

// ---------- Ranks (by unique species seen) ----------

export type Rank = { name: string; min: number; Icon: LucideIcon };

export const RANKS: Rank[] = [
  { name: "Hatchling", min: 0, Icon: Egg },
  { name: "Fledgling", min: 1, Icon: Feather },
  { name: "Explorer", min: 5, Icon: Compass },
  { name: "Tracker", min: 15, Icon: Footprints },
  { name: "Naturalist", min: 30, Icon: Leaf },
  { name: "Ranger", min: 60, Icon: Mountain },
  { name: "Expert", min: 100, Icon: Award },
  { name: "Legend", min: 200, Icon: Crown },
];

export function rankFor(species: number) {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (species >= r.min) index = i;
  });
  return { ...RANKS[index], level: index + 1, next: RANKS[index + 1] ?? null };
}

// ---------- Badges ----------

export type Badge = {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  /** Which stat counts toward it, and how much is needed. */
  value: (s: Stats) => number;
  target: number;
};

const ANIMAL_GROUPS = ["bird", "mammal", "fish", "insect"];

export const BADGES: Badge[] = [
  { id: "first-sighting", name: "First Sighting", description: "Log your first sighting", Icon: Eye, value: (s) => s.sightings, target: 1 },
  { id: "species-10", name: "Ten Species", description: "See 10 different species", Icon: ListChecks, value: (s) => s.species, target: 10 },
  { id: "species-25", name: "25 Club", description: "See 25 different species", Icon: Medal, value: (s) => s.species, target: 25 },
  { id: "species-50", name: "Half Century", description: "See 50 different species", Icon: Trophy, value: (s) => s.species, target: 50 },
  { id: "species-100", name: "Century", description: "See 100 different species", Icon: Gem, value: (s) => s.species, target: 100 },
  { id: "sightings-50", name: "Dedicated Spotter", description: "Log 50 sightings", Icon: Binoculars, value: (s) => s.sightings, target: 50 },
  { id: "bird-1", name: "First Feathers", description: "Spot your first bird", Icon: Bird, value: (s) => s.speciesBy.bird ?? 0, target: 1 },
  { id: "bird-10", name: "Bird Brain", description: "See 10 bird species", Icon: Feather, value: (s) => s.speciesBy.bird ?? 0, target: 10 },
  { id: "mammal-1", name: "Furry Friend", description: "Spot your first mammal", Icon: PawPrint, value: (s) => s.speciesBy.mammal ?? 0, target: 1 },
  { id: "fish-1", name: "Gone Fishing", description: "Spot your first fish", Icon: Fish, value: (s) => s.speciesBy.fish ?? 0, target: 1 },
  { id: "insect-1", name: "Bug Hunter", description: "Spot your first insect", Icon: Bug, value: (s) => s.speciesBy.insect ?? 0, target: 1 },
  {
    id: "all-groups",
    name: "Well Rounded",
    description: "Spot a bird, a mammal, a fish and an insect",
    Icon: Shapes,
    value: (s) => ANIMAL_GROUPS.filter((g) => (s.speciesBy[g] ?? 0) > 0).length,
    target: 4,
  },
  { id: "streak-3", name: "On a Roll", description: "Keep a 3-week streak", Icon: Flame, value: (s) => s.bestStreak, target: 3 },
  { id: "streak-8", name: "Unstoppable", description: "Keep an 8-week streak", Icon: Flame, value: (s) => s.bestStreak, target: 8 },
  { id: "streak-26", name: "Half-Year Hero", description: "Keep a 26-week streak", Icon: Sparkles, value: (s) => s.bestStreak, target: 26 },
  { id: "places-5", name: "Wanderer", description: "Log sightings in 5 different places", Icon: MapPinned, value: (s) => s.places, target: 5 },
  { id: "photo-10", name: "Photo Pro", description: "Identify 10 animals from photos", Icon: Camera, value: (s) => s.photoIds, target: 10 },
  { id: "bow-1", name: "Bird of the Week", description: "Find a Bird of the Week", Icon: Binoculars, value: (s) => s.birdsOfWeek, target: 1 },
  { id: "bow-5", name: "Ace Spotter", description: "Find 5 Birds of the Week", Icon: Trophy, value: (s) => s.birdsOfWeek, target: 5 },
  { id: "friends-3", name: "Flock Together", description: "Make 3 friends on Sighted", Icon: Users, value: (s) => s.friends, target: 3 },
];

export function badgeProgress(stats: Stats) {
  return BADGES.map((b) => {
    const current = Math.min(b.value(stats), b.target);
    return { ...b, current, earned: current >= b.target };
  });
}

export function earnedBadgeIds(stats: Stats) {
  return BADGES.filter((b) => b.value(stats) >= b.target).map((b) => b.id);
}

// ---------- Streaks ----------

/** Week number counting from 1970, with weeks starting on Monday. */
function weekIndex(isoDate: string) {
  const days = Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
  return Math.floor((days + 3) / 7); // 1 Jan 1970 was a Thursday
}

function streaks(dates: string[], today: string) {
  const weeks = new Set(dates.map(weekIndex));
  const thisWeek = weekIndex(today);

  // Current streak: still alive if you logged something this week or last week.
  let start = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
  let streak = 0;
  while (weeks.has(start)) {
    streak++;
    start--;
  }

  let best = 0;
  for (const w of weeks) {
    if (weeks.has(w - 1)) continue; // only count from the start of each run
    let length = 1;
    while (weeks.has(w + length)) length++;
    best = Math.max(best, length);
  }
  return { streak, streakSafe: weeks.has(thisWeek), bestStreak: Math.max(best, streak) };
}

// ---------- Loading ----------

/** Stats for several people at once (e.g. everyone on the leaderboard). */
export async function statsFor(userIds: string[], today = new Date().toISOString().slice(0, 10)) {
  const result = new Map<string, Stats>();
  if (userIds.length === 0) return result;

  const [rows, bow, friendCounts] = await Promise.all([
    db
      .select({
        userId: sighting.userId,
        commonName: sighting.commonName,
        scientificName: sighting.scientificName,
        category: sighting.category,
        observedOn: sighting.observedOn,
        latitude: sighting.latitude,
        longitude: sighting.longitude,
        confidence: sighting.confidence,
      })
      .from(sighting)
      .where(inArray(sighting.userId, userIds)),
    db
      .select({ userId: birdChallenge.userId, count: sql<number>`count(*)::int` })
      .from(birdChallenge)
      .where(and(inArray(birdChallenge.userId, userIds), isNotNull(birdChallenge.foundAt)))
      .groupBy(birdChallenge.userId),
    db
      .select({ userId: friendship.userId, count: sql<number>`count(*)::int` })
      .from(friendship)
      .where(inArray(friendship.userId, userIds))
      .groupBy(friendship.userId),
  ]);
  const bowBy = new Map(bow.map((r) => [r.userId, r.count]));
  const friendsBy = new Map(friendCounts.map((r) => [r.userId, r.count]));

  for (const id of userIds) {
    const mine = rows.filter((r) => r.userId === id);
    const speciesCategory = new Map<string, string>();
    const places = new Set<string>();
    for (const r of mine) {
      speciesCategory.set((r.scientificName || r.commonName).trim().toLowerCase(), r.category);
      if (r.latitude != null && r.longitude != null) {
        places.add(`${Math.round(r.latitude * 10)}_${Math.round(r.longitude * 10)}`);
      }
    }
    const speciesBy: Record<string, number> = {};
    for (const category of speciesCategory.values()) speciesBy[category] = (speciesBy[category] ?? 0) + 1;

    result.set(id, {
      species: speciesCategory.size,
      sightings: mine.length,
      speciesBy,
      ...streaks(
        mine.map((r) => r.observedOn),
        today,
      ),
      places: places.size,
      photoIds: mine.filter((r) => r.confidence != null).length,
      birdsOfWeek: bowBy.get(id) ?? 0,
      friends: friendsBy.get(id) ?? 0,
    });
  }
  return result;
}

export async function statsForUser(userId: string) {
  return (await statsFor([userId])).get(userId)!;
}

/** Badges and rank right now (compared before and after saving to celebrate new ones). */
export async function achievementSnapshot(userId: string) {
  const stats = await statsForUser(userId);
  return { badges: earnedBadgeIds(stats), rank: rankFor(stats.species) };
}

export function badgesById(ids: string[]) {
  return BADGES.filter((b) => ids.includes(b.id));
}

