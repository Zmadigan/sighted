"use client";

import { Check, Clock, LoaderCircle, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  cancelFriendRequest,
  findPeople,
  respondToRequest,
  sendFriendRequest,
} from "@/app/actions/friends";
import type { PersonResult } from "@/lib/friends";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-white">
      {initials(name)}
    </span>
  );
}

/** Search people by display name or exact email, and send friend requests. */
export function FindFriends() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [, startTransition] = useTransition();

  // Search shortly after typing stops.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const found = await findPeople(q);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const setStatus = (id: string, status: PersonResult["status"]) =>
    setResults((r) => r?.map((p) => (p.id === id ? { ...p, status } : p)) ?? null);

  const tooShort = query.trim().length < 2;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or exact email"
          aria-label="Find friends by name or email"
          className="field pl-9"
          autoComplete="off"
        />
        {searching && (
          <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-bark-500" aria-hidden />
        )}
      </div>

      {!tooShort && results && (
        <ul className="mt-2 divide-y divide-sand-200 rounded-xl border border-sand-200">
          {results.length === 0 && (
            <li className="p-3 text-sm text-bark-500">
              No one found. Check the spelling, or send them your invite link below.
            </li>
          )}
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <Avatar name={p.name} />
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              {p.status === "friend" && (
                <Link href={`/friends/${p.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
                  <Check className="h-4 w-4" aria-hidden /> Friends
                </Link>
              )}
              {p.status === "requested" && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1.5 text-sm font-semibold text-bark-700"
                  onClick={() =>
                    startTransition(async () => {
                      setStatus(p.id, "none");
                      await cancelFriendRequest(p.id);
                    })
                  }
                  title="Cancel request"
                >
                  <Clock className="h-4 w-4" aria-hidden /> Requested
                </button>
              )}
              {(p.status === "none" || p.status === "incoming") && (
                <button
                  type="button"
                  className="btn btn-primary px-3 py-1.5 text-sm"
                  onClick={() =>
                    startTransition(async () => {
                      setStatus(p.id, p.status === "incoming" ? "friend" : "requested");
                      const status = await sendFriendRequest(p.id);
                      if (status) setStatus(p.id, status);
                    })
                  }
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  {p.status === "incoming" ? "Accept" : "Add friend"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Requests waiting for your answer. */
export function FriendRequests({ requests }: { requests: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  if (requests.length === 0) return null;

  return (
    <section className="card border-2 border-forest-300 p-4">
      <h2 className="mb-2 flex items-center gap-2 font-bold">
        <UserPlus className="h-5 w-5 text-forest-600" aria-hidden /> Friend requests
        <span className="rounded-full bg-forest-600 px-2 py-0.5 text-xs text-white">{requests.length}</span>
      </h2>
      <ul className="divide-y divide-sand-200">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2">
            <Avatar name={r.name} />
            <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
            <button
              type="button"
              disabled={pending}
              className="btn btn-primary px-3 py-1.5 text-sm"
              onClick={() => startTransition(() => respondToRequest(r.id, true))}
            >
              <Check className="h-4 w-4" aria-hidden /> Accept
            </button>
            <button
              type="button"
              disabled={pending}
              aria-label={`Decline ${r.name}`}
              className="rounded-full p-2 text-bark-500 hover:bg-sand-100"
              onClick={() => startTransition(() => respondToRequest(r.id, false))}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
