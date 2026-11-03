/**
 * Sets up sending email from your domain with Resend:
 *  1. Adds the domain to Resend (or reuses it if it's already there).
 *  2. Adds Resend's DNS records to the domain in Vercel (the domain must use Vercel's nameservers).
 *  3. Asks Resend to verify the domain, then saves RESEND_API_KEY and EMAIL_FROM to Vercel (production).
 *
 *   node scripts/setup-email.mjs sightedwildlife.com
 *
 * Uses RESEND_API_KEY from .env.local. Secrets are piped into Vercel and never printed.
 */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: ".env.local", quiet: true });

const domain = process.argv[2];
const key = process.env.RESEND_API_KEY;
if (!domain || !key?.startsWith("re_")) {
  console.error("Usage: node scripts/setup-email.mjs yourdomain.com  (with RESEND_API_KEY in .env.local)");
  process.exit(1);
}
const from = `Sighted <hello@${domain}>`;
const resend = new Resend(key);

const vercel = (args, input) =>
  spawnSync("npx", ["--yes", "vercel@65.9.0", ...args], { input, encoding: "utf8" });

// 1. Add (or find) the domain in Resend
const { data: list, error: listError } = await resend.domains.list();
if (listError) throw new Error(`Resend: ${listError.message}`);
let existing = list.data.find((d) => d.name === domain);
if (!existing) {
  const { data, error } = await resend.domains.create({ name: domain });
  if (error) throw new Error(`Resend: ${error.message}`);
  existing = data;
  console.log(`✓ Added ${domain} to Resend`);
} else {
  console.log(`✓ ${domain} is already in Resend`);
}
const { data: details, error: getError } = await resend.domains.get(existing.id);
if (getError) throw new Error(`Resend: ${getError.message}`);

// 2. Add the sending records (SPF + DKIM) to the domain in Vercel. Receiving/tracking records are skipped.
for (const r of details.records.filter((rec) => rec.record === "SPF" || rec.record === "DKIM")) {
  const name = r.name === domain || r.name === "@" ? "" : r.name.replace(new RegExp(`\\.?${domain.replace(".", "\\.")}$`), "");
  const args = ["dns", "add", domain, name || "@", r.type, r.value];
  if (r.type === "MX") args.push(String(r.priority ?? 10));
  const res = vercel(args);
  const ok = res.status === 0 || /already exists/i.test(res.stdout + res.stderr);
  console.log(`${ok ? "✓" : "✗"} DNS ${r.type} ${name || "@"}${ok ? "" : `: ${(res.stderr || res.stdout).trim().split("\n").pop()}`}`);
}

// 3. Verify and save settings
await resend.domains.verify(existing.id);
console.log("✓ Asked Resend to verify the domain (can take a few minutes)");

for (const [name, value] of [
  ["RESEND_API_KEY", key],
  ["EMAIL_FROM", from],
]) {
  const res = vercel(["env", "add", name, "production", "--force"], value);
  console.log(res.status === 0 ? `✓ Saved ${name} to Vercel (production)` : `✗ Failed to save ${name}`);
}
console.log(`Done. Emails will come from: ${from}`);
