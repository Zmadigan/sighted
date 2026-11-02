import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to .env.local (see .env.example).");
}

// Neon's HTTP driver works well on Vercel's serverless functions.
export const db = drizzle(neon(process.env.DATABASE_URL), { schema });
