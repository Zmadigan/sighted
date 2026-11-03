"use client";

import { TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";

export function DeleteAccount({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-red-700 underline">
        Delete my account
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          // On success the server signs you out and goes to the homepage.
          const result = await deleteAccount(text);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <p className="flex items-start gap-2 text-sm text-red-800">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          This permanently deletes your account, all your sightings and photos, goals and friends. It can&apos;t be
          undone.
          {isPro && " Your Pro subscription will be canceled right away."}
        </span>
      </p>
      <label className="block text-sm font-semibold text-red-800">
        Type DELETE to confirm
        <input className="field mt-1" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </label>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || text.trim().toUpperCase() !== "DELETE"}
          className="btn bg-red-700 py-2 text-sm text-white hover:bg-red-800"
        >
          {pending ? "Deleting…" : "Delete forever"}
        </button>
        <button type="button" className="btn btn-secondary py-2 text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
