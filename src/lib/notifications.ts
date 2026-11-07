import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { comment, notification, sighting, user } from "@/db/schema";
import { hiddenUserIds } from "./moderation";

export type NotificationType = "reaction" | "comment" | "friend_request" | "friend_accepted";

/** Adds a notification for someone (never for things you did yourself). Never throws. */
export async function notify(
  recipients: string | string[],
  actorId: string,
  type: NotificationType,
  extra: { sightingId?: string; commentId?: string } = {},
) {
  let ids = [...new Set([recipients].flat())].filter((id) => id !== actorId);
  if (ids.length === 0) return;
  try {
    const hidden = new Set(await hiddenUserIds(actorId));
    ids = ids.filter((id) => !hidden.has(id));
    if (ids.length === 0) return;
    await db.insert(notification).values(ids.map((userId) => ({ userId, actorId, type, ...extra })));
  } catch (error) {
    console.error("Couldn't save notification", error);
  }
}

export async function unreadNotificationCount(userId: string) {
  return db.$count(notification, and(eq(notification.userId, userId), isNull(notification.readAt)));
}

const actor = alias(user, "actor");
const owner = alias(user, "owner");

export async function listNotifications(userId: string) {
  return db
    .select({
      id: notification.id,
      type: notification.type,
      createdAt: notification.createdAt,
      unread: sql<boolean>`${notification.readAt} is null`,
      actorId: notification.actorId,
      actorName: actor.name,
      sightingId: notification.sightingId,
      animal: sighting.commonName,
      sightingOwnerId: sighting.userId,
      sightingOwnerName: owner.name,
      commentText: comment.text,
    })
    .from(notification)
    .innerJoin(actor, eq(actor.id, notification.actorId))
    .leftJoin(sighting, eq(sighting.id, notification.sightingId))
    .leftJoin(owner, eq(owner.id, sighting.userId))
    .leftJoin(comment, eq(comment.id, notification.commentId))
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(60);
}

export async function markAllRead(userId: string) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
}
