import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { comment, friendship, report, sighting, user } from "@/db/schema";
import { notBlockedWith } from "./moderation";

export const MAX_COMMENT_LENGTH = 500;

export type CommentView = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  canDelete: boolean;
};

/**
 * The sighting, if you're allowed to see and comment on it: your own, or a friend's that isn't private.
 */
export async function visibleSighting(meId: string, sightingId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sightingId)) return null;
  const [row] = await db
    .select({ id: sighting.id, ownerId: sighting.userId, isPrivate: sighting.isPrivate, commonName: sighting.commonName })
    .from(sighting)
    .where(eq(sighting.id, sightingId));
  if (!row) return null;
  if (row.ownerId === meId) return row;
  if (row.isPrivate) return null;
  const [friend] = await db
    .select({ id: friendship.friendId })
    .from(friendship)
    .where(and(eq(friendship.userId, meId), eq(friendship.friendId, row.ownerId)));
  return friend ? row : null;
}

/** All comments on these sightings, oldest first, grouped by sighting. */
export async function commentsFor(meId: string, sightings: { id: string; ownerId: string }[]) {
  const result = new Map<string, CommentView[]>();
  if (sightings.length === 0) return result;
  const owners = new Map(sightings.map((s) => [s.id, s.ownerId]));
  const rows = await db
    .select({
      id: comment.id,
      sightingId: comment.sightingId,
      userId: comment.userId,
      userName: user.name,
      text: comment.text,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(user, eq(user.id, comment.userId))
    .where(
      and(
        inArray(comment.sightingId, [...owners.keys()]),
        notBlockedWith(meId, comment.userId),
        sql`not exists (select 1 from ${report} where ${report.reporterId} = ${meId} and ${report.commentId} = ${comment.id})`,
      ),
    )
    .orderBy(asc(comment.createdAt));
  for (const r of rows) {
    const list = result.get(r.sightingId) ?? [];
    list.push({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
      // You can delete your own comments, and any comment on your own sighting.
      canDelete: r.userId === meId || owners.get(r.sightingId) === meId,
    });
    result.set(r.sightingId, list);
  }
  return result;
}
