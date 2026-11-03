"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { friendship, reaction, sighting } from "@/db/schema";
import { getFeed, type FeedCursor } from "@/lib/feed";
import { requireUser } from "@/lib/session";

export async function loadMoreFeed(cursor: FeedCursor) {
  const me = await requireUser();
  return getFeed(me.id, cursor);
}

/** Toggles your "Nice spot!" on a post from you or a friend. Returns the new state. */
export async function toggleReaction(sightingId: string): Promise<{ reacted: boolean; count: number } | null> {
  const me = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sightingId)) return null;

  const [post] = await db
    .select({ ownerId: sighting.userId, isPrivate: sighting.isPrivate })
    .from(sighting)
    .where(eq(sighting.id, sightingId));
  if (!post || post.isPrivate) return null;
  if (post.ownerId !== me.id) {
    const [friend] = await db
      .select({ id: friendship.friendId })
      .from(friendship)
      .where(and(eq(friendship.userId, me.id), inArray(friendship.friendId, [post.ownerId])));
    if (!friend) return null;
  }

  const removed = await db
    .delete(reaction)
    .where(and(eq(reaction.sightingId, sightingId), eq(reaction.userId, me.id)))
    .returning();
  if (removed.length === 0) {
    await db.insert(reaction).values({ sightingId, userId: me.id }).onConflictDoNothing();
  }
  const count = await db.$count(reaction, eq(reaction.sightingId, sightingId));
  return { reacted: removed.length === 0, count };
}
