import { pgTable, uuid, text, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import {
  timestamps,
  knowledgeSourceEnum,
  knowledgeKindEnum,
  knowledgeDocumentStatusEnum,
  intentEnum,
} from "./_shared";
import { businesses, users } from "./tenancy";

/**
 * An approved business fact — the ONLY facts the AI is allowed to rely on when drafting a reply
 * (spec §12/§14). Everything here is human-vouched. `priority` lets core facts (hours, key services)
 * always make it into context; `kind` lets retrieval weight a pricing fact above a stray note.
 * Tenant-scoped: every row carries business_id and retrieval never crosses businesses.
 */
export const businessKnowledgeEntries = pgTable(
  "business_knowledge_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    kind: knowledgeKindEnum("kind").notNull().default("fact"),
    source: knowledgeSourceEnum("source").notNull().default("manual"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    // Higher = more likely to always be included in context. 0 = normal.
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("business_knowledge_entries_business_id_idx").on(t.businessId),
    index("business_knowledge_entries_active_idx").on(t.businessId, t.isActive),
  ],
);

/** An uploaded/pasted source document. Its text is split into knowledge_chunks for retrieval. */
export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    source: knowledgeSourceEnum("source").notNull().default("document"),
    mimeType: text("mime_type"),
    originalFilename: text("original_filename"),
    // The extracted plain text of the document (kept so it can be re-chunked if strategy changes).
    rawText: text("raw_text"),
    status: knowledgeDocumentStatusEnum("status").notNull().default("pending"),
    processingError: text("processing_error"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("knowledge_documents_business_id_idx").on(t.businessId)],
);

/**
 * A retrievable unit of knowledge. Both a manual entry and a document chunk end up here, so retrieval
 * queries ONE table. `embedding` is an optional vector (stored as a JSON float array so we need no
 * pgvector extension); when absent, retrieval falls back to deterministic keyword scoring.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => businessKnowledgeEntries.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    priority: integer("priority").notNull().default(0),
    embedding: jsonb("embedding").$type<number[]>(),
    embeddingModel: text("embedding_model"),
    ...timestamps,
  },
  (t) => [
    index("knowledge_chunks_business_id_idx").on(t.businessId),
    index("knowledge_chunks_entry_id_idx").on(t.entryId),
    index("knowledge_chunks_document_id_idx").on(t.documentId),
  ],
);

/**
 * A reusable reply template the AI or a human can start from (spec §12). Optionally tied to an
 * intent so it can be suggested automatically. Business-scoped like everything else.
 */
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject"),
    bodyText: text("body_text").notNull(),
    intent: intentEnum("intent"),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("email_templates_business_id_idx").on(t.businessId)],
);
