import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Auth tables (the shape Better Auth expects), plus our own `plan` column.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // "free" or "pro"
  plan: text("plan").notNull().default("free"),
  // Stripe billing (set once the user starts a subscription)
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Personal invite link code for adding friends (created the first time it's needed)
  inviteCode: text("invite_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  // Hashed password for email + password sign-in
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const sighting = pgTable(
  "sighting",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    commonName: text("common_name").notNull(),
    scientificName: text("scientific_name"),
    // bird | mammal | reptile_amphibian | insect | fish | other
    category: text("category").notNull(),
    // high | medium | low (only set for AI identifications)
    confidence: text("confidence"),
    funFacts: jsonb("fun_facts").$type<string[]>(),
    observedOn: date("observed_on", { mode: "string" }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    notes: text("notes"),
    // Compressed JPEG stored as a data URL ("data:image/jpeg;base64,...")
    photo: text("photo"),
    // Private sightings stay out of the friends feed and friends' view of your journal
    isPrivate: boolean("is_private").notNull().default(false),
    // Only used by the seed script so re-running it never creates duplicates
    seedKey: text("seed_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("sighting_user_idx").on(t.userId, t.observedOn),
    uniqueIndex("sighting_seed_key_idx").on(t.userId, t.seedKey),
  ],
);

// One row per user per calendar month, counting AI identifications.
export const usage = pgTable(
  "usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // e.g. "2026-11"
    month: text("month").notNull(),
    identifications: integer("identifications").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.month] })],
);

// Friendships are stored in both directions (A→B and B→A) so "my friends" is a simple lookup.
export const friendship = pgTable(
  "friendship",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    friendId: text("friend_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.friendId] })],
);

// "Nice spot!" reactions on feed posts: one per person per sighting.
export const reaction = pgTable(
  "reaction",
  {
    sightingId: uuid("sighting_id")
      .notNull()
      .references(() => sighting.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sightingId, t.userId] })],
);

// Bird of the Week: one bird per area (a ~100 km grid square) per week, picked by Claude.
export const weeklyBird = pgTable(
  "weekly_bird",
  {
    // e.g. "40_-74" (rounded latitude_longitude)
    areaKey: text("area_key").notNull(),
    // e.g. "2026-11-02" (the Monday the week starts on)
    week: text("week").notNull(),
    // Friendly name for the area, e.g. "New York City area"
    regionName: text("region_name"),
    // null when there's no suitable bird (e.g. the middle of the ocean)
    commonName: text("common_name"),
    scientificName: text("scientific_name"),
    // Where and how to spot it this week
    tip: text("tip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.areaKey, t.week] })],
);

// Which area's bird each user is hunting this week, and when they found it (by photo ID).
export const birdChallenge = pgTable(
  "bird_challenge",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    areaKey: text("area_key").notNull(),
    foundAt: timestamp("found_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] })],
);

export type Sighting = typeof sighting.$inferSelect;
