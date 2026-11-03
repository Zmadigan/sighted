import "server-only";
import { Resend } from "resend";

let resend: Resend | undefined;

type Email = { to: string; subject: string; html: string; text: string };

/**
 * Sends an email through Resend. Without RESEND_API_KEY (e.g. on your Mac before email is set up),
 * the email is printed in the dev server's terminal instead so the flow can still be tested.
 */
export async function sendEmail({ to, subject, html, text }: Email) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is missing.");
    console.log(`\n✉️  [email not sent: no RESEND_API_KEY] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  resend ??= new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Sighted <onboarding@resend.dev>",
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Email failed to send: ${error.message}`);
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function passwordResetEmail(name: string, url: string): Omit<Email, "to"> {
  return {
    subject: "Reset your Sighted password",
    text: `Hi ${name},\n\nSomeone (hopefully you) asked to reset your Sighted password. Use this link within the next hour:\n\n${url}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.\n\nSighted: your wildlife journal`,
    html: `<!doctype html>
<html><body style="margin:0;background:#fbf8f2;font-family:Arial,Helvetica,sans-serif;color:#1d3820">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <p style="font-size:22px;font-weight:800;color:#2f5a2e;margin:0 0 24px">Sighted</p>
    <div style="background:#ffffff;border:1px solid #e9dfc8;border-radius:16px;padding:24px">
      <p style="font-size:18px;font-weight:700;margin:0 0 12px">Reset your password</p>
      <p style="margin:0 0 20px;line-height:1.5">Hi ${escape(name)}, someone (hopefully you) asked to reset your Sighted password. This link works for the next hour.</p>
      <a href="${escape(url)}" style="display:inline-block;background:#3b6f38;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Choose a new password</a>
      <p style="margin:20px 0 0;font-size:13px;color:#8a6a4a;line-height:1.5">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
    </div>
    <p style="font-size:12px;color:#8a6a4a;margin:20px 0 0">Sighted: your wildlife journal</p>
  </div>
</body></html>`,
  };
}
