import { it, expect } from "vitest";
import {
  describeIntegration,
  createOrganisation,
  createUser,
  createBusiness,
  createMailbox,
  grantAccess,
  authUserFor,
} from "./harness";
import { listMailboxesForUser } from "@/server/mailboxes/service";
import { assertBusinessAccess, ForbiddenError } from "@/server/auth/access";

/**
 * The non-negotiable requirement: one tenant's data must never surface for another. These tests use
 * the real service layer + real DB across two organisations to prove isolation holds end to end.
 */
describeIntegration("tenant isolation across organisations", () => {
  it("an owner only ever sees their own organisation's mailboxes", async () => {
    // Arrange: two independent orgs, each with a business + mailbox.
    const orgA = await createOrganisation("Org A");
    const orgB = await createOrganisation("Org B");
    const bizA = await createBusiness(orgA.id, "A Business");
    const bizB = await createBusiness(orgB.id, "B Business");
    const mailboxA = await createMailbox({ businessId: bizA.id, emailAddress: "a@example.com" });
    await createMailbox({ businessId: bizB.id, emailAddress: "b@example.com" });

    const ownerA = await authUserFor((await createUser({ organisationId: orgA.id, isOwner: true })).id);

    // Act
    const visible = await listMailboxesForUser(ownerA);

    // Assert: exactly org A's mailbox, never org B's.
    expect(visible.map((m) => m.id)).toEqual([mailboxA.id]);
    expect(visible.map((m) => m.emailAddress)).not.toContain("b@example.com");
  });

  it("a scoped user cannot list a business they were not granted, even in their own org", async () => {
    // One org, two businesses. The user is granted access to biz1 only.
    const org = await createOrganisation("Shared Org");
    const biz1 = await createBusiness(org.id, "Granted");
    const biz2 = await createBusiness(org.id, "Not granted");
    const mailbox1 = await createMailbox({ businessId: biz1.id, emailAddress: "granted@example.com" });
    await createMailbox({ businessId: biz2.id, emailAddress: "ungranted@example.com" });

    const userRow = await createUser({ organisationId: org.id, isOwner: false });
    await grantAccess(userRow.id, biz1.id, "agent");
    const user = await authUserFor(userRow.id);

    const visible = await listMailboxesForUser(user);
    expect(visible.map((m) => m.id)).toEqual([mailbox1.id]);
  });

  it("assertBusinessAccess throws for a business in another organisation", async () => {
    const orgA = await createOrganisation("Org A");
    const orgB = await createOrganisation("Org B");
    const bizB = await createBusiness(orgB.id, "B Business");

    const userA = await authUserFor((await createUser({ organisationId: orgA.id, isOwner: true })).id);

    expect(() => assertBusinessAccess(userA, bizB.id)).toThrow(ForbiddenError);
  });

  it("assertBusinessAccess throws for an un-granted business in the same organisation", async () => {
    const org = await createOrganisation("Shared Org");
    const biz1 = await createBusiness(org.id, "Granted");
    const biz2 = await createBusiness(org.id, "Not granted");

    const userRow = await createUser({ organisationId: org.id, isOwner: false });
    await grantAccess(userRow.id, biz1.id, "agent");
    const user = await authUserFor(userRow.id);

    expect(() => assertBusinessAccess(user, biz1.id)).not.toThrow();
    expect(() => assertBusinessAccess(user, biz2.id)).toThrow(ForbiddenError);
  });
});
