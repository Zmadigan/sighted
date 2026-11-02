import { config } from "dotenv";

// Loads .env.local. Variables already set in the terminal take priority,
// which is how you point the seed script at your production database.
config({ path: ".env.local", quiet: true });
