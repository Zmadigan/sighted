import "server-only";
import { and, desc, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdChallenge, friendship, reaction, report, sighting, user, weeklyBird } from "@/db/schema";
import { commentsFor, type CommentView } from "./comments";

export const FEED_PAGE_SIZE = 10;

export type FeedPost = {
  id: string;
  ownerId: string;
  ownerName: string;
  isMine: boolean;
  commonName: string;
  scientificName: string | null;
  category: string;
  observedOn: string;
  notes: string | null;
  postedAt: string; // ISO time it was logged
  /** null for sightings without a photo (only on a single post's page; the feed shows photo posts only) */
  photoUrl: string | null;
  reactions: number;
  reactedByMe: boolean;
  birdOfWeek: boolean;
  comments: CommentView[];
};

/** Cursor = the last post's "postedAt|id", so the next page continues right after it. */
export type FeedCursor = string | null;

const words = (name: string | null) =>
  (name ?? "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function sameSpecies(a: { s: string | null; c: string | null }, b: { s: string | null; c: string | null }) {
  const [ga, sa] = words(a.s);
  const [gb, sb] = words(b.s);
  if (ga && sa && ga === gb && sa === sb) return true;
  return Boolean(a.c && b.c) && words(a.c).join(" ") === words(b.c).join(" ");
}

/** Monday (UTC) of the week a date falls in, matching Bird of the Week's weeks. */
function weekOf(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Photo sightings from you and your friends, newest first. Private sightings and
 * locations never appear here.
 */
export async function getFeed(meId: string, cursor: FeedCursor): Promise<{ posts: FeedPost[]; next: FeedCursor }> {
  const friendRows = await db
    .select({ id: friendship.friendId })
    .from(friendship)
    .where(eq(friendship.userId, meId));
  const people = [meId, ...friendRows.map((f) => f.id)];

  let after = undefined;
  if (cursor) {
    const [time, id] = cursor.split("|");
    const t = new Date(time);
    if (!Number.isNaN(t.getTime()) && id) {
      after = or(lt(sighting.createdAt, t), and(eq(sighting.createdAt, t), lt(sighting.id, id)));
    }
  }

  const rows = await db
    .select(postColumns(meId))
    .from(sighting)
    .innerJoin(user, eq(user.id, sighting.userId))
    .where(
      and(
        inArray(sighting.userId, people),
        eq(sighting.isPrivate, false),
        isNotNull(sighting.photo),
        notReportedBy(meId),
        after,
      ),
    )
    .orderBy(desc(sighting.createdAt), desc(sighting.id))
    .limit(FEED_PAGE_SIZE + 1);

  const page = rows.slice(0, FEED_PAGE_SIZE);
  const posts = await toPosts(meId, page);
  const last = page[page.length - 1];
  return {
    posts,
    next: rows.length > FEED_PAGE_SIZE && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

/** One post (yours, or a friend's that isn't private), e.g. when opened from a notification. */
export async function getPost(meId: string, sightingId: string): Promise<FeedPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sightingId)) return null;
  const [row] = await db
    .select({ ...postColumns(meId), isPrivate: sighting.isPrivate })
    .from(sighting)
    .innerJoin(user, eq(user.id, sighting.userId))
    .where(and(eq(sighting.id, sightingId), notReportedBy(meId)));
  if (!row) return null;
  if (row.ownerId !== meId) {
    if (row.isPrivate) return null;
    const [friend] = await db
      .select({ id: friendship.friendId })
      .from(friendship)
      .where(and(eq(friendship.userId, meId), eq(friendship.friendId, row.ownerId)));
    if (!friend) return null;
  }
  return (await toPosts(meId, [row]))[0];
}

/** Posts you've reported disappear for you right away. */
function notReportedBy(meId: string) {
  return sql`not exists (select 1 from ${report} where ${report.reporterId} = ${meId} and ${report.kind} = 'post' and ${report.sightingId} = ${sighting.id})`;
}

function postColumns(meId: string) {
  return {
      id: sighting.id,
      ownerId: sighting.userId,
      ownerName: user.name,
      commonName: sighting.commonName,
      scientificName: sighting.scientificName,
      category: sighting.category,
      observedOn: sighting.observedOn,
      notes: sighting.notes,
      createdAt: sighting.createdAt,
      updatedAt: sighting.updatedAt,
      reactions: sql<number>`(select count(*)::int from ${reaction} where ${reaction.sightingId} = ${sighting.id})`,
      reactedByMe: sql<boolean>`exists (select 1 from ${reaction} where ${reaction.sightingId} = ${sighting.id} and ${reaction.userId} = ${meId})`,
      hasPhoto: sql<boolean>`${sighting.photo} is not null`,
  };
}

type PostRow = {
  id: string;
  ownerId: string;
  ownerName: string;
  commonName: string;
  scientificName: string | null;
  category: string;
  observedOn: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  reactions: number;
  reactedByMe: boolean;
  hasPhoto: boolean;
};

async function toPosts(meId: string, page: PostRow[]): Promise<FeedPost[]> {

  // Tag posts that completed their owner's Bird of the Week that week.
  const found = page.length
    ? await db
        .select({
          userId: birdChallenge.userId,
          week: birdChallenge.week,
          commonName: weeklyBird.commonName,
          scientificName: weeklyBird.scientificName,
        })
        .from(birdChallenge)
        .innerJoin(
          weeklyBird,
          and(eq(weeklyBird.areaKey, birdChallenge.areaKey), eq(weeklyBird.week, birdChallenge.week)),
        )
        .where(and(inArray(birdChallenge.userId, [...new Set(page.map((p) => p.ownerId))]), isNotNull(birdChallenge.foundAt)))
    : [];

  const comments = await commentsFor(meId, page);

  return page.map((r) => ({
    id: r.id,
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    isMine: r.ownerId === meId,
    commonName: r.commonName,
    scientificName: r.scientificName,
    category: r.category,
    observedOn: r.observedOn,
    notes: r.notes ? r.notes.replace(/\n*Location:[^]*$/, "").trim() || null : null,
    postedAt: r.createdAt.toISOString(),
    photoUrl: r.hasPhoto ? `/api/photos/${r.id}?v=${r.updatedAt.getTime()}` : null,
    reactions: r.reactions,
    reactedByMe: r.reactedByMe,
    birdOfWeek: found.some(
      (f) =>
        f.userId === r.ownerId &&
        f.week === weekOf(r.createdAt) &&
        sameSpecies({ s: r.scientificName, c: r.commonName }, { s: f.scientificName, c: f.commonName }),
    ),
    comments: comments.get(r.id) ?? [],
  }));
}
