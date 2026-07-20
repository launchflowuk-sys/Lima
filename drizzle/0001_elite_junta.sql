CREATE TYPE "public"."knowledge_document_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."knowledge_kind" AS ENUM('fact', 'faq', 'policy', 'service', 'pricing', 'hours', 'note');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source" AS ENUM('manual', 'document', 'faq', 'website', 'imported');--> statement-breakpoint
CREATE TABLE "business_knowledge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"kind" "knowledge_kind" DEFAULT 'fact' NOT NULL,
	"source" "knowledge_source" DEFAULT 'manual' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"body_text" text NOT NULL,
	"intent" "email_intent",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"entry_id" uuid,
	"document_id" uuid,
	"content" text NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"embedding" jsonb,
	"embedding_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source" "knowledge_source" DEFAULT 'document' NOT NULL,
	"mime_type" text,
	"original_filename" text,
	"raw_text" text,
	"status" "knowledge_document_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_knowledge_entries" ADD CONSTRAINT "business_knowledge_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_knowledge_entries" ADD CONSTRAINT "business_knowledge_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_entry_id_business_knowledge_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."business_knowledge_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_knowledge_entries_business_id_idx" ON "business_knowledge_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_knowledge_entries_active_idx" ON "business_knowledge_entries" USING btree ("business_id","is_active");--> statement-breakpoint
CREATE INDEX "email_templates_business_id_idx" ON "email_templates" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_business_id_idx" ON "knowledge_chunks" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_entry_id_idx" ON "knowledge_chunks" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_business_id_idx" ON "knowledge_documents" USING btree ("business_id");