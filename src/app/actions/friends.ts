"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { friendship, user } from "@/db/schema";
import { addFriendship, findUserByInviteCode } from "@/lib/friends";
import { requireUser } from "@/lib/session";

export async function acceptInvite(code: string) {
  const me = await requireUser();
  const inviter = await findUserByInviteCode(code);
  if (!inviter || inviter.id === me.id) redirect("/friends");
  await addFriendship(me.id, inviter.id);
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
  revalidatePath("/friends");
  return { ok: true };
}
