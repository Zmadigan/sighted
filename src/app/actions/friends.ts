"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { friendRequest, friendship, notification, user } from "@/db/schema";
import { addFriendship, areFriends, findUserByInviteCode, searchPeople, type PersonResult } from "@/lib/friends";
import { notify } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

export async function acceptInvite(code: string) {
  const me = await requireUser();
  const inviter = await findUserByInviteCode(code);
  if (!inviter || inviter.id === me.id) redirect("/friends");
  const alreadyFriends = await areFriends(me.id, inviter.id);
  await addFriendship(me.id, inviter.id);
  if (!alreadyFriends) await notify(inviter.id, me.id, "friend_accepted");
  revalidatePath("/friends");
  redirect(`/friends?added=${encodeURIComponent(inviter.name)}`);
}

export async function removeFriend(friendId: string) {
  const me = await requireUser();
  await db
    .delete(friendship)
    .where(
      or(
        and(eq(friendship.userId, me.id), eq(friendship.friendId, friendId)),
        and(eq(friendship.userId, friendId), eq(friendship.friendId, me.id)),
      ),
    );
  revalidatePath("/friends");
  redirect("/friends");
}

export async function updateDisplayName(name: string): Promise<{ error?: string; ok?: boolean }> {
  const me = await requireUser();
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length < 1 || clean.length > 40) return { error: "Please use 1–40 characters." };
  await db.update(user).set({ name: clean, updatedAt: new Date() }).where(eq(user.id, me.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function findPeople(query: string): Promise<PersonResult[]> {
  const me = await requireUser();
  return searchPeople(me.id, query);
}

/** Sends a friend request (or, if they already asked you, makes you friends right away). */
export async function sendFriendRequest(toId: string): Promise<PersonResult["status"] | null> {
  const me = await requireUser();
  if (toId === me.id) return null;
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, toId));
  if (!target) return null;
  if (await areFriends(me.id, toId)) return "friend";

  const [theyAsked] = await db
    .select({ fromId: friendRequest.fromId })
    .from(friendRequest)
    .where(and(eq(friendRequest.fromId, toId), eq(friendRequest.toId, me.id)));
  if (theyAsked) {
    await addFriendship(me.id, toId);
    await notify(toId, me.id, "friend_accepted");
    revalidatePath("/", "layout");
    return "friend";
  }
  const inserted = await db.insert(friendRequest).values({ fromId: me.id, toId }).onConflictDoNothing().returning();
  if (inserted.length) await notify(toId, me.id, "friend_request");
  revalidatePath("/friends");
  return "requested";
}

export async function cancelFriendRequest(toId: string) {
  const me = await requireUser();
  await db.delete(friendRequest).where(and(eq(friendRequest.fromId, me.id), eq(friendRequest.toId, toId)));
  await db
    .delete(notification)
    .where(and(eq(notification.type, "friend_request"), eq(notification.actorId, me.id), eq(notification.userId, toId)));
  revalidatePath("/friends");
}

export async function respondToRequest(fromId: string, accept: boolean) {
  const me = await requireUser();
  const [request] = await db
    .select({ fromId: friendRequest.fromId })
    .from(friendRequest)
    .where(and(eq(friendRequest.fromId, fromId), eq(friendRequest.toId, me.id)));
  if (!request) return;
  if (accept) {
    await addFriendship(me.id, fromId);
    await notify(fromId, me.id, "friend_accepted");
  }
  else await db.delete(friendRequest).where(and(eq(friendRequest.fromId, fromId), eq(friendRequest.toId, me.id)));
  revalidatePath("/", "layout");
}
