"use client";

import { Binoculars, Heart, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadMoreFeed, toggleReaction } from "@/app/actions/feed";
import type { FeedCursor, FeedPost } from "@/lib/feed";
import { formatDate } from "@/lib/format";
import { CategoryBadge } from "./CategoryIcon";

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60 * 60 * 24 * 7, "w"],
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return "just now";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NiceSpot({ post }: { post: FeedPost }) {
  const [state, setState] = useState({ reacted: post.reactedByMe, count: post.reactions });
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={state.reacted}
      onClick={() => {
        // Update right away, then confirm with the server.
        const optimistic = { reacted: !state.reacted, count: state.count + (state.reacted ? -1 : 1) };
        setState(optimistic);
        startTransition(async () => {
          const result = await toggleReaction(post.id);
          if (result) setState(result);
        });
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        state.reacted ? "bg-red-50 text-red-600" : "bg-sand-100 text-bark-700 hover:bg-sand-200"
      }`}
    >
      <Heart className="h-4 w-4" fill={state.reacted ? "currentColor" : "none"} aria-hidden />
      Nice spot!
      {state.count > 0 && <span className="font-bold">{state.count}</span>}
    </button>
  );
}

function Post({ post }: { post: FeedPost }) {
  // Times are relative ("2h ago"), so only show them once the browser has the current time.
  const [ago, setAgo] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setAgo(timeAgo(post.postedAt));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [post.postedAt]);

  const header = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-white">
        {initials(post.ownerName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">
          {post.ownerName}
          {post.isMine && <span className="ml-1 font-normal text-bark-500">(you)</span>}
        </span>
        <span className="block text-xs text-bark-500">{ago ?? " "}</span>
      </span>
    </>
  );

  return (
    <article className="card overflow-hidden">
      {post.isMine ? (
        <div className="flex items-center gap-3 p-3">{header}</div>
      ) : (
        <Link href={`/friends/${post.ownerId}`} className="flex items-center gap-3 p-3">
          {header}
        </Link>
      )}
      <Link href={post.isMine ? `/journal/${post.id}` : `/friends/${post.ownerId}`} className="relative block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.photoUrl} alt={post.commonName} loading="lazy" className="max-h-[28rem] w-full bg-sand-100 object-cover" />
        {post.birdOfWeek && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sun-400 px-2.5 py-1 text-xs font-bold text-forest-900 shadow">
            <Binoculars className="h-3.5 w-3.5" aria-hidden /> Bird of the Week!
          </span>
        )}
      </Link>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">{post.commonName}</p>
            {post.scientificName && <p className="truncate text-sm italic text-bark-500">{post.scientificName}</p>}
          </div>
          <CategoryBadge category={post.category} />
        </div>
        {post.notes && <p className="whitespace-pre-wrap text-forest-800/90">{post.notes}</p>}
        <div className="flex items-center justify-between pt-1">
          <NiceSpot post={post} />
          <span className="text-xs text-bark-500">Seen {formatDate(post.observedOn)}</span>
        </div>
      </div>
    </article>
  );
}

/** Friends' photo sightings, newest first; loads 10 more as you near the bottom. */
export function Feed({ initial, initialCursor }: { initial: FeedPost[]; initialCursor: FeedCursor }) {
  const [posts, setPosts] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        setLoading(true);
        const next = await loadMoreFeed(cursor);
        setPosts((p) => [...p, ...next.posts.filter((n) => !p.some((x) => x.id === n.id))]);
        setCursor(next.next);
        setLoading(false);
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loading]);

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      <div ref={sentinel} />
      {loading && (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-bark-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Loading more…
        </p>
      )}
      {!cursor && posts.length > 0 && (
        <p className="py-4 text-center text-sm text-bark-500">You&apos;re all caught up. Time to go spotting!</p>
      )}
    </div>
  );
}
