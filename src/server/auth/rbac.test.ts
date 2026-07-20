import { describe, it, expect } from "vitest";
import { can, roleHasPermission } from "./rbac";

describe("rbac permission matrix", () => {
  it("owner has every listed permission", () => {
    expect(can({ isOwner: true, role: null }, "billing.manage")).toBe(true);
    expect(can({ isOwner: true, role: null }, "users.manage")).toBe(true);
  });

  it("read_only can view but not send or approve", () => {
    expect(roleHasPermission("read_only", "conversation.view")).toBe(true);
    expect(roleHasPermission("read_only", "reply.send")).toBe(false);
    expect(roleHasPermission("read_only", "reply.approve")).toBe(false);
  });

  it("agent can send but not approve or configure automation", () => {
    expect(roleHasPermission("agent", "reply.send")).toBe(true);
    expect(roleHasPermission("agent", "reply.approve")).toBe(false);
    expect(roleHasPermission("agent", "automation.configure")).toBe(false);
  });

  it("manager can approve and configure automation but not manage users", () => {
    expect(roleHasPermission("manager", "reply.approve")).toBe(true);
    expect(roleHasPermission("manager", "automation.configure")).toBe(true);
    expect(roleHasPermission("manager", "users.manage")).toBe(false);
  });
});
