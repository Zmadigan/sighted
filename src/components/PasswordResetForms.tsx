"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (sent) {
    return (
      <div className="card flex w-full max-w-sm flex-col items-center gap-3 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
          <MailCheck className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold">Check your email</h1>
        <p className="text-forest-800/80">
          If there&apos;s a Sighted account for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
          It works for one hour. Check your spam folder if you don&apos;t see it.
        </p>
        <Link href="/login" className="btn btn-secondary mt-2 w-full">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="card w-full max-w-sm space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const { error } = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setLoading(false);
        // Show the same message whether or not the account exists, so nobody can use this to check emails.
        if (error && error.status !== 404) setError("We couldn't send the email. Please try again in a minute.");
        else setSent(true);
      }}
    >
      <h1 className="text-2xl font-extrabold">Forgot your password?</h1>
      <p className="text-sm text-bark-500">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Email</span>
        <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-forest-600 underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token || invalid) {
    return (
      <div className="card w-full max-w-sm space-y-3 p-6 text-center">
        <h1 className="text-2xl font-extrabold">This link has expired</h1>
        <p className="text-forest-800/80">Reset links work for one hour and only once. Request a new one below.</p>
        <Link href="/forgot-password" className="btn btn-primary w-full">
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      className="card w-full max-w-sm space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) return setError("Those passwords don't match.");
        setLoading(true);
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        setLoading(false);
        if (error) {
          setError(
            error.code === "INVALID_TOKEN"
              ? "This link has expired. Please request a new one."
              : (error.message ?? "Something went wrong. Please try again."),
          );
          return;
        }
        router.push("/login?reset=1");
      }}
    >
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">New password</span>
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="mt-1 block text-xs text-bark-500">At least 8 characters</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Confirm new password</span>
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
