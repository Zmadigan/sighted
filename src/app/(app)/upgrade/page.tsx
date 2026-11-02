import { eq } from "drizzle-orm";
import { Check, CreditCard, Crown } from "lucide-react";
import type { Metadata } from "next";
import { openBillingPortal, startCheckout } from "@/app/actions/billing";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { FREE_MONTHLY_LIMIT, remainingIdentifications } from "@/lib/usage";

export const metadata: Metadata = { title: "Sighted Pro · Sighted" };

const proFeatures = ["Unlimited AI identifications", "Personal wildlife goals", "Your year in review"];

export default async function UpgradePage({ searchParams }: PageProps<"/upgrade">) {
  const current = await requireUser();
  const [u] = await db
    .select({ plan: user.plan, stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, current.id));
  const { canceled, error } = await searchParams;
  const errorNote = error && (
    <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      We couldn&apos;t reach our payment provider. Please try again in a moment.
    </p>
  );

  if (u.plan === "pro") {
    return (
      <div className="mx-auto max-w-md">
        {errorNote}
        <div className="card p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sun-400 text-forest-900">
            <Crown className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="mt-3 text-2xl font-extrabold">You&apos;re on Sighted Pro</h1>
          <p className="mt-1 text-forest-800/80">Unlimited identifications are switched on. Happy spotting!</p>
          {u.stripeCustomerId ? (
            <form action={openBillingPortal} className="mt-5">
              <button type="submit" className="btn btn-secondary w-full">
                <CreditCard className="h-4 w-4" aria-hidden /> Manage billing
              </button>
              <p className="mt-2 text-xs text-bark-500">Update your card, see receipts or cancel anytime.</p>
            </form>
          ) : (
            <p className="mt-4 text-sm text-bark-500">This is a complimentary Pro account, so there&apos;s no billing to manage.</p>
          )}
        </div>
      </div>
    );
  }

  const remaining = await remainingIdentifications(current.id, "free");

  return (
    <div className="mx-auto max-w-md">
      {errorNote}
      {canceled && (
        <p className="mb-4 rounded-lg bg-sand-100 p-3 text-sm text-bark-700">
          No worries — checkout was canceled and you haven&apos;t been charged.
        </p>
      )}
      <div className="card border-2 border-forest-500 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sun-400 text-forest-900">
            <Crown className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Sighted Pro</h1>
            <p className="text-sm text-bark-500">
              You have {remaining} of {FREE_MONTHLY_LIMIT} free IDs left this month
            </p>
          </div>
        </div>
        <p className="mt-5 text-4xl font-extrabold">
          $4.99<span className="text-base font-semibold text-bark-500">/month</span>
        </p>
        <ul className="mt-4 space-y-2">
          {proFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" strokeWidth={2.5} aria-hidden />
              {f}
            </li>
          ))}
        </ul>
        <form action={startCheckout} className="mt-6">
          <button type="submit" className="btn btn-primary w-full">
            Upgrade to Pro
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-bark-500">Secure checkout by Stripe. Cancel anytime.</p>
      </div>
    </div>
  );
}
