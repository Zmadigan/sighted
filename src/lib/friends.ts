import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { friendship, sighting, user } from "@/db/schema";

/** The user's invite code, created the first time they open the Friends tab. */
export async function getInviteCode(userId: string) {
  const [row] = await db.select({ inviteCode: user.inviteCode }).from(user).where(eq(user.id, userId));
  if (row?.inviteCode) return row.inviteCode;
  const code = randomBytes(9).toString("base64url"); // 12 URL-safe characters
  await db.update(user).set({ inviteCode: code }).where(eq(user.id, userId));
  return code;
}

export async function findUserByInviteCode(code: string) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(code)) return null;
  const [row] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.inviteCode, code));
  return row ?? null;
}

export async function areFriends(userId: string, otherId: string) {
  const [row] = await db
    .select({ userId: friendship.userId })
    .from(friendship)
    .where(and(eq(friendship.userId, userId), eq(friendship.friendId, otherId)));
  return Boolean(row);
}

export async function addFriendship(a: string, b: string) {
  await db
    .insert(friendship)
    .values([
      { userId: a, friendId: b },
      { userId: b, friendId: a },
    ])
    .onConflictDoNothing();
}

export async function listFriends(userId: string) {
  return db
    .select({ id: user.id, name: user.name, since: friendship.createdAt })
    .from(friendship)
    .innerJoin(user, eq(user.id, friendship.friendId))
    .where(eq(friendship.userId, userId))
    .orderBy(user.name);
}

export type Period = "month" | "year" | "all";

/** Earliest observation date that counts for the period, as YYYY-MM-DD (null = all time). */
function periodStart(period: Period) {
  const today = new Date().toISOString().slice(0, 10);
  if (period === "month") return today.slice(0, 8) + "01";
  if (period === "year") return today.slice(0, 5) + "01-01";
  return null;
}

/** Unique species and total sightings for each of these users within the period. */
export async function leaderboard(userIds: string[], period: Period) {
  const start = periodStart(period);
  const speciesKey = sql`lower(trim(coalesce(nullif(${sighting.scientificName}, ''), ${sighting.commonName})))`;
  const counts = await db
    .select({
      userId: sighting.userId,
      species: sql<number>`count(distinct ${speciesKey})::int`,
      sightings: sql<number>`count(*)::int`,
    })
    .from(sighting)
    .where(
      and(
        inArray(sighting.userId, userIds),
        start ? sql`${sighting.observedOn} >= ${start}` : undefined,
      ),
    )
    .groupBy(sighting.userId);
  return new Map(counts.map((c) => [c.userId, c]));
}

/** A friend's sightings for their profile. Locations are never selected; private sightings are left out. */
export async function listFriendSightings(friendId: string) {
  return db
    .select({
      id: sighting.id,
      commonName: sighting.commonName,
      scientificName: sighting.scientificName,
      category: sighting.category,
      observedOn: sighting.observedOn,
      notes: sighting.notes,
      updatedAt: sighting.updatedAt,
      hasPhoto: sql<boolean>`${sighting.photo} is not null`,
    })
    .from(sighting)
    .where(and(eq(sighting.userId, friendId), eq(sighting.isPrivate, false)))
    .orderBy(desc(sighting.observedOn), desc(sighting.createdAt));
}
