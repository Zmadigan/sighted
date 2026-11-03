"use client";

import { Check, Copy, Pencil, Share2 } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { updateDisplayName } from "@/app/actions/friends";

/** Shows the user's invite link with Share (phones) and Copy buttons. */
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  // Phones have a native share sheet; the server render assumes it doesn't, then the browser checks.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="truncate rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm text-bark-700">{url}</div>
      <div className="mt-2 flex gap-2">
        {canShare && (
          <button
            type="button"
            className="btn btn-primary flex-1 py-2"
            onClick={() => navigator.share({ title: "Join me on Sighted", text: "Let's see who spots more wildlife!", url }).catch(() => {})}
          >
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </button>
        )}
        <button type="button" className={`btn flex-1 py-2 ${canShare ? "btn-secondary" : "btn-primary"}`} onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

/** The name friends see; tap the pencil to change it. */
export function DisplayName({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  if (!editing) {
    return (
      <p className="flex items-center gap-2 text-sm text-bark-500">
        Friends see you as <span className="font-bold text-forest-900">{name}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-forest-600" aria-label="Change your name">
          <Pencil className="h-4 w-4" />
        </button>
      </p>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startSaving(async () => {
          const result = await updateDisplayName(value);
          if (result.error) setError(result.error);
          else {
            setError(null);
            setEditing(false);
          }
        });
      }}
    >
      <input className="field flex-1 py-2" value={value} maxLength={40} onChange={(e) => setValue(e.target.value)} autoFocus />
      <button type="submit" className="btn btn-primary py-2" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
