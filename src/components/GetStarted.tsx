import { eq, sql } from "drizzle-orm";
import { Binoculars, Camera, Check, ChevronRight, Rocket, UserPlus, UserRound, X } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { hideGetStarted } from "@/app/actions/account";
import { db } from "@/db";
import { user } from "@/db/schema";
import { statsForUser } from "@/lib/achievements";

export const GET_STARTED_COOKIE = "sighted_get_started_hidden";

/** First-time checklist for new people. Disappears once everything is done, or when hidden. */
export async function GetStarted({ userId }: { userId: string }) {
  if ((await cookies()).get(GET_STARTED_COOKIE)) return null;

  const [stats, [row]] = await Promise.all([
    statsForUser(userId),
    db.select({ hasImage: sql<boolean>`${user.image} is not null` }).from(user).where(eq(user.id, userId)),
  ]);
  const steps = [
    { done: stats.sightings > 0, label: "Identify your first animal", hint: "Snap or upload a photo", href: "/identify", Icon: Camera },
    { done: Boolean(row?.hasImage), label: "Add a profile picture", hint: "So friends know it's you", href: "/profile", Icon: UserRound },
    { done: stats.friends > 0, label: "Add a friend", hint: "Compete on the leaderboard", href: "/friends?view=add", Icon: UserPlus },
    { done: stats.birdsOfWeek > 0, label: "Find a Bird of the Week", hint: "A new bird near you every Monday", href: "/identify", Icon: Binoculars },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section className="card mb-4 overflow-hidden">
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-white">
          <Rocket className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Get started with Sighted</h2>
          <p className="text-sm text-bark-500">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <form action={hideGetStarted}>
          <button type="submit" className="rounded-full p-2 text-bark-500 hover:bg-sand-100" aria-label="Hide this checklist">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-sand-100">
        <div className="h-full rounded-full bg-forest-600" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-2 divide-y divide-sand-200">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sand-50">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  s.done ? "bg-forest-600 text-white" : "bg-forest-100 text-forest-700"
                }`}
              >
                {s.done ? <Check className="h-4 w-4" aria-label="Done" /> : <s.Icon className="h-4 w-4" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${s.done ? "text-bark-500 line-through" : ""}`}>{s.label}</span>
                {!s.done && <span className="block text-xs text-bark-500">{s.hint}</span>}
              </span>
              {!s.done && <ChevronRight className="h-4 w-4 text-bark-500" aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
