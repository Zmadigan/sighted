import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";

const steps = [
  {
    emoji: "📸",
    title: "Snap a photo",
    text: "Use your phone camera on the trail, or upload a picture you already took.",
  },
  {
    emoji: "✨",
    title: "Get an instant ID",
    text: "AI tells you the species, its scientific name, and a few fun facts.",
  },
  {
    emoji: "📔",
    title: "Save it to your journal",
    text: "Add the date, a pin on the map and your notes. Watch your life list grow.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/identify" className="btn btn-primary py-2">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary py-2">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary py-2">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 text-center sm:pt-20">
          <p className="mb-4 inline-block rounded-full bg-forest-100 px-3 py-1 text-sm font-semibold text-forest-700">
            Sighted: your wildlife journal
          </p>
          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-forest-900 sm:text-5xl">
            Snap a photo of any animal. Get an instant ID. Build your lifelong wildlife journal.
          </h1>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={user ? "/identify" : "/signup"} className="btn btn-primary w-full sm:w-auto">
              {user ? "Identify an animal" : "Start your journal — it's free"}
            </Link>
            {!user && (
              <Link href="/login" className="btn btn-secondary w-full sm:w-auto">
                I already have an account
              </Link>
            )}
          </div>
          <div className="mt-10 text-5xl" aria-hidden>
            🦉 🦌 🐢 🦋 🐟
          </div>
        </section>

        {/* How it works */}
        <section className="bg-forest-50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-extrabold sm:text-3xl">How it works</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="card p-6">
                  <div className="text-4xl" aria-hidden>
                    {step.emoji}
                  </div>
                  <h3 className="mt-3 text-lg font-bold">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="mt-1 text-forest-800/80">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16" id="pricing">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Pricing</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="card p-6">
                <h3 className="text-xl font-bold">Free</h3>
                <p className="mt-1 text-3xl font-extrabold">$0</p>
                <ul className="mt-4 space-y-2 text-forest-800/90">
                  <li>✓ 5 AI identifications per month</li>
                  <li>✓ Unlimited journal entries</li>
                  <li>✓ Life list and map</li>
                </ul>
                <Link href="/signup" className="btn btn-secondary mt-6 w-full">
                  Get started
                </Link>
              </div>
              <div className="card border-2 border-forest-500 p-6">
                <h3 className="text-xl font-bold">
                  Pro <span className="ml-1 rounded-full bg-sun-400 px-2 py-0.5 text-xs">Coming soon</span>
                </h3>
                <p className="mt-1 text-3xl font-extrabold">
                  $4.99<span className="text-base font-semibold text-bark-500">/month</span>
                </p>
                <ul className="mt-4 space-y-2 text-forest-800/90">
                  <li>✓ Unlimited AI identifications</li>
                  <li>✓ Personal wildlife goals</li>
                  <li>✓ Your year in review</li>
                </ul>
                <Link href="/signup" className="btn btn-primary mt-6 w-full">
                  Sign up free today
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sand-200 py-6 text-center text-sm text-bark-500">
        🌿 Sighted: your wildlife journal
      </footer>
    </div>
  );
}
