/**
 * Connects a deployed site to Stripe:
 *  1. Registers the webhook https://<site>/api/stripe/webhook with Stripe (replacing any old one for that URL).
 *  2. Saves the Stripe secret key and the webhook's signing secret into Vercel.
 *
 * Test mode (uses STRIPE_SECRET_KEY, saves to production + preview):
 *   node scripts/setup-stripe.mjs https://sighted-self.vercel.app
 *
 * Live mode (uses STRIPE_LIVE_SECRET_KEY, saves to production only; previews stay in test mode):
 *   node scripts/setup-stripe.mjs https://sighted-self.vercel.app --live
 *
 *   Add --reset-test-billing to also clear test-mode Stripe links from user accounts. Accounts that
 *   got Pro from a test payment go back to Free; complimentary Pro accounts (like the demo) are untouched.
 *
 * Secrets are piped straight into Vercel and never printed.
 */
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const live = args.includes("--live");
const resetTestBilling = args.includes("--reset-test-billing");
const site = args.find((a) => a.startsWith("https://"))?.replace(/\/$/, "");
if (!site) {
  console.error("Usage: node scripts/setup-stripe.mjs https://your-site.vercel.app [--live] [--reset-test-billing]");
  process.exit(1);
}

const keyName = live ? "STRIPE_LIVE_SECRET_KEY" : "STRIPE_SECRET_KEY";
const key = process.env[keyName];
if (!key) {
  console.error(`${keyName} is missing from .env.local`);
  process.exit(1);
}
if (live !== /^(sk|rk)_live_/.test(key)) {
  console.error(`${keyName} doesn't look like a ${live ? "live (sk_live_)" : "test (sk_test_)"} key. Nothing was changed.`);
  process.exit(1);
}

const stripe = new Stripe(key);
const url = `${site}/api/stripe/webhook`;
const events = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

// The signing secret is only shown when an endpoint is created, so replace any old one for this URL.
const existing = await stripe.webhookEndpoints.list({ limit: 100 });
for (const endpoint of existing.data.filter((e) => e.url === url)) {
  await stripe.webhookEndpoints.del(endpoint.id);
}
const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: events, description: "Sighted" });
console.log(`✓ Stripe webhook registered: ${url} (${live ? "LIVE mode" : "test mode"})`);

const targets = live ? ["production"] : ["production", "preview"];
function saveToVercel(name, value) {
  for (const target of targets) {
    const r = spawnSync("npx", ["--yes", "vercel@65.9.0", "env", "add", name, target, "--force"], {
      input: value,
      encoding: "utf8",
    });
    console.log(r.status === 0 ? `✓ Saved ${name} to Vercel (${target})` : `✗ Failed to save ${name} (${target})`);
  }
}
saveToVercel("STRIPE_SECRET_KEY", key);
saveToVercel("STRIPE_WEBHOOK_SECRET", endpoint.secret);

if (resetTestBilling) {
  const sql = neon(process.env.DATABASE_URL);
  const downgraded = await sql`
    update "user" set plan = 'free', stripe_subscription_id = null, updated_at = now()
    where stripe_subscription_id is not null returning id`;
  const unlinked = await sql`
    update "user" set stripe_customer_id = null, updated_at = now()
    where stripe_customer_id is not null returning id`;
  console.log(`✓ Cleared test billing: ${downgraded.length} test subscriber(s) back to Free, ${unlinked.length} account(s) unlinked`);
}

console.log("Done. Redeploy the site for the new settings to take effect.");
