import { eq } from "drizzle-orm";
import { ArrowLeft, CreditCard, Crown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { openBillingPortal } from "@/app/actions/billing";
import { DeleteAccount } from "@/components/DeleteAccount";
import { DisplayName } from "@/components/FriendsClient";
import { LogoutButton } from "@/components/LogoutButton";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings · Sighted" };

export default async function AccountPage() {
  const me = await requireUser();
  const [row] = await db.select({ stripeCustomerId: user.stripeCustomerId }).from(user).where(eq(user.id, me.id));
  const isPro = me.plan === "pro";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <Link href="/profile" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> My profile
        </Link>
        <h1 className="text-2xl font-extrabold">Settings</h1>
      </div>

      <section className="card space-y-2 p-4">
        <p className="text-sm text-bark-500">Email</p>
        <p className="font-semibold">{me.email}</p>
        <DisplayName name={me.name} />
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <p className="font-bold">Plan</p>
          {isPro ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sun-400 px-2 py-0.5 text-xs font-bold">
              <Crown className="h-3.5 w-3.5" aria-hidden /> Pro
            </span>
          ) : (
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-bold text-bark-700">Free</span>
          )}
        </div>
        {isPro && row?.stripeCustomerId ? (
          <form action={openBillingPortal}>
            <button type="submit" className="btn btn-secondary py-2 text-sm">
              <CreditCard className="h-4 w-4" aria-hidden /> Manage billing
            </button>
            <p className="mt-1 text-xs text-bark-500">Update your card, see receipts or cancel anytime.</p>
          </form>
        ) : isPro ? (
          <p className="text-sm text-bark-500">This is a complimentary Pro account.</p>
        ) : (
          <Link href="/upgrade" className="btn btn-primary py-2 text-sm">
            <Crown className="h-4 w-4" aria-hidden /> Upgrade to Pro
          </Link>
        )}
      </section>

      <section className="card flex items-center justify-between p-4">
        <div className="flex gap-4 text-sm">
          <Link href="/privacy" className="font-semibold text-forest-600 underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="font-semibold text-forest-600 underline">
            Terms
          </Link>
        </div>
        <LogoutButton />
      </section>

      <section className="pt-2">
        <DeleteAccount isPro={isPro && Boolean(row?.stripeCustomerId)} />
      </section>
    </div>
  );
}
