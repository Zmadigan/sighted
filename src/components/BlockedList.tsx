"use client";

import { useState, useTransition } from "react";
import { unblock } from "@/app/actions/moderation";
import { Avatar } from "./Avatar";

/** Settings → Blocked people, with an Unblock button for each. */
export function BlockedList({ initial }: { initial: { id: string; name: string }[] }) {
  const [people, setPeople] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (people.length === 0) return <p className="text-sm text-bark-500">You haven&apos;t blocked anyone.</p>;

  return (
    <ul className="divide-y divide-sand-200">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-2">
          <Avatar userId={p.id} name={p.name} className="h-8 w-8" />
          <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await unblock(p.id);
                setPeople((all) => all.filter((x) => x.id !== p.id));
              })
            }
            className="btn btn-secondary px-3 py-1.5 text-sm"
          >
            Unblock
          </button>
        </li>
      ))}
    </ul>
  );
}
