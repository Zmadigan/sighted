import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Reset password · Sighted" };

// The emailed link sends people here with ?token=… (or ?error=INVALID_TOKEN if it expired).
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : null} invalid={typeof error === "string"} />;
}
