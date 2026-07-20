import nodemailer from "nodemailer";
import { env } from "@/env";
import { logger } from "@/server/logger";

let transport: nodemailer.Transporter | null = null;

/** Is an outbound SMTP relay configured for internal notification emails? */
export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);
}

function getTransport(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transport;
}

/**
 * Send a notification email via the internal SMTP relay. Best-effort: returns false (never throws) if
 * SMTP isn't configured or the send fails, so a notification is never lost just because email is down —
 * the in-app copy is always written regardless.
 */
export async function sendEmailNotification(to: string, subject: string, text: string): Promise<boolean> {
  const t = getTransport();
  if (!t) return false;
  try {
    await t.sendMail({ from: env.SMTP_FROM, to, subject, text });
    return true;
  } catch (err) {
    logger.warn({ err, to }, "notification email failed");
    return false;
  }
}
