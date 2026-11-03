"use client";

import { CloudUpload, LoaderCircle, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadOfflineSighting } from "@/app/actions/sightings";
import { isNetworkError, pendingSightings, QUEUE_EVENT, removePending } from "@/lib/offline-queue";

/** Uploads sightings saved offline as soon as there's signal, with a small status banner. */
export function OfflineSync() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [uploading, setUploading] = useState(false);
  const busy = useRef(false);

  const sync = useCallback(async () => {
    const pending = await pendingSightings().catch(() => []);
    setCount(pending.length);
    if (busy.current || !navigator.onLine || pending.length === 0) return;
    busy.current = true;
    setUploading(true);
    let uploaded = 0;
    for (const item of pending) {
      try {
        const result = await uploadOfflineSighting(item.input);
        // Saved, or rejected by the server (e.g. a missing name): either way, don't retry forever.
        if ("error" in result) console.error("Offline sighting rejected:", result.error);
        await removePending(item.key);
        uploaded++;
      } catch (error) {
        if (isNetworkError(error)) break; // still no signal; try again later
        console.error("Offline sighting failed", error);
      }
    }
    busy.current = false;
    setUploading(false);
    setCount((await pendingSightings().catch(() => [])).length);
    if (uploaded > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    const first = setTimeout(() => {
      updateOnline();
      sync();
    }, 0);
    const onOnline = () => {
      updateOnline();
      sync();
    };
    const onQueue = () => sync();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener(QUEUE_EVENT, onQueue);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener(QUEUE_EVENT, onQueue);
    };
  }, [sync]);

  if (online && count === 0) return null;

  return (
    <div className="sticky top-[57px] z-10 border-b border-sand-200 bg-sun-400/90 px-4 py-2 text-center text-sm font-semibold text-forest-900 backdrop-blur">
      <span className="inline-flex items-center gap-1.5">
        {!online ? (
          <>
            <WifiOff className="h-4 w-4" aria-hidden />
            You&apos;re offline.{count > 0 && ` ${count} sighting${count === 1 ? "" : "s"} will upload when you're back online.`}
          </>
        ) : uploading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Uploading {count} saved sighting
            {count === 1 ? "" : "s"}…
          </>
        ) : (
          <>
            <CloudUpload className="h-4 w-4" aria-hidden /> {count} sighting{count === 1 ? "" : "s"} waiting to upload
          </>
        )}
      </span>
    </div>
  );
}
