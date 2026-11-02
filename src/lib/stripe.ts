import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { user } from "@/db/schema";

let stripe: Stripe | undefined;

/** Created on first use so builds work without the key present. */
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing. Add it to .env.local (see .env.example).");
  }
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export const PRO_PRICE_CENTS = 499;

/** Line item for Sighted Pro: $4.99/month. Defined here so no Stripe dashboard setup is needed. */
export const PRO_LINE_ITEM: Stripe.Checkout.SessionCreateParams.LineItem = {
  quantity: 1,
  price_data: {
    currency: "usd",
    unit_amount: PRO_PRICE_CENTS,
    recurring: { interval: "month" },
    product_data: {
      name: "Sighted Pro",
      description: "Unlimited AI identifications, goals and year-in-review.",
    },
  },
};

/** Statuses where the user keeps Pro. past_due gives them time to fix a failed card. */
const PRO_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

/** True when the saved customer exists for the current key (a test-mode customer doesn't exist in live mode). */
async function customerExists(customerId: string) {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    return !customer.deleted;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return false;
    throw error;
  }
}

/** Returns the user's Stripe customer, creating it the first time they upgrade. */
export async function getOrCreateCustomer(u: { id: string; email: string; stripeCustomerId: string | null }) {
  if (u.stripeCustomerId && (await customerExists(u.stripeCustomerId))) return u.stripeCustomerId;
  const customer = await getStripe().customers.create({ email: u.email, metadata: { userId: u.id } });
  await db.update(user).set({ stripeCustomerId: customer.id }).where(eq(user.id, u.id));
  return customer.id;
}

/** Copies a subscription's state onto the matching user: Pro while it's active, Free after it ends. */
export async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const isPro = PRO_STATUSES.includes(subscription.status);
  await db
    .update(user)
    .set({
      plan: isPro ? "pro" : "free",
      stripeSubscriptionId: isPro ? subscription.id : null,
      updatedAt: new Date(),
    })
    .where(eq(user.stripeCustomerId, customerId));
}

/** Stripe's customer portal needs a saved configuration; create a simple one if there isn't any. */
export async function ensurePortalConfiguration() {
  const s = getStripe();
  const existing = await s.billingPortal.configurations.list({ is_default: true, limit: 1 });
  if (existing.data.length > 0) return;
  await s.billingPortal.configurations.create({
    business_profile: { headline: "Manage your Sighted Pro subscription" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
}
