import { z } from "zod";

/**
 * Single source of truth for environment variables. Validated once at startup so a
 * missing/invalid secret fails fast and loudly instead of surfacing as a confusing
 * runtime error deep inside a provider call. Never read process.env directly elsewhere.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Core infra
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  APP_URL: z.string().url(),

  // Auth / crypto
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  // 32-byte key, base64-encoded (openssl rand -base64 32). Used to encrypt OAuth tokens at rest.
  ENCRYPTION_KEY: z.string().min(1),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_CLASSIFICATION: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_REPLY: z.string().default("gpt-4o"),

  // Google / Gmail
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_PUBSUB_TOPIC: z.string().optional(),
  GOOGLE_PUBSUB_VERIFICATION_TOKEN: z.string().optional(),

  // Microsoft / Graph
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().optional(),
  MICROSOFT_WEBHOOK_CLIENT_STATE: z.string().optional(),

  // Storage (attachments / knowledge docs)
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("/data/storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Outbound SMTP for internal notifications (not the same as a business's own mailbox)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get: (_t, key: string) => getEnv()[key as keyof Env],
});
