"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
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

  await db.delete(user).where(eq(user.id, me.id));
  redirect("/?deleted=1");
}
