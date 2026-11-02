import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getStripe, syncSubscription } from "@/lib/stripe";

export const metadata: Metadata = { title: "Welcome to Pro · Sighted" };

export default async function BillingSuccessPage({ searchParams }: PageProps<"/billing/success">) {
  const user = await requireUser();
  const { session_id } = await searchParams;
  if (typeof session_id !== "string") redirect("/upgrade");

  // Confirm the payment with Stripe directly, so Pro turns on right away
  // (the webhook does the same thing in the background).
  const session = await getStripe().checkout.sessions.retrieve(session_id, { expand: ["subscription"] });
  const paid = session.client_reference_id === user.id && session.status === "complete";
  if (paid && session.subscription && typeof session.subscription !== "string") {
    await syncSubscription(session.subscription);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
          <CircleCheck className="h-8 w-8" aria-hidden />
        </span>
        {paid ? (
          <>
            <h1 className="text-2xl font-extrabold">Welcome to Sighted Pro!</h1>
            <p className="text-forest-800/80">
              You now have unlimited AI identifications. Thanks for supporting Sighted.
            </p>
            <Link href="/identify" className="btn btn-primary mt-2 w-full">
              Start identifying
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">Almost there…</h1>
            <p className="text-forest-800/80">
              We haven&apos;t received confirmation of your payment yet. Refresh in a moment.
            </p>
            <Link href="/upgrade" className="btn btn-secondary mt-2 w-full">
              Back to plans
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
