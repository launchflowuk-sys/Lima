import { describe, it, expect } from "vitest";
import {
  type AuthUser,
  ForbiddenError,
  roleForBusiness,
  hasBusinessAccess,
  assertBusinessAccess,
  assertPermission,
  accessibleBusinessIds,
} from "./access";

const BIZ_A = "11111111-1111-1111-1111-111111111111";
const BIZ_B = "22222222-2222-2222-2222-222222222222";

const owner: AuthUser = {
  id: "u-owner", email: "o@x.com", firstName: null, lastName: null,
  isOwner: true, organisationId: "org", access: [],
};
const managerOfA: AuthUser = {
  id: "u-mgr", email: "m@x.com", firstName: null, lastName: null,
  isOwner: false, organisationId: "org", access: [{ businessId: BIZ_A, role: "manager" }],
};
const readerOfA: AuthUser = {
  id: "u-ro", email: "r@x.com", firstName: null, lastName: null,
  isOwner: false, organisationId: "org", access: [{ businessId: BIZ_A, role: "read_only" }],
};

describe("tenant isolation", () => {
  it("a manager of business A cannot access business B", () => {
    expect(hasBusinessAccess(managerOfA, BIZ_A)).toBe(true);
    expect(hasBusinessAccess(managerOfA, BIZ_B)).toBe(false);
    expect(() => assertBusinessAccess(managerOfA, BIZ_B)).toThrow(ForbiddenError);
  });

  it("an owner can access every business", () => {
    expect(hasBusinessAccess(owner, BIZ_A)).toBe(true);
    expect(hasBusinessAccess(owner, BIZ_B)).toBe(true);
    expect(roleForBusiness(owner, BIZ_B)).toBe("owner");
    expect(accessibleBusinessIds(owner)).toBe("all");
  });

  it("scopes cross-business queries to only granted businesses", () => {
    expect(accessibleBusinessIds(managerOfA)).toEqual([BIZ_A]);
  });

  it("roleForBusiness returns null where there is no grant", () => {
    expect(roleForBusiness(managerOfA, BIZ_B)).toBeNull();
  });
});

describe("permission enforcement", () => {
  it("a manager can approve replies in their business", () => {
    expect(() => assertPermission(managerOfA, BIZ_A, "reply.approve")).not.toThrow();
  });

  it("a read-only user cannot approve replies", () => {
    expect(() => assertPermission(readerOfA, BIZ_A, "reply.approve")).toThrow(ForbiddenError);
  });

  it("a manager cannot act in a business they lack access to", () => {
    expect(() => assertPermission(managerOfA, BIZ_B, "reply.approve")).toThrow(ForbiddenError);
  });

  it("an owner has every permission everywhere", () => {
    expect(() => assertPermission(owner, BIZ_B, "users.manage")).not.toThrow();
    expect(() => assertPermission(owner, BIZ_B, "billing.manage")).not.toThrow();
  });
});
