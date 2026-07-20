/**
 * Central Drizzle schema barrel. Import tables from "@/server/db/client" (which re-exports this)
 * or from here directly. Every tenant-owned table carries a business_id and is indexed on it.
 *
 * Milestone-1 schema. Remaining spec §10 domains (knowledge, automation, follow-ups, contacts,
 * data-retention) are added in their own phases — see BUILD_PROGRESS.md.
 */
export * from "./_shared";
export * from "./tenancy";
export * from "./mailboxes";
export * from "./email";
export * from "./ai";
export * from "./knowledge";
export * from "./automation";
export * from "./governance";
