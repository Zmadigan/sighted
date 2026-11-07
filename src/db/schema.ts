import {
  bigint,
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

// Better Auth's rate limits (stored in the database so every Vercel server shares them)
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
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

// Pending friend requests from search ("from" asked to be friends with "to").
export const friendRequest = pgTable(
  "friend_request",
  {
    fromId: text("from_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toId: text("to_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fromId, t.toId] }), index("friend_request_to_idx").on(t.toId)],
);

// Pro "goals": e.g. see 50 species this year, or 10 bird species this month.
export const goal = pgTable(
  "goal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // null = any category
    category: text("category"),
    // "month" or "year"
    period: text("period").notNull(),
    target: integer("target").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("goal_user_idx").on(t.userId)],
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

// Comments on sightings, from the owner and their friends.
export const comment = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sightingId: uuid("sighting_id")
      .notNull()
      .references(() => sighting.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comment_sighting_idx").on(t.sightingId, t.createdAt)],
);

// The bell: things friends did that involve you.
export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Who gets the notification
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Who did the thing
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // reaction | comment | friend_request | friend_accepted
    type: text("type").notNull(),
    sightingId: uuid("sighting_id").references(() => sighting.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comment.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.createdAt)],
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

// Free AI identifications per internet connection per month (IP is hashed, never stored raw),
// so making lots of free accounts doesn't mean lots of free IDs.
export const networkUsage = pgTable(
  "network_usage",
  {
    ipHash: text("ip_hash").notNull(),
    month: text("month").notNull(),
    identifications: integer("identifications").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.ipHash, t.month] })],
);

// "blocker" blocked "blocked": they're unfriended, can't find or friend each other, and never see
// each other's comments or notifications.
export const userBlock = pgTable(
  "user_block",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("user_block_blocked_idx").on(t.blockedId)],
);

// Reports of posts, comments or people, reviewed on /admin/reports.
export const report = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The person whose content (or profile) was reported
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // post | comment | user
    kind: text("kind").notNull(),
    sightingId: uuid("sighting_id").references(() => sighting.id, { onDelete: "set null" }),
    commentId: uuid("comment_id").references(() => comment.id, { onDelete: "set null" }),
    // spam | harassment | inappropriate | misleading | other
    reason: text("reason").notNull(),
    details: text("details"),
    // A copy of what was reported (comment text or animal name), kept even if it's deleted later
    snapshot: text("snapshot"),
    // open | removed | dismissed
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [
    index("report_status_idx").on(t.status, t.createdAt),
    index("report_reporter_idx").on(t.reporterId),
  ],
);

export type Sighting = typeof sighting.$inferSelect;
