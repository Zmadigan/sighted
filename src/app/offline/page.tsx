import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Offline · Sighted" };

// Shown by the service worker when there's no signal and this page wasn't saved yet.
export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10">
        <div className="card flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sand-100 text-bark-700">
            <WifiOff className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="text-xl font-extrabold">No signal right now</h1>
          <p className="text-forest-800/80">
            This page isn&apos;t saved on your phone yet. Pages you&apos;ve opened before still work, and you can log
            sightings offline. They&apos;ll upload when you&apos;re back online.
          </p>
          <Link href="/sightings/new" className="btn btn-primary w-full">
            Log a sighting
          </Link>
          <Link href="/journal" className="btn btn-secondary w-full">
            My journal
          </Link>
        </div>
      </main>
    </div>
  );
}
