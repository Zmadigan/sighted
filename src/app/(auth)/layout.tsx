import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already logged in? Skip straight to the app.
  if (await getCurrentUser()) redirect("/identify");

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 sm:pt-16">{children}</main>
    </div>
  );
}
