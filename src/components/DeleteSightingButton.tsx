"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteSighting } from "@/app/actions/sightings";

export function DeleteSightingButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn flex-1 border border-red-200 bg-white text-red-700 hover:bg-red-50"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete your ${name} sighting? This can't be undone.`)) {
          startTransition(() => deleteSighting(id));
        }
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
