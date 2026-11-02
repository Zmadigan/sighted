import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

// On Vercel, fall back to the URLs Vercel provides so BETTER_AUTH_URL is optional there.
const vercelUrls = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? vercelUrls[0],
  trustedOrigins: vercelUrls,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    // Stay logged in for 30 days; refresh the session once a day while in use.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      // Users can't set this themselves at sign-up (input: false).
      plan: { type: "string", defaultValue: "free", input: false },
    },
  },
  // Must be last: lets server actions set login cookies.
  plugins: [nextCookies()],
});
