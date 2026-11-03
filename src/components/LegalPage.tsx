import Link from "next/link";
import { Logo } from "./Logo";

/** Shared layout for the Privacy Policy and Terms pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-3xl px-4 py-4">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        <article className="card space-y-4 p-6 leading-relaxed sm:p-8 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="text-sm text-bark-500">Last updated {updated}</p>
          {children}
        </article>
        <p className="mt-6 flex gap-4 text-sm">
          <Link href="/privacy" className="font-semibold text-forest-600 underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="font-semibold text-forest-600 underline">
            Terms of Service
          </Link>
          <Link href="/" className="font-semibold text-forest-600 underline">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}

/** "Email us" line for the legal pages. Set CONTACT_EMAIL to show your real address. */
export function ContactLine({ lead }: { lead: string }) {
  const email = process.env.CONTACT_EMAIL;
  if (!email) return <p>{lead} Contact details will be listed here soon.</p>;
  return (
    <p>
      {lead} Email{" "}
      <a className="font-semibold text-forest-600 underline" href={`mailto:${email}`}>
        {email}
      </a>
      .
    </p>
  );
}
