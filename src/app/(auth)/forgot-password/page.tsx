import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Forgot password · Sighted" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
