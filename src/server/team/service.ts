import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, userBusinessAccess, invitations, businesses } from "@/server/db/schema";
import { type AuthUser, ForbiddenError, assertPermission } from "@/server/auth/access";
import type { Role } from "@/server/auth/rbac";
import { hashToken } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";
import { recordAudit } from "@/server/audit/log";
import { env } from "@/env";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  isOwner: boolean;
  isActive: boolean;
  access: Array<{ businessId: string; role: Role }>;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
}

/** Everyone in the caller's organisation + their per-business access, plus pending invitations. */
export async function listTeam(user: AuthUser): Promise<{
  members: TeamMember[];
  invitations: PendingInvitation[];
  businesses: Array<{ id: string; name: string }>;
}> {
  const orgUsers = await db.select().from(users).where(eq(users.organisationId, user.organisationId)).orderBy(users.email);
  const ids = orgUsers.map((u) => u.id);
  const access = ids.length ? await db.select().from(userBusinessAccess).where(inArray(userBusinessAccess.userId, ids)) : [];
  const biz = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(eq(businesses.organisationId, user.organisationId)).orderBy(businesses.name);

  const members: TeamMember[] = orgUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
    isOwner: u.isOwner,
    isActive: u.isActive,
    access: access.filter((a) => a.userId === u.id).map((a) => ({ businessId: a.businessId, role: a.role })),
  }));

  const pending = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.organisationId, user.organisationId), isNull(invitations.acceptedAt)))
    .orderBy(desc(invitations.createdAt));

  return {
    members,
    invitations: pending.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt })),
    businesses: biz,
  };
}

/** Create an invitation to join the org. Returns the accept link (email delivery lands with notifications). */
export async function createInvitation(user: AuthUser, input: { email: string; role: Role }): Promise<{ link: string }> {
  if (!user.isOwner) throw new ForbiddenError("Only owners can invite teammates");
  const email = input.email.toLowerCase().trim();
  if (!email) throw new Error("Email is required");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new Error("A user with that email already exists");

  const token = randomBytes(32).toString("base64url");
  const [row] = await db
    .insert(invitations)
    .values({
      organisationId: user.organisationId,
      email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedByUserId: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .returning();

  await recordAudit({ actorUserId: user.id, action: "invitation.created", entityType: "invitation", entityId: row.id, metadata: { email, role: input.role } });
  return { link: `${env.APP_URL}/accept-invitation?token=${token}` };
}

export async function revokeInvitation(user: AuthUser, invitationId: string): Promise<void> {
  if (!user.isOwner) throw new ForbiddenError("Only owners can revoke invitations");
  const [row] = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
  if (!row || row.organisationId !== user.organisationId) return;
  await db.delete(invitations).where(eq(invitations.id, invitationId));
  await recordAudit({ actorUserId: user.id, action: "invitation.revoked", entityType: "invitation", entityId: invitationId });
}

/** Grant (or update) a user's role on a business. Owners only. */
export async function grantBusinessAccess(user: AuthUser, input: { userId: string; businessId: string; role: Role }): Promise<void> {
  assertPermission(user, input.businessId, "users.manage");
  // The target must be in the same org.
  const [target] = await db.select({ id: users.id, organisationId: users.organisationId }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target || target.organisationId !== user.organisationId) throw new ForbiddenError("Unknown user");
  const [biz] = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, input.businessId), eq(businesses.organisationId, user.organisationId))).limit(1);
  if (!biz) throw new ForbiddenError("Unknown business");

  await db
    .insert(userBusinessAccess)
    .values({ userId: input.userId, businessId: input.businessId, role: input.role })
    .onConflictDoUpdate({ target: [userBusinessAccess.userId, userBusinessAccess.businessId], set: { role: input.role } });
  await recordAudit({ businessId: input.businessId, actorUserId: user.id, action: "access.granted", entityType: "user", entityId: input.userId, metadata: { role: input.role } });
}

export async function revokeBusinessAccess(user: AuthUser, input: { userId: string; businessId: string }): Promise<void> {
  assertPermission(user, input.businessId, "users.manage");
  await db.delete(userBusinessAccess).where(and(eq(userBusinessAccess.userId, input.userId), eq(userBusinessAccess.businessId, input.businessId)));
  await recordAudit({ businessId: input.businessId, actorUserId: user.id, action: "access.revoked", entityType: "user", entityId: input.userId });
}

export interface InvitationPreview {
  email: string;
  role: Role;
  organisationId: string;
}

/** Look up a pending, unexpired invitation by its raw token. Null if invalid/expired/used. */
export async function findInvitationByToken(token: string): Promise<InvitationPreview | null> {
  if (!token) return null;
  const [row] = await db.select().from(invitations).where(eq(invitations.tokenHash, hashToken(token))).limit(1);
  if (!row || row.acceptedAt || row.expiresAt.getTime() < Date.now()) return null;
  return { email: row.email, role: row.role, organisationId: row.organisationId };
}

/**
 * Accept an invitation: create the user (owner if the invited role is owner), mark the invite used, and
 * return the new user id so the caller can start a session. Validates the token again inside a single
 * flow so a used/expired token can't create an account.
 */
export async function acceptInvitation(input: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ userId: string }> {
  const [row] = await db.select().from(invitations).where(eq(invitations.tokenHash, hashToken(input.token))).limit(1);
  if (!row || row.acceptedAt || row.expiresAt.getTime() < Date.now()) throw new Error("This invitation is invalid or has expired");
  if (input.password.length < 10) throw new Error("Password must be at least 10 characters");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, row.email)).limit(1);
  if (existing) throw new Error("An account already exists for this email");

  const [created] = await db
    .insert(users)
    .values({
      organisationId: row.organisationId,
      email: row.email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName.trim() || null,
      lastName: input.lastName.trim() || null,
      isOwner: row.role === "owner",
      isActive: true,
    })
    .returning({ id: users.id });

  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, row.id));
  await recordAudit({ actorUserId: created.id, action: "invitation.accepted", entityType: "user", entityId: created.id, metadata: { email: row.email } });
  return { userId: created.id };
}
