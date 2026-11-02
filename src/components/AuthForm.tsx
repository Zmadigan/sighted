"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode, next }: { mode: "signup" | "login"; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only allow redirects back into our own app.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/identify";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] })
        : await authClient.signIn.email({ email, password, rememberMe: true });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    router.push(destination);
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">{isSignup ? "Create your journal" : "Welcome back"}</h1>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Email</span>
        <input
          className="field"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Password</span>
        <input
          className="field"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {isSignup && <span className="mt-1 block text-xs text-bark-500">At least 8 characters</span>}
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "One moment…" : isSignup ? "Sign up" : "Log in"}
      </button>
      <p className="text-center text-sm">
        {isSignup ? "Already have an account? " : "New to Sighted? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold text-forest-600 underline"
        >
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
