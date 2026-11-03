import { Crown, UserRound } from "lucide-react";
import Link from "next/link";
import { BottomNav, TopNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { OfflineSync } from "@/components/OfflineSync";
import { incomingRequestCount } from "@/lib/friends";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const friendRequests = await incomingRequestCount(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-sand-200 bg-sand-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo href="/journal" />
          <TopNav friendRequests={friendRequests} />
          <div className="flex items-center gap-3">
            {user.plan === "pro" ? (
              <Link href="/upgrade" className="rounded-full bg-sun-400 px-2 py-0.5 text-xs font-bold">
                PRO
              </Link>
            ) : (
              <Link
                href="/upgrade"
                className="inline-flex items-center gap-1 rounded-full bg-forest-600 px-2.5 py-1 text-xs font-bold text-white"
              >
                <Crown className="h-3.5 w-3.5" aria-hidden /> Upgrade
              </Link>
            )}
            <Link
              href="/account"
              aria-label="Account"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-bark-700 hover:bg-sand-200"
            >
              <UserRound className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>
      <OfflineSync />
      {/* Extra bottom padding so content isn't hidden behind the phone tab bar */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:pb-10">{children}</main>
      <BottomNav friendRequests={friendRequests} />
    </div>
  );
}
