import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { organisations, users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";

/**
 * Seed the first organisation + owner user (spec §36 "initial owner creation"). Idempotent — safe to
 * re-run. Credentials come from env so no secret is committed:
 *   SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD (required), SEED_ORG_NAME (optional).
 */
async function main() {
  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@launchflow.local").toLowerCase().trim();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!password) throw new Error("SEED_OWNER_PASSWORD is required to seed the first owner.");

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    console.log(`User ${email} already exists — nothing to do.`);
    process.exit(0);
  }

  const [org] = await db
    .insert(organisations)
    .values({ name: process.env.SEED_ORG_NAME ?? "LaunchFlow" })
    .returning();

  await db.insert(users).values({
    organisationId: org.id,
    email,
    passwordHash: await hashPassword(password),
    firstName: "Owner",
    isOwner: true,
  });

  console.log(`Seeded organisation "${org.name}" + owner ${email}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
