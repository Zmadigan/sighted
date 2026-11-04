"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sighting, user } from "@/db/schema";
import { deletePhotos, storePhoto } from "@/lib/photo-storage";
import { requireUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

/**
 * Permanently deletes the logged-in account. Cancels any Stripe subscription first so they're
 * never charged again; everything else (sightings, photos, goals, friends, sessions…) is removed
 * by the database's cascading deletes.
 */
export async function deleteAccount(confirmation: string): Promise<{ error: string }> {
  const me = await requireUser();
  if (confirmation.trim().toUpperCase() !== "DELETE") return { error: 'Type DELETE to confirm.' };

  const [row] = await db
    .select({ subscriptionId: user.stripeSubscriptionId, email: user.email })
    .from(user)
    .where(eq(user.id, me.id));
  if (row?.email === "demo@demo.com") return { error: "The demo account can't be deleted." };

  if (row?.subscriptionId) {
    try {
      await getStripe().subscriptions.cancel(row.subscriptionId);
    } catch (error) {
      console.error("Couldn't cancel subscription before deleting account", error);
      return { error: "We couldn't cancel your subscription, so your account wasn't deleted. Please try again." };
    }
  }

  // Collect their photos first: the database delete removes the rows, then the files are deleted.
  const photos = await db.select({ photo: sighting.photo }).from(sighting).where(eq(sighting.userId, me.id));
  const [deleted] = await db.delete(user).where(eq(user.id, me.id)).returning({ image: user.image });
  await deletePhotos([...photos.map((p) => p.photo), deleted?.image]);
  redirect("/?deleted=1");
}

/** Sets (or, with null, removes) the logged-in user's profile picture. */
export async function updateAvatar(image: string | null): Promise<{ error?: string }> {
  const me = await requireUser();
  if (image !== null && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 300_000)) {
    return { error: "That picture couldn't be used. Please try another." };
  }
  const [current] = await db.select({ image: user.image }).from(user).where(eq(user.id, me.id));
  const stored = image ? await storePhoto(image, "avatars") : null;
  await db.update(user).set({ image: stored, updatedAt: new Date() }).where(eq(user.id, me.id));
  await deletePhotos([current?.image]);
  revalidatePath("/", "layout");
  return {};
}

/** Hides the "Get started" checklist on this device. */
export async function hideGetStarted() {
  await requireUser();
  (await cookies()).set("sighted_get_started_hidden", "1", {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/", "layout");
}
