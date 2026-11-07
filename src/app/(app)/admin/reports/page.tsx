import { ArrowLeft, Flag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveReport } from "@/app/actions/moderation";
import { TimeAgo } from "@/components/TimeAgo";
import { isAdmin, listReports, REPORT_REASONS, type ReportReason } from "@/lib/moderation";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Reports · Sighted" };

/** Admins only (ADMIN_EMAILS): review reported posts, comments and people. */
export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const me = await requireUser();
  if (!isAdmin(me.email)) notFound();
  const { show } = await searchParams;
  const closed = show === "closed";
  const reports = await listReports(closed ? "closed" : "open");

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/account" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Settings
      </Link>
      <h1 className="text-2xl font-extrabold">Reports</h1>
      <p className="mb-4 text-sm text-bark-500">Apple expects reports to be handled within 24 hours.</p>

      <div className="mb-4 flex gap-1 rounded-full bg-sand-100 p-1">
        {[
          { href: "/admin/reports", label: "Open", active: !closed },
          { href: "/admin/reports?show=closed", label: "Handled", active: closed },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`flex-1 rounded-full py-1.5 text-center text-sm font-semibold ${
              t.active ? "bg-white text-forest-800 shadow-sm" : "text-bark-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Flag className="h-8 w-8 text-forest-600" aria-hidden />
          <p className="font-semibold">{closed ? "Nothing handled yet" : "No open reports"}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const gone = (r.kind === "post" && !r.sightingId) || (r.kind === "comment" && !r.commentId);
            return (
              <li key={r.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold uppercase text-red-700">{r.kind}</span>
                  <span className="font-semibold">{REPORT_REASONS[r.reason as ReportReason] ?? r.reason}</span>
                  <span className="text-bark-500">
                    · <TimeAgo iso={r.createdAt.toISOString()} />
                  </span>
                  {closed && (
                    <span className="ml-auto rounded-full bg-sand-100 px-2 py-0.5 font-bold text-bark-700">
                      {r.status === "removed" ? "Removed" : "Dismissed"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-bark-700">
                  <strong>{r.reporterName ?? "Someone"}</strong> reported{" "}
                  {r.kind === "user" ? "" : "content by "}
                  <strong>{r.targetName ?? "a deleted account"}</strong>
                </p>
                {r.kind === "post" && r.sightingId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos/${r.sightingId}`}
                    alt="Reported post"
                    className="max-h-64 w-full rounded-xl bg-sand-100 object-cover"
                  />
                )}
                {r.snapshot && r.kind !== "user" && (
                  <blockquote className="whitespace-pre-wrap rounded-xl bg-sand-50 p-3 text-sm">{r.snapshot}</blockquote>
                )}
                {r.details && <p className="text-sm italic text-bark-700">&ldquo;{r.details}&rdquo;</p>}
                {gone && <p className="text-xs text-bark-500">This has already been deleted.</p>}

                {!closed && (
                  <div className="flex gap-2 pt-1">
                    {r.kind !== "user" && !gone && (
                      <form action={resolveReport.bind(null, r.id, "remove")} className="flex-1">
                        <button type="submit" className="btn w-full bg-red-700 py-2 text-sm text-white hover:bg-red-800">
                          Remove {r.kind}
                        </button>
                      </form>
                    )}
                    <form action={resolveReport.bind(null, r.id, "dismiss")} className="flex-1">
                      <button type="submit" className="btn btn-secondary w-full py-2 text-sm">
                        {gone || r.kind === "user" ? "Mark handled" : "Keep it"}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
