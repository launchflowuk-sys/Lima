import { it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  describeIntegration,
  createOrganisation,
  createUser,
  createBusiness,
  authUserFor,
} from "./harness";
import { db } from "@/server/db/client";
import { mailboxes, mailboxHealthEvents, auditLogs } from "@/server/db/schema";
import { decryptSecret } from "@/server/security/encryption";
import { connectImapSmtpMailbox } from "@/server/mailboxes/service";

// Stub the provider so no real SMTP/IMAP connection is attempted. This is the only external I/O in
// the connect path; everything else (encryption, persistence, audit) is exercised for real.
const verifyConnection = vi.hoisted(() => vi.fn());
vi.mock("@/server/email/providers/registry", () => ({
  getProvider: () => ({ verifyConnection }),
}));

const PLAINTEXT_IMAP_PW = "imap-secret-pw";
const PLAINTEXT_SMTP_PW = "smtp-secret-pw";

function connectInput(businessId: string) {
  return {
    businessId,
    emailAddress: "Support@Example.com",
    displayName: "Support",
    imapHost: "imap.example.com",
    imapPort: 993,
    imapSecure: true,
    imapUsername: "imap-user",
    imapPassword: PLAINTEXT_IMAP_PW,
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "smtp-user",
    smtpPassword: PLAINTEXT_SMTP_PW,
  };
}

describeIntegration("connect IMAP/SMTP mailbox", () => {
  beforeEach(() => {
    verifyConnection.mockReset();
  });

  it("stores credentials encrypted and records status + health + audit on success", async () => {
    verifyConnection.mockResolvedValue(undefined);
    const org = await createOrganisation();
    const business = await createBusiness(org.id);
    const owner = await authUserFor((await createUser({ organisationId: org.id, isOwner: true })).id);

    // Act
    const result = await connectImapSmtpMailbox(owner, connectInput(business.id));

    // Assert: provider was verified, status connected.
    expect(verifyConnection).toHaveBeenCalledOnce();
    expect(result.status).toBe("connected");
    expect(result.error).toBeNull();

    // Mailbox row exists, email normalised, password columns hold CIPHERTEXT (never plaintext) and
    // round-trip back to the original secret.
    const [row] = await db.select().from(mailboxes).where(eq(mailboxes.id, result.mailboxId));
    expect(row.emailAddress).toBe("support@example.com");
    expect(row.status).toBe("connected");
    expect(row.imapPasswordEnc).toBeTruthy();
    expect(row.imapPasswordEnc).not.toBe(PLAINTEXT_IMAP_PW);
    expect(row.smtpPasswordEnc).not.toBe(PLAINTEXT_SMTP_PW);
    expect(decryptSecret(row.imapPasswordEnc!)).toBe(PLAINTEXT_IMAP_PW);
    expect(decryptSecret(row.smtpPasswordEnc!)).toBe(PLAINTEXT_SMTP_PW);

    // Health event + audit written.
    const health = await db.select().from(mailboxHealthEvents).where(eq(mailboxHealthEvents.mailboxId, result.mailboxId));
    expect(health).toHaveLength(1);
    expect(health[0].kind).toBe("connected");

    const audits = await db.select().from(auditLogs).where(eq(auditLogs.entityId, result.mailboxId));
    expect(audits.some((a) => a.action === "mailbox.connected")).toBe(true);
  });

  it("marks the mailbox errored (but still persisted, still encrypted) when verification fails", async () => {
    verifyConnection.mockRejectedValue(new Error("SMTP auth failed"));
    const org = await createOrganisation();
    const business = await createBusiness(org.id);
    const owner = await authUserFor((await createUser({ organisationId: org.id, isOwner: true })).id);

    const result = await connectImapSmtpMailbox(owner, connectInput(business.id));

    expect(result.status).toBe("error");
    expect(result.error).toBe("SMTP auth failed");

    const [row] = await db.select().from(mailboxes).where(eq(mailboxes.id, result.mailboxId));
    expect(row.status).toBe("error");
    // Even on a failed verify the secret is still stored encrypted, never in the clear.
    expect(decryptSecret(row.imapPasswordEnc!)).toBe(PLAINTEXT_IMAP_PW);

    const health = await db.select().from(mailboxHealthEvents).where(eq(mailboxHealthEvents.mailboxId, result.mailboxId));
    expect(health[0].kind).toBe("verify_failed");
  });
});
