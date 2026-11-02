import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Use .env.local by default. To target another database, set DATABASE_URL
// in your terminal before running the command (it takes priority).
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
