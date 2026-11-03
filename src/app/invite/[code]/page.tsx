import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvite } from "@/app/actions/friends";
import { Logo } from "@/components/Logo";
import { areFriends, findUserByInviteCode } from "@/lib/friends";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "You're invited · Sighted" };

export default async function InvitePage({ params }: PageProps<"/invite/[code]">) {
  const { code } = await params;
  const [inviter, me] = await Promise.all([findUserByInviteCode(code), getCurrentUser()]);
  const here = `/invite/${code}`;

  let body: React.ReactNode;
  if (!inviter) {
    body = (
      <>
        <h1 className="text-2xl font-extrabold">This invite link doesn&apos;t work</h1>
        <p className="text-forest-800/80">Ask your friend to send their link again.</p>
        <Link href="/" className="btn btn-secondary mt-2 w-full">
          Go to Sighted
        </Link>
      </>
    );
  } else if (me?.id === inviter.id) {
    body = (
      <>
        <h1 className="text-2xl font-extrabold">This is your own invite link</h1>
        <p className="text-forest-800/80">Send it to friends so they can add you.</p>
        <Link href="/friends" className="btn btn-secondary mt-2 w-full">
          Back to Friends
        </Link>
      </>
    );
  } else if (me && (await areFriends(me.id, inviter.id))) {
    body = (
      <>
        <h1 className="text-2xl font-extrabold">You and {inviter.name} are already friends</h1>
        <Link href="/friends" className="btn btn-primary mt-2 w-full">
          See the leaderboard
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="text-2xl font-extrabold">{inviter.name} invited you to Sighted</h1>
        <p className="text-forest-800/80">
          Become friends to compare life lists and race to spot the most species.
        </p>
        {me ? (
          <form action={acceptInvite.bind(null, code)} className="mt-2 w-full">
            <button type="submit" className="btn btn-primary w-full">
              <UserPlus className="h-5 w-5" aria-hidden /> Add {inviter.name} as a friend
            </button>
          </form>
        ) : (
          <div className="mt-2 flex w-full flex-col gap-2">
            <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn btn-primary w-full">
              Sign up to accept
            </Link>
            <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn btn-secondary w-full">
              I already have an account
            </Link>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 sm:pt-16">
        <div className="card flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
            <UserPlus className="h-8 w-8" aria-hidden />
          </span>
          {body}
        </div>
      </main>
    </div>
  );
}
