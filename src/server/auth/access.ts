import { can, type Permission, type Role } from "./rbac";

/**
 * The authenticated user as the app sees it: identity + which businesses they can touch and with
 * what role. This is the single object every tenant-isolation check consumes. Pure (no I/O) so the
 * isolation rules can be unit-tested exhaustively.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isOwner: boolean;
  organisationId: string;
  access: Array<{ businessId: string; role: Role }>;
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** The user's role in a given business, or null if they have no access to it. Owners are always owner. */
export function roleForBusiness(user: AuthUser, businessId: string): Role | null {
  if (user.isOwner) return "owner";
  return user.access.find((a) => a.businessId === businessId)?.role ?? null;
}

export function hasBusinessAccess(user: AuthUser, businessId: string): boolean {
  return user.isOwner || user.access.some((a) => a.businessId === businessId);
}

/** Throw unless the user may access this business at all. Call before ANY business-scoped read/write. */
export function assertBusinessAccess(user: AuthUser, businessId: string): void {
  if (!hasBusinessAccess(user, businessId)) {
    throw new ForbiddenError("You do not have access to this business");
  }
}

/** Throw unless the user has `permission` in `businessId`. */
export function assertPermission(user: AuthUser, businessId: string, permission: Permission): void {
  const role = roleForBusiness(user, businessId);
  if (!can({ isOwner: user.isOwner, role }, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

/**
 * The set of business ids a user may query. "all" means an org owner with no restriction. Use this
 * to scope every cross-business list query (`inArray(table.businessId, ids)`) so a query can never
 * return another tenant's rows.
 */
export function accessibleBusinessIds(user: AuthUser): string[] | "all" {
  return user.isOwner ? "all" : user.access.map((a) => a.businessId);
}
