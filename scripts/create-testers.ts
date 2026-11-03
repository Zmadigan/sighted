/**
 * Creates complimentary Pro tester accounts (tester1@…, tester2@…) for people trying Sighted.
 *
 *   npm run testers            # create tester1–4 (existing ones are left as they are)
 *   npm run testers -- 6       # make sure tester1–6 exist
 *   npm run testers -- 4 --reset-passwords   # also give existing testers new passwords
 *
 * New logins are written to tester-accounts.txt (git-ignored, never committed). Like the demo
 * account, testers get Pro without Stripe, so nothing is ever charged.
 */
import "./load-env";
import { randomBytes, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { account, user } from "../src/db/schema";

const DOMAIN = "sightedwildlife.com";
const FILE = "tester-accounts.txt";
const count = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 4);
const resetPasswords = process.argv.includes("--reset-passwords");

/** Easy to type on a phone: e.g. "fern-otter-4821". */
function newPassword() {
  const words = ["fern", "otter", "heron", "maple", "finch", "cedar", "moss", "trout", "lynx", "wren", "birch", "vole"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  return `${pick()}-${pick()}-${1000 + (randomBytes(2).readUInt16BE(0) % 9000)}`;
}

async function main() {
  const created: string[] = [];
  for (let i = 1; i <= count; i++) {
    const email = `tester${i}@${DOMAIN}`;
    let [row] = await db.select().from(user).where(eq(user.email, email));
    const isNew = !row;
    if (!row) {
      [row] = await db
        .insert(user)
        .values({ id: randomUUID(), email, name: `Tester ${i}`, emailVerified: true, plan: "pro" })
        .returning();
    } else {
      await db.update(user).set({ plan: "pro", updatedAt: new Date() }).where(eq(user.id, row.id));
    }

    if (isNew || resetPasswords) {
      const password = newPassword();
      const hash = await hashPassword(password);
      const [login] = await db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, row.id), eq(account.providerId, "credential")));
      if (login) {
        await db.update(account).set({ password: hash, updatedAt: new Date() }).where(eq(account.id, login.id));
      } else {
        await db.insert(account).values({
          id: randomUUID(),
          accountId: row.id,
          providerId: "credential",
          userId: row.id,
          password: hash,
        });
      }
      created.push(`${email}\t${password}`);
      console.log(`✓ ${email} ${isNew ? "created" : "password reset"} (Pro)`);
    } else {
      console.log(`✓ ${email} already exists (Pro, password unchanged)`);
    }
  }

  if (created.length) {
    if (!existsSync(FILE)) {
      writeFileSync(FILE, "Sighted tester accounts (Pro, free). Log in at https://sightedwildlife.com/login\n\n");
    }
    appendFileSync(FILE, `# Added ${new Date().toISOString().slice(0, 10)}\n${created.join("\n")}\n\n`);
    console.log(`\nLogins saved to ${FILE}`);
  }
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
