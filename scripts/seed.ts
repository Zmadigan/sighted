/**
 * Creates (or refreshes) the demo account with ~20 sample sightings.
 *
 *   npm run seed
 *
 * Safe to run any number of times: the demo user, its login and every sample
 * sighting are matched by a fixed key and updated in place, never duplicated.
 * Sightings you add yourself while logged in as the demo user are left alone.
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { account, sighting, user } from "../src/db/schema";
import type { Category } from "../src/lib/categories";

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "password123!";

type Sample = {
  key: string;
  commonName: string;
  scientificName: string;
  category: Category;
  daysAgo: number;
  lat: number;
  lng: number;
  place: string;
  notes: string;
  funFacts: string[];
};

const samples: Sample[] = [
  {
    key: "northern-cardinal-central-park",
    commonName: "Northern Cardinal",
    scientificName: "Cardinalis cardinalis",
    category: "bird",
    daysAgo: 9,
    lat: 40.7794,
    lng: -73.9632,
    place: "Central Park, New York, NY",
    notes: "Bright red male singing from the top of a hawthorn near the Ramble.",
    funFacts: [
      "Female cardinals sing too, often from the nest to tell the male she needs food.",
      "Cardinals don't migrate, so they brighten up snowy backyards all winter.",
    ],
  },
  {
    key: "white-tailed-deer-harriman",
    commonName: "White-tailed Deer",
    scientificName: "Odocoileus virginianus",
    category: "mammal",
    daysAgo: 23,
    lat: 41.2332,
    lng: -74.0848,
    place: "Harriman State Park, NY",
    notes: "Doe and two fawns crossing the trail at dusk. They flashed their white tails as they ran.",
    funFacts: [
      "A white-tailed deer can sprint up to 30 miles per hour and leap 10 feet high.",
      "Fawns are born nearly scentless, which helps hide them from predators.",
    ],
  },
  {
    key: "monarch-cape-may",
    commonName: "Monarch Butterfly",
    scientificName: "Danaus plexippus",
    category: "insect",
    daysAgo: 48,
    lat: 38.9329,
    lng: -74.9604,
    place: "Cape May Point, NJ",
    notes: "Dozens resting on seaside goldenrod during fall migration!",
    funFacts: [
      "Fall monarchs can fly nearly 3,000 miles to their winter home in Mexico.",
      "Milkweed toxins stored from their caterpillar days make monarchs taste bad to birds.",
    ],
  },
  {
    key: "great-blue-heron-cape-may",
    commonName: "Great Blue Heron",
    scientificName: "Ardea herodias",
    category: "bird",
    daysAgo: 49,
    lat: 38.9467,
    lng: -74.9152,
    place: "Cape May Meadows, NJ",
    notes: "Stood perfectly still in the marsh for 10 minutes, then caught a fish in one strike.",
    funFacts: [
      "Great blue herons stand over 4 feet tall but weigh only about 5 pounds.",
      "Special neck vertebrae let them strike at prey in a split second.",
    ],
  },
  {
    key: "black-and-yellow-argiope-hammonasset",
    commonName: "Black-and-yellow Garden Spider",
    scientificName: "Argiope aurantia",
    category: "other",
    daysAgo: 62,
    lat: 41.2626,
    lng: -72.5523,
    place: "Hammonasset Beach State Park, CT",
    notes: "Huge web with the zig-zag stripe down the middle, strung between tall grasses.",
    funFacts: [
      "The zig-zag silk in its web is called a stabilimentum.",
      "Many garden spiders eat their web each night and spin a fresh one.",
    ],
  },
  {
    key: "eastern-painted-turtle-great-swamp",
    commonName: "Eastern Painted Turtle",
    scientificName: "Chrysemys picta picta",
    category: "reptile_amphibian",
    daysAgo: 71,
    lat: 40.7062,
    lng: -74.4795,
    place: "Great Swamp National Wildlife Refuge, NJ",
    notes: "Five of them stacked on a log, basking in the sun.",
    funFacts: [
      "Painted turtles can survive months underwater in winter by absorbing oxygen through their skin.",
      "Hatchlings sometimes spend their first winter frozen in the nest and thaw out in spring.",
    ],
  },
  {
    key: "striped-bass-montauk",
    commonName: "Striped Bass",
    scientificName: "Morone saxatilis",
    category: "fish",
    daysAgo: 84,
    lat: 41.0709,
    lng: -71.8571,
    place: "Montauk Point, NY",
    notes: "Caught and released from the rocks below the lighthouse. About 28 inches.",
    funFacts: [
      "Striped bass live in the ocean but swim up rivers to spawn in fresh water.",
      "Some striped bass can live for 30 years.",
    ],
  },
  {
    key: "bald-eagle-quabbin",
    commonName: "Bald Eagle",
    scientificName: "Haliaeetus leucocephalus",
    category: "bird",
    daysAgo: 97,
    lat: 42.3626,
    lng: -72.2906,
    place: "Quabbin Reservoir, MA",
    notes: "Adult soaring over the water, then landed in a tall white pine.",
    funFacts: [
      "Bald eagle nests can weigh more than a ton after years of additions.",
      "Bald eagles don't get their white heads until they're about 5 years old.",
    ],
  },
  {
    key: "american-bullfrog-water-gap",
    commonName: "American Bullfrog",
    scientificName: "Lithobates catesbeianus",
    category: "reptile_amphibian",
    daysAgo: 112,
    lat: 41.0326,
    lng: -75.1323,
    place: "Delaware Water Gap, PA",
    notes: "Heard the deep 'jug-o-rum' calls long before we spotted this big one at the pond edge.",
    funFacts: [
      "A bullfrog's call can be heard more than half a mile away.",
      "Bullfrogs will eat almost anything they can fit in their mouths — even other frogs.",
    ],
  },
  {
    key: "moose-baxter",
    commonName: "Moose",
    scientificName: "Alces alces",
    category: "mammal",
    daysAgo: 124,
    lat: 45.9046,
    lng: -68.9216,
    place: "Baxter State Park, ME",
    notes: "Cow moose feeding in Sandy Stream Pond at sunrise. Unforgettable!",
    funFacts: [
      "Moose are excellent swimmers and can dive up to 20 feet for water plants.",
      "A bull moose's antlers can grow almost an inch a day in summer.",
    ],
  },
  {
    key: "common-eastern-firefly-longwood",
    commonName: "Common Eastern Firefly",
    scientificName: "Photinus pyralis",
    category: "insect",
    daysAgo: 138,
    lat: 39.8712,
    lng: -75.6741,
    place: "Longwood Gardens, Kennett Square, PA",
    notes: "The meadow was full of blinking lights after sunset.",
    funFacts: [
      "Fireflies make 'cold light' — almost none of the energy is lost as heat.",
      "Each firefly species has its own flash pattern to find a mate.",
    ],
  },
  {
    key: "brook-trout-beaverkill",
    commonName: "Brook Trout",
    scientificName: "Salvelinus fontinalis",
    category: "fish",
    daysAgo: 146,
    lat: 41.9787,
    lng: -74.8366,
    place: "Beaverkill River, Catskills, NY",
    notes: "Beautiful red spots with blue halos. Released it right away.",
    funFacts: [
      "Brook trout need cold, clean water, so they're a sign of a healthy stream.",
      "Despite the name, brook trout are actually a kind of char.",
    ],
  },
  {
    key: "atlantic-puffin-bar-harbor",
    commonName: "Atlantic Puffin",
    scientificName: "Fratercula arctica",
    category: "bird",
    daysAgo: 152,
    lat: 44.3876,
    lng: -68.2039,
    place: "Puffin boat tour from Bar Harbor, ME",
    notes: "Saw them carrying beaks full of tiny fish back to their burrows.",
    funFacts: [
      "A puffin can carry more than 10 small fish in its beak at once.",
      "Puffins flap their wings up to 400 times a minute.",
    ],
  },
  {
    key: "black-bear-white-mountains",
    commonName: "American Black Bear",
    scientificName: "Ursus americanus",
    category: "mammal",
    daysAgo: 168,
    lat: 44.0446,
    lng: -71.4419,
    place: "Kancamagus Highway, White Mountains, NH",
    notes: "Young bear eating berries by the roadside. Watched from the car.",
    funFacts: [
      "Black bears aren't always black — they can be brown, cinnamon or even white.",
      "A black bear's sense of smell is about seven times better than a bloodhound's.",
    ],
  },
  {
    key: "horseshoe-crab-reeds-beach",
    commonName: "Atlantic Horseshoe Crab",
    scientificName: "Limulus polyphemus",
    category: "other",
    daysAgo: 176,
    lat: 39.1176,
    lng: -74.8935,
    place: "Reeds Beach, Delaware Bay, NJ",
    notes: "Spawning night on the full moon — hundreds along the tide line.",
    funFacts: [
      "Horseshoe crabs are more closely related to spiders than to true crabs.",
      "Their blue blood is used to test medicines and vaccines for safety.",
    ],
  },
  {
    key: "red-fox-cape-cod",
    commonName: "Red Fox",
    scientificName: "Vulpes vulpes",
    category: "mammal",
    daysAgo: 198,
    lat: 41.8898,
    lng: -69.9965,
    place: "Cape Cod National Seashore, MA",
    notes: "Hunting mice in the dunes — did the famous high pounce!",
    funFacts: [
      "Red foxes may use Earth's magnetic field to aim their pounces.",
      "A red fox's bushy tail helps it balance and keeps it warm while sleeping.",
    ],
  },
  {
    key: "spotted-salamander-berkshires",
    commonName: "Spotted Salamander",
    scientificName: "Ambystoma maculatum",
    category: "reptile_amphibian",
    daysAgo: 214,
    lat: 42.4501,
    lng: -73.2454,
    place: "Pleasant Valley Sanctuary, Berkshires, MA",
    notes: "Big night migration in the rain! Helped several cross the road to the vernal pool.",
    funFacts: [
      "Spotted salamanders can live for more than 20 years.",
      "Algae live inside their eggs and help provide oxygen to the embryos.",
    ],
  },
  {
    key: "snowy-owl-plum-island",
    commonName: "Snowy Owl",
    scientificName: "Bubo scandiacus",
    category: "bird",
    daysAgo: 262,
    lat: 42.7543,
    lng: -70.8037,
    place: "Parker River NWR, Plum Island, MA",
    notes: "Perched on a dune. Kept a respectful distance with the binoculars.",
    funFacts: [
      "Unlike most owls, snowy owls hunt during the day in the Arctic summer.",
      "A single snowy owl may eat more than 1,600 lemmings a year.",
    ],
  },
  {
    key: "northern-cardinal-philadelphia",
    commonName: "Northern Cardinal",
    scientificName: "Cardinalis cardinalis",
    category: "bird",
    daysAgo: 291,
    lat: 40.0573,
    lng: -75.2263,
    place: "Wissahickon Valley Park, Philadelphia, PA",
    notes: "My very first cardinal of the journal — a female at the feeder.",
    funFacts: [
      "Cardinals were named after the red robes worn by Catholic cardinals.",
    ],
  },
  {
    key: "harbor-seal-chatham",
    commonName: "Harbor Seal",
    scientificName: "Phoca vitulina",
    category: "mammal",
    daysAgo: 318,
    lat: 41.6721,
    lng: -69.9598,
    place: "Chatham, MA",
    notes: "Several hauled out on a sandbar, curled up like bananas.",
    funFacts: [
      "Harbor seals can stay underwater for up to 30 minutes.",
      "Each harbor seal has a unique pattern of spots.",
    ],
  },
  {
    key: "black-capped-chickadee-burlington",
    commonName: "Black-capped Chickadee",
    scientificName: "Poecile atricapillus",
    category: "bird",
    daysAgo: 341,
    lat: 44.4759,
    lng: -73.2121,
    place: "Burlington, VT",
    notes: "Brave little flock on a snowy morning. One landed on my hand for sunflower seeds!",
    funFacts: [
      "Chickadees hide thousands of seeds each fall and remember where they put them.",
      "More 'dee' notes in a chickadee's call means a more dangerous predator is near.",
    ],
  },
];

function daysAgoDate(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`🌱 Seeding demo account into database at ${host}`);

  // 1. Demo user (create once, then keep it as Pro and verified)
  let [demo] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL));
  if (!demo) {
    [demo] = await db
      .insert(user)
      .values({ id: randomUUID(), email: DEMO_EMAIL, name: "Demo Naturalist", emailVerified: true, plan: "pro" })
      .returning();
    console.log("  ✓ Created demo user");
  } else {
    await db
      .update(user)
      .set({ plan: "pro", emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, demo.id));
    console.log("  ✓ Demo user already exists — set to Pro");
  }

  // 2. Email + password login (Better Auth stores it as a "credential" account)
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [existingLogin] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, demo.id), eq(account.providerId, "credential")));
  if (existingLogin) {
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(account.id, existingLogin.id));
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: demo.id,
      providerId: "credential",
      userId: demo.id,
      password: passwordHash,
    });
  }
  console.log("  ✓ Password set");

  // 3. Sample sightings, upserted by their fixed seed key
  for (const s of samples) {
    const values = {
      userId: demo.id,
      seedKey: s.key,
      commonName: s.commonName,
      scientificName: s.scientificName,
      category: s.category,
      confidence: "high" as const,
      funFacts: s.funFacts,
      observedOn: daysAgoDate(s.daysAgo),
      latitude: s.lat,
      longitude: s.lng,
      notes: `${s.notes}\n\n📍 ${s.place}`,
    };
    await db
      .insert(sighting)
      .values(values)
      .onConflictDoUpdate({
        target: [sighting.userId, sighting.seedKey],
        set: { ...values, updatedAt: new Date() },
      });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sighting)
    .where(eq(sighting.userId, demo.id));
  console.log(`  ✓ ${samples.length} sample sightings in place (${count} total for the demo user)`);
  console.log(`\nDone! Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
