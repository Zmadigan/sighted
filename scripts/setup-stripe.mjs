/**
 * One-time setup for the live site's Stripe connection:
 *  1. Registers the webhook https://<site>/api/stripe/webhook with Stripe (reuses it if it exists).
 *  2. Saves STRIPE_SECRET_KEY and the webhook's signing secret into Vercel (production + preview).
 *
 *   node scripts/setup-stripe.mjs https://sighted-self.vercel.app
 *
 * Secrets are piped straight into Vercel and never printed.
 */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local", quiet: true });

const site = process.argv[2]?.replace(/\/$/, "");
if (!site?.startsWith("https://")) {
  console.error("Usage: node scripts/setup-stripe.mjs https://your-site.vercel.app");
  process.exit(1);
}
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is missing from .env.local");
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
console.log(`✓ Stripe webhook registered: ${url} (${key.startsWith("sk_test_") ? "test mode" : "LIVE mode"})`);

function saveToVercel(name, value) {
  for (const target of ["production", "preview"]) {
    const r = spawnSync("npx", ["--yes", "vercel@65.9.0", "env", "add", name, target, "--force"], {
      input: value,
      encoding: "utf8",
    });
    console.log(r.status === 0 ? `✓ Saved ${name} to Vercel (${target})` : `✗ Failed to save ${name} (${target})`);
  }
}
saveToVercel("STRIPE_SECRET_KEY", key);
saveToVercel("STRIPE_WEBHOOK_SECRET", endpoint.secret);
console.log("Done. Redeploy the site for the new settings to take effect.");
