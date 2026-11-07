"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comment, sighting } from "@/db/schema";
import { commentsFor, MAX_COMMENT_LENGTH, visibleSighting, type CommentView } from "@/lib/comments";
import { notify } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

export async function loadComments(sightingId: string): Promise<CommentView[]> {
  const me = await requireUser();
  const post = await visibleSighting(me.id, sightingId);
  if (!post) return [];
  return (await commentsFor(me.id, [post])).get(post.id) ?? [];
}

export async function addComment(
  sightingId: string,
  text: string,
): Promise<{ comment: CommentView } | { error: string }> {
  const me = await requireUser();
  const clean = text.replace(/\s+\n/g, "\n").trim();
  if (!clean) return { error: "Write something first." };
  if (clean.length > MAX_COMMENT_LENGTH) return { error: `Comments can be up to ${MAX_COMMENT_LENGTH} characters.` };
  const post = await visibleSighting(me.id, sightingId);
  if (!post) return { error: "That sighting isn't available." };

  const [created] = await db.insert(comment).values({ sightingId, userId: me.id, text: clean }).returning();

  // Tell the owner, and everyone else who has commented on it.
  const others = await db
    .selectDistinct({ userId: comment.userId })
    .from(comment)
    .where(and(eq(comment.sightingId, sightingId), ne(comment.userId, me.id)));
  await notify([post.ownerId, ...others.map((o) => o.userId)], me.id, "comment", {
    sightingId,
    commentId: created.id,
  });
  revalidatePath("/", "layout");

  return {
    comment: {
      id: created.id,
      userId: me.id,
      userName: me.name,
      text: created.text,
      createdAt: created.createdAt.toISOString(),
      canDelete: true,
    },
  };
}

/** Deletes your own comment, or any comment on your own sighting. */
export async function deleteComment(commentId: string) {
  const me = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(commentId)) return;
  const [row] = await db
    .select({ authorId: comment.userId, ownerId: sighting.userId })
    .from(comment)
    .innerJoin(sighting, eq(sighting.id, comment.sightingId))
    .where(eq(comment.id, commentId));
  if (!row || (row.authorId !== me.id && row.ownerId !== me.id)) return;
  await db.delete(comment).where(eq(comment.id, commentId)); // its notifications go with it
  revalidatePath("/", "layout");
}

