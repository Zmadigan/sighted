"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ensurePortalConfiguration, getOrCreateCustomer, getStripe, PRO_LINE_ITEM } from "@/lib/stripe";

async function siteUrl() {
  const h = await headers();
  return h.get("origin") ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

async function billingUser() {
  const current = await requireUser();
  const [row] = await db
    .select({ id: user.id, email: user.email, plan: user.plan, stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, current.id));
  return row;
}

/** Sends the user to Stripe's secure checkout page for Sighted Pro. */
export async function startCheckout() {
  const u = await billingUser();
  if (u.plan === "pro") redirect("/upgrade");

  const base = await siteUrl();
  let url: string | null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: await getOrCreateCustomer(u),
      client_reference_id: u.id,
      line_items: [PRO_LINE_ITEM],
      allow_promotion_codes: true,
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/upgrade?canceled=1`,
    });
    url = session.url;
  } catch (error) {
    console.error("Stripe checkout failed", error);
    url = null;
  }
  redirect(url ?? "/upgrade?error=1");
}

/** Opens Stripe's customer portal to update the card or cancel. */
export async function openBillingPortal() {
  const u = await billingUser();
  if (!u.stripeCustomerId) redirect("/upgrade");

  let url: string | null;
  try {
    await ensurePortalConfiguration();
    const session = await getStripe().billingPortal.sessions.create({
      customer: u.stripeCustomerId,
      return_url: `${await siteUrl()}/upgrade`,
    });
    url = session.url;
  } catch (error) {
    console.error("Stripe billing portal failed", error);
    url = null;
  }
  redirect(url ?? "/upgrade?error=1");
}
