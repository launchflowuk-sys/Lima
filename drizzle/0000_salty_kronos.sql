CREATE TYPE "public"."autonomy_mode" AS ENUM('draft_only', 'controlled_auto_send', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending_approval', 'approved', 'rejected', 'sent', 'send_failed', 'auto_sent');--> statement-breakpoint
CREATE TYPE "public"."email_intent" AS ENUM('general_enquiry', 'booking_enquiry', 'quote_request', 'pricing_question', 'complaint', 'refund_request', 'payment_issue', 'invoice_request', 'document_request', 'supplier_communication', 'contract', 'job_application', 'spam', 'newsletter', 'internal_email', 'follow_up', 'cancellation', 'rescheduling', 'technical_support', 'account_access', 'other');--> statement-breakpoint
CREATE TYPE "public"."mailbox_provider" AS ENUM('gmail', 'microsoft', 'imap_smtp');--> statement-breakpoint
CREATE TYPE "public"."mailbox_status" AS ENUM('connected', 'disconnected', 'error', 'reauth_required');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."email_risk" AS ENUM('low', 'medium', 'high', 'prohibited_auto_send');--> statement-breakpoint
CREATE TYPE "public"."email_sentiment" AS ENUM('positive', 'neutral', 'confused', 'frustrated', 'angry', 'threatening');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('needs_reply', 'awaiting_approval', 'draft_prepared', 'auto_replied', 'waiting_customer', 'waiting_internal', 'escalated', 'closed', 'no_reply_required');--> statement-breakpoint
CREATE TYPE "public"."email_urgency" AS ENUM('low', 'normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'manager', 'agent', 'read_only');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"reply_tone" text,
	"email_signature" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_org_slug_unique" UNIQUE("organisation_id","slug")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'read_only' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_business_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'read_only' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_business_unique" UNIQUE("user_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text,
	"last_name" text,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "mailbox_health_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"provider_subscription_id" text,
	"client_state" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_sync_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"cursor" text,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailbox_sync_states_mailbox_unique" UNIQUE("mailbox_id")
);
--> statement-breakpoint
CREATE TABLE "mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"provider" "mailbox_provider" NOT NULL,
	"email_address" text NOT NULL,
	"display_name" text,
	"status" "mailbox_status" DEFAULT 'disconnected' NOT NULL,
	"autonomy_mode" "autonomy_mode" DEFAULT 'draft_only' NOT NULL,
	"oauth_access_token_enc" text,
	"oauth_refresh_token_enc" text,
	"oauth_expires_at" timestamp with time zone,
	"oauth_scope" text,
	"imap_host" text,
	"imap_port" integer,
	"imap_secure" boolean DEFAULT true,
	"imap_username" text,
	"imap_password_enc" text,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_secure" boolean DEFAULT true,
	"smtp_username" text,
	"smtp_password_enc" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailboxes_business_email_unique" UNIQUE("business_id","email_address")
);
--> statement-breakpoint
CREATE TABLE "email_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"filename" text,
	"content_type" text,
	"size_bytes" integer,
	"storage_key" text,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"block_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"provider_message_id" text NOT NULL,
	"direction" "message_direction" NOT NULL,
	"from_address" text,
	"from_name" text,
	"subject" text,
	"body_text" text,
	"body_html_sanitized" text,
	"snippet" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_messages_provider_unique" UNIQUE("mailbox_id","provider_message_id")
);
--> statement-breakpoint
CREATE TABLE "email_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"role" text NOT NULL,
	"address" text NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"provider_thread_id" text NOT NULL,
	"subject" text,
	"status" "thread_status" DEFAULT 'needs_reply' NOT NULL,
	"assigned_user_id" uuid,
	"last_message_at" timestamp with time zone,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_threads_provider_unique" UNIQUE("mailbox_id","provider_thread_id")
);
--> statement-breakpoint
CREATE TABLE "thread_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"estimated_cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"intent" "email_intent" NOT NULL,
	"secondary_intent" "email_intent",
	"urgency" "email_urgency" NOT NULL,
	"sentiment" "email_sentiment" NOT NULL,
	"risk_level" "email_risk" NOT NULL,
	"reply_required" boolean DEFAULT true NOT NULL,
	"auto_send_eligible" boolean DEFAULT false NOT NULL,
	"confidence" numeric(4, 3),
	"extracted_entities" jsonb,
	"missing_information" jsonb,
	"recommended_action" text,
	"escalation_reason" text,
	"model_used" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"in_reply_to_message_id" uuid,
	"status" "draft_status" DEFAULT 'pending_approval' NOT NULL,
	"subject" text,
	"body_text" text NOT NULL,
	"auto_send_eligible" boolean DEFAULT false NOT NULL,
	"auto_send_blocked_reason" text,
	"knowledge_used" jsonb,
	"approved_by_user_id" uuid,
	"sent_provider_message_id" text,
	"send_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"body_text" text NOT NULL,
	"edited_by_user_id" uuid,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"actor_user_id" uuid,
	"actor_type" text DEFAULT 'user' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"address" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"kind" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"address" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business_access" ADD CONSTRAINT "user_business_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business_access" ADD CONSTRAINT "user_business_access_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_health_events" ADD CONSTRAINT "mailbox_health_events_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_subscriptions" ADD CONSTRAINT "mailbox_subscriptions_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_sync_states" ADD CONSTRAINT "mailbox_sync_states_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_participants" ADD CONSTRAINT "email_participants_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_internal_notes" ADD CONSTRAINT "thread_internal_notes_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_internal_notes" ADD CONSTRAINT "thread_internal_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_classifications" ADD CONSTRAINT "email_classifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_classifications" ADD CONSTRAINT "email_classifications_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_in_reply_to_message_id_email_messages_id_fk" FOREIGN KEY ("in_reply_to_message_id") REFERENCES "public"."email_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_versions" ADD CONSTRAINT "reply_versions_draft_id_reply_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."reply_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_versions" ADD CONSTRAINT "reply_versions_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_senders" ADD CONSTRAINT "blocked_senders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "businesses_organisation_id_idx" ON "businesses" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "invitations_organisation_id_idx" ON "invitations" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_business_access_business_id_idx" ON "user_business_access" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "user_business_access_user_id_idx" ON "user_business_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_organisation_id_idx" ON "users" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "mailbox_health_events_mailbox_id_idx" ON "mailbox_health_events" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "mailbox_subscriptions_mailbox_id_idx" ON "mailbox_subscriptions" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "mailboxes_business_id_idx" ON "mailboxes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "mailboxes_provider_idx" ON "mailboxes" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "email_attachments_message_id_idx" ON "email_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "email_messages_business_id_idx" ON "email_messages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "email_messages_thread_id_idx" ON "email_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "email_participants_message_id_idx" ON "email_participants" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "email_participants_address_idx" ON "email_participants" USING btree ("address");--> statement-breakpoint
CREATE INDEX "email_threads_business_id_idx" ON "email_threads" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "email_threads_mailbox_id_idx" ON "email_threads" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "email_threads_status_idx" ON "email_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_threads_last_message_at_idx" ON "email_threads" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "thread_internal_notes_thread_id_idx" ON "thread_internal_notes" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "ai_usage_records_business_id_idx" ON "ai_usage_records" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "email_classifications_business_id_idx" ON "email_classifications" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "email_classifications_message_id_idx" ON "email_classifications" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "reply_drafts_business_id_idx" ON "reply_drafts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "reply_drafts_thread_id_idx" ON "reply_drafts" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "reply_drafts_status_idx" ON "reply_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reply_versions_draft_id_idx" ON "reply_versions" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "audit_logs_business_id_idx" ON "audit_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blocked_senders_business_id_idx" ON "blocked_senders" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "security_events_business_id_idx" ON "security_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "security_events_kind_idx" ON "security_events" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "suppression_list_business_id_idx" ON "suppression_list" USING btree ("business_id");