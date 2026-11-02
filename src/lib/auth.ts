import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
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
