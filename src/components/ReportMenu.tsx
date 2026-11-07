"use client";

import { Ban, Flag, LoaderCircle, MoreHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { block, submitReport, type ReportInput } from "@/app/actions/moderation";

const REASONS = [
  ["spam", "Spam"],
  ["harassment", "Harassment or bullying"],
  ["inappropriate", "Inappropriate or offensive"],
  ["misleading", "Fake or misleading"],
  ["other", "Something else"],
] as const;

type Target =
  | { kind: "post"; sightingId: string }
  | { kind: "comment"; commentId: string }
  | { kind: "user" };

/**
 * The "⋯" menu on someone else's post, comment or profile: Report, and Block.
 * `onHidden(blocked)` runs once the thing should disappear (after a report, or after blocking).
 */
export function ReportMenu({
  target,
  userId,
  userName,
  onHidden,
  small = false,
}: {
  target: Target;
  userId: string;
  userName: string;
  onHidden: (blocked: boolean) => void;
  small?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<"report" | "block" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const what = target.kind === "user" ? userName : `this ${target.kind}`;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setMenuOpen((o) => !o);
        }}
        className={`rounded-full text-bark-500 hover:bg-sand-100 ${small ? "p-1.5" : "p-2"}`}
        aria-label={target.kind === "user" ? `More options for ${userName}` : `More options for ${what}`}
        aria-expanded={menuOpen}
      >
        <MoreHorizontal className={small ? "h-3.5 w-3.5" : "h-5 w-5"} aria-hidden />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-sand-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSheet("report");
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-semibold hover:bg-sand-50"
          >
            <Flag className="h-4 w-4" aria-hidden /> Report {target.kind === "user" ? "" : target.kind}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSheet("block");
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-semibold text-red-700 hover:bg-sand-50"
          >
            <Ban className="h-4 w-4" aria-hidden /> <span className="truncate">Block {userName}</span>
          </button>
        </div>
      )}
      {sheet === "report" && (
        <ReportSheet target={target} userId={userId} userName={userName} onClose={() => setSheet(null)} onDone={onHidden} />
      )}
      {sheet === "block" && (
        <BlockSheet userId={userId} userName={userName} onClose={() => setSheet(null)} onDone={() => onHidden(true)} />
      )}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-forest-900 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-bark-500 hover:bg-sand-100" aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ReportSheet({
  target,
  userId,
  userName,
  onClose,
  onDone,
}: {
  target: Target;
  userId: string;
  userName: string;
  onClose: () => void;
  onDone: (blocked: boolean) => void;
}) {
  const [reason, setReason] = useState<ReportInput["reason"] | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <Sheet title="Thanks for letting us know" onClose={() => onDone(alsoBlock)}>
        <p className="text-bark-700">
          We&apos;ll review it within 24 hours and remove anything that breaks our rules.
          {target.kind !== "user" && " You won't see it anymore."}
          {alsoBlock && ` You've also blocked ${userName}.`}
        </p>
        <button type="button" onClick={() => onDone(alsoBlock)} className="btn btn-primary mt-4 w-full">
          Done
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title={target.kind === "user" ? `Report ${userName}` : `Report ${target.kind}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason) return setError("Please pick a reason.");
          setError(null);
          startTransition(async () => {
            const input: ReportInput = {
              kind: target.kind,
              sightingId: target.kind === "post" ? target.sightingId : undefined,
              commentId: target.kind === "comment" ? target.commentId : undefined,
              userId: target.kind === "user" ? userId : undefined,
              reason,
              details,
              alsoBlock,
            };
            const result = await submitReport(input);
            if ("error" in result) setError(result.error);
            else setSent(true);
          });
        }}
        className="space-y-3"
      >
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-sm text-bark-700">Why are you reporting this?</legend>
          {REASONS.map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 font-semibold ${
                reason === value ? "border-forest-500 bg-forest-50" : "border-sand-200"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-forest-600"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Anything else we should know? (optional)"
          className="field resize-none text-sm"
        />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="h-4 w-4 accent-forest-600" />
          Also block {userName}
        </label>
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />} Send report
        </button>
      </form>
    </Sheet>
  );
}

function BlockSheet({
  userId,
  userName,
  onClose,
  onDone,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Sheet title={`Block ${userName}?`} onClose={onClose}>
      <ul className="list-disc space-y-1 pl-5 text-bark-700">
        <li>You&apos;ll no longer be friends.</li>
        <li>You won&apos;t see each other&apos;s posts or comments.</li>
        <li>They can&apos;t find you or send you a friend request.</li>
        <li>They won&apos;t be told. You can unblock them in Settings.</li>
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await block(userId);
              onDone();
            })
          }
          className="btn flex-1 bg-red-700 text-white hover:bg-red-800"
        >
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />} Block
        </button>
        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </Sheet>
  );
}

/** The "⋯" menu on a friend's profile. Blocking takes you back to the Friends tab. */
export function ProfileMenu({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  return (
    <ReportMenu
      target={{ kind: "user" }}
      userId={userId}
      userName={userName}
      onHidden={(blocked) => {
        if (blocked) router.replace("/friends");
      }}
    />
  );
}
