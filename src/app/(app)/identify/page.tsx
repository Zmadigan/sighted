import type { Metadata } from "next";
import Link from "next/link";
import { IdentifyClient } from "@/components/IdentifyClient";
import { requireUser } from "@/lib/session";
import { FREE_MONTHLY_LIMIT, remainingIdentifications } from "@/lib/usage";

export const metadata: Metadata = { title: "Identify · Sighted" };

export default async function IdentifyPage() {
  const user = await requireUser();
  const remaining = await remainingIdentifications(user.id, user.plan);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Identify an animal</h1>
          <p className="text-sm text-bark-500">
            {remaining === null
              ? "Pro: unlimited identifications"
              : `${remaining} of ${FREE_MONTHLY_LIMIT} free IDs left this month`}
          </p>
        </div>
        <Link href="/sightings/new" className="text-sm font-semibold text-forest-600 underline">
          Add without a photo
        </Link>
      </div>
      <IdentifyClient initialRemaining={remaining} />
    </div>
  );
}
