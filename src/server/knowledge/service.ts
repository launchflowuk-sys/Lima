import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  businessKnowledgeEntries,
  knowledgeChunks,
  knowledgeDocuments,
  emailTemplates,
} from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { listBusinessesForUser, type Business } from "@/server/businesses/service";
import { recordAudit } from "@/server/audit/log";
import { getAiProvider } from "@/server/ai";
import { logger } from "@/server/logger";
import { chunkText } from "./chunking";
import { rankChunks, assembleContext, type RetrievalChunk } from "./retrieval";

export type KnowledgeEntry = typeof businessKnowledgeEntries.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

const MAX_RETRIEVAL_CHUNKS = 8;

/**
 * Best-effort embedding. Returns one vector per text, or null if no embedding provider is configured
 * (no OPENAI_API_KEY) or the call fails — callers store null and retrieval degrades to keyword scoring.
 */
async function tryEmbed(texts: string[]): Promise<(number[] | null)[]> {
  const provider = getAiProvider();
  if (!provider.embedText || texts.length === 0) return texts.map(() => null);
  try {
    const vectors = await provider.embedText(texts);
    return texts.map((_, i) => vectors[i] ?? null);
  } catch (err) {
    logger.warn({ err }, "knowledge: embedding failed, falling back to keyword retrieval");
    return texts.map(() => null);
  }
}

// ─── Knowledge entries ───────────────────────────────────────────────────────────

export async function listKnowledgeEntries(user: AuthUser, businessId: string): Promise<KnowledgeEntry[]> {
  assertBusinessAccess(user, businessId);
  return db
    .select()
    .from(businessKnowledgeEntries)
    .where(eq(businessKnowledgeEntries.businessId, businessId))
    .orderBy(desc(businessKnowledgeEntries.priority), desc(businessKnowledgeEntries.createdAt));
}

export interface CreateEntryInput {
  businessId: string;
  title: string;
  content: string;
  kind?: KnowledgeEntry["kind"];
  tags?: string[];
  priority?: number;
}

/** Create an approved knowledge fact and its retrievable chunk(s). Requires `knowledge.edit`. */
export async function createKnowledgeEntry(user: AuthUser, input: CreateEntryInput): Promise<KnowledgeEntry> {
  assertBusinessAccess(user, input.businessId);
  assertPermission(user, input.businessId, "knowledge.edit");
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) throw new Error("Title and content are required");

  const [entry] = await db
    .insert(businessKnowledgeEntries)
    .values({
      businessId: input.businessId,
      title,
      content,
      kind: input.kind ?? "fact",
      source: "manual",
      tags: input.tags ?? [],
      priority: input.priority ?? 0,
      createdByUserId: user.id,
    })
    .returning();

  // One entry is usually one chunk; long entries are split. The title is prepended so a fact like
  // "Opening hours" retrieves on the word "hours" even if the body doesn't repeat it.
  const pieces = chunkText(`${title}\n${content}`);
  const embeddings = await tryEmbed(pieces);
  await db.insert(knowledgeChunks).values(
    pieces.map((piece, i) => ({
      businessId: input.businessId,
      entryId: entry.id,
      content: piece,
      chunkIndex: i,
      priority: entry.priority,
      embedding: embeddings[i],
      embeddingModel: embeddings[i] ? "openai" : null,
    })),
  );

  await recordAudit({
    businessId: input.businessId,
    actorUserId: user.id,
    action: "knowledge.entry.created",
    entityType: "knowledge_entry",
    entityId: entry.id,
    metadata: { title, kind: entry.kind },
  });
  return entry;
}

export interface UpdateEntryInput {
  title?: string;
  content?: string;
  kind?: KnowledgeEntry["kind"];
  tags?: string[];
  priority?: number;
  isActive?: boolean;
}

/** Update an entry; if its text changed, its chunks are regenerated (and re-embedded). */
export async function updateKnowledgeEntry(user: AuthUser, entryId: string, patch: UpdateEntryInput): Promise<KnowledgeEntry> {
  const [existing] = await db.select().from(businessKnowledgeEntries).where(eq(businessKnowledgeEntries.id, entryId)).limit(1);
  if (!existing) throw new Error("Knowledge entry not found");
  assertBusinessAccess(user, existing.businessId);
  assertPermission(user, existing.businessId, "knowledge.edit");

  const nextTitle = patch.title?.trim() ?? existing.title;
  const nextContent = patch.content?.trim() ?? existing.content;
  const nextPriority = patch.priority ?? existing.priority;
  const textChanged = nextTitle !== existing.title || nextContent !== existing.content;

  const [entry] = await db
    .update(businessKnowledgeEntries)
    .set({
      title: nextTitle,
      content: nextContent,
      kind: patch.kind ?? existing.kind,
      tags: patch.tags ?? existing.tags,
      priority: nextPriority,
      isActive: patch.isActive ?? existing.isActive,
    })
    .where(eq(businessKnowledgeEntries.id, entryId))
    .returning();

  if (textChanged || nextPriority !== existing.priority) {
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.entryId, entryId));
    const pieces = chunkText(`${nextTitle}\n${nextContent}`);
    const embeddings = await tryEmbed(pieces);
    await db.insert(knowledgeChunks).values(
      pieces.map((piece, i) => ({
        businessId: entry.businessId,
        entryId: entry.id,
        content: piece,
        chunkIndex: i,
        priority: entry.priority,
        embedding: embeddings[i],
        embeddingModel: embeddings[i] ? "openai" : null,
      })),
    );
  }

  await recordAudit({
    businessId: entry.businessId,
    actorUserId: user.id,
    action: "knowledge.entry.updated",
    entityType: "knowledge_entry",
    entityId: entry.id,
    metadata: { title: entry.title },
  });
  return entry;
}

/** Delete an entry (chunks cascade). Requires `knowledge.edit`. */
export async function deleteKnowledgeEntry(user: AuthUser, entryId: string): Promise<void> {
  const [existing] = await db.select().from(businessKnowledgeEntries).where(eq(businessKnowledgeEntries.id, entryId)).limit(1);
  if (!existing) return;
  assertBusinessAccess(user, existing.businessId);
  assertPermission(user, existing.businessId, "knowledge.edit");
  await db.delete(businessKnowledgeEntries).where(eq(businessKnowledgeEntries.id, entryId));
  await recordAudit({
    businessId: existing.businessId,
    actorUserId: user.id,
    action: "knowledge.entry.deleted",
    entityType: "knowledge_entry",
    entityId: entryId,
    metadata: { title: existing.title },
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────────

export interface AddDocumentInput {
  businessId: string;
  title: string;
  rawText: string;
  mimeType?: string;
  originalFilename?: string;
}

/** Store a document, chunk its text, and create retrievable chunks. Requires `knowledge.edit`. */
export async function addKnowledgeDocument(user: AuthUser, input: AddDocumentInput): Promise<KnowledgeDocument> {
  assertBusinessAccess(user, input.businessId);
  assertPermission(user, input.businessId, "knowledge.edit");
  const title = input.title.trim();
  const rawText = input.rawText.trim();
  if (!title || !rawText) throw new Error("Title and document text are required");

  const [doc] = await db
    .insert(knowledgeDocuments)
    .values({
      businessId: input.businessId,
      title,
      source: "document",
      mimeType: input.mimeType ?? "text/plain",
      originalFilename: input.originalFilename ?? null,
      rawText,
      status: "processing",
      createdByUserId: user.id,
    })
    .returning();

  try {
    const pieces = chunkText(rawText);
    const embeddings = await tryEmbed(pieces);
    if (pieces.length) {
      await db.insert(knowledgeChunks).values(
        pieces.map((piece, i) => ({
          businessId: input.businessId,
          documentId: doc.id,
          content: piece,
          chunkIndex: i,
          embedding: embeddings[i],
          embeddingModel: embeddings[i] ? "openai" : null,
        })),
      );
    }
    await db.update(knowledgeDocuments).set({ status: "ready" }).where(eq(knowledgeDocuments.id, doc.id));
  } catch (err) {
    logger.error({ err, documentId: doc.id }, "knowledge: document chunking failed");
    await db
      .update(knowledgeDocuments)
      .set({ status: "failed", processingError: err instanceof Error ? err.message : "unknown error" })
      .where(eq(knowledgeDocuments.id, doc.id));
  }

  await recordAudit({
    businessId: input.businessId,
    actorUserId: user.id,
    action: "knowledge.document.added",
    entityType: "knowledge_document",
    entityId: doc.id,
    metadata: { title },
  });
  return (await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, doc.id)).limit(1))[0];
}

export async function listKnowledgeDocuments(user: AuthUser, businessId: string): Promise<KnowledgeDocument[]> {
  assertBusinessAccess(user, businessId);
  return db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.businessId, businessId))
    .orderBy(desc(knowledgeDocuments.createdAt));
}

// ─── Templates ─────────────────────────────────────────────────────────────────────

export async function listEmailTemplates(user: AuthUser, businessId: string): Promise<EmailTemplate[]> {
  assertBusinessAccess(user, businessId);
  return db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.businessId, businessId), eq(emailTemplates.isActive, true)))
    .orderBy(desc(emailTemplates.createdAt));
}

/**
 * Everything the /knowledge page needs, tenant-scoped in one place: the businesses the user can see
 * plus their knowledge entries and documents. Never returns another tenant's rows.
 */
export async function listKnowledgeOverview(user: AuthUser): Promise<{
  businesses: Business[];
  entries: KnowledgeEntry[];
  documents: KnowledgeDocument[];
}> {
  const businesses = await listBusinessesForUser(user);
  const ids = businesses.map((b) => b.id);
  if (ids.length === 0) return { businesses, entries: [], documents: [] };
  const [entries, documents] = await Promise.all([
    db
      .select()
      .from(businessKnowledgeEntries)
      .where(inArray(businessKnowledgeEntries.businessId, ids))
      .orderBy(desc(businessKnowledgeEntries.priority), desc(businessKnowledgeEntries.createdAt)),
    db
      .select()
      .from(knowledgeDocuments)
      .where(inArray(knowledgeDocuments.businessId, ids))
      .orderBy(desc(knowledgeDocuments.createdAt)),
  ]);
  return { businesses, entries, documents };
}

// ─── Retrieval ───────────────────────────────────────────────────────────────────

export interface RetrievedContext {
  context: string;
  usedChunkIds: string[];
}

/**
 * Build the approved-facts context string for a reply/classification. Loads ONLY this business's
 * chunks (tenant isolation is the whole point), ranks them against the thread text, and assembles a
 * bounded context. Embeds the query when a provider is available; otherwise keyword-only. Returns the
 * chunk ids used so the caller can record them on the draft (spec §14 "which facts fed this reply").
 */
export async function retrieveBusinessContext(
  businessId: string,
  queryText: string,
  opts: { limit?: number } = {},
): Promise<RetrievedContext> {
  const rows = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      priority: knowledgeChunks.priority,
      embedding: knowledgeChunks.embedding,
      entryId: knowledgeChunks.entryId,
    })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.businessId, businessId));
  if (rows.length === 0) return { context: "", usedChunkIds: [] };

  // Drop chunks whose parent entry is inactive (document chunks have no entry and always stay).
  const entryIds = [...new Set(rows.map((r) => r.entryId).filter((id): id is string => !!id))];
  const inactive = new Set<string>();
  if (entryIds.length) {
    const entries = await db
      .select({ id: businessKnowledgeEntries.id, isActive: businessKnowledgeEntries.isActive })
      .from(businessKnowledgeEntries)
      .where(inArray(businessKnowledgeEntries.id, entryIds));
    for (const e of entries) if (!e.isActive) inactive.add(e.id);
  }

  const candidates: RetrievalChunk[] = rows
    .filter((r) => !(r.entryId && inactive.has(r.entryId)))
    .map((r) => ({ id: r.id, content: r.content, priority: r.priority, embedding: r.embedding }));

  const [queryEmbedding] = await tryEmbed([queryText]);
  const ranked = rankChunks(queryText, candidates, {
    limit: opts.limit ?? MAX_RETRIEVAL_CHUNKS,
    queryEmbedding,
  });
  const { context, usedIds } = assembleContext(ranked);
  return { context, usedChunkIds: usedIds };
}
