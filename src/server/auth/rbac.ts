/**
 * Role-based access control (spec §4). Permissions are checked on the SERVER for every sensitive
 * action — the UI may also hide controls, but hiding is never the enforcement point.
 */
export type Role = "owner" | "manager" | "agent" | "read_only";

export type Permission =
  | "business.manage"
  | "mailbox.connect"
  | "mailbox.manage"
  | "ai.configure"
  | "users.manage"
  | "automation.configure"
  | "reply.approve"
  | "reply.send"
  | "reply.edit"
  | "knowledge.edit"
  | "conversation.view"
  | "conversation.note"
  | "conversation.escalate"
  | "audit.view"
  | "analytics.view"
  | "system.health.view"
  | "billing.manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "business.manage", "mailbox.connect", "mailbox.manage", "ai.configure", "users.manage",
    "automation.configure", "reply.approve", "reply.send", "reply.edit", "knowledge.edit",
    "conversation.view", "conversation.note", "conversation.escalate", "audit.view",
    "analytics.view", "system.health.view", "billing.manage",
  ],
  manager: [
    "reply.approve", "reply.send", "reply.edit", "knowledge.edit", "automation.configure",
    "conversation.view", "conversation.note", "conversation.escalate", "analytics.view",
  ],
  agent: [
    "reply.send", "reply.edit", "conversation.view", "conversation.note", "conversation.escalate",
  ],
  read_only: ["conversation.view", "analytics.view"],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** For an org owner (users.isOwner) every permission is granted across every business. */
export function can(opts: { isOwner: boolean; role: Role | null }, permission: Permission): boolean {
  if (opts.isOwner) return true;
  return opts.role ? roleHasPermission(opts.role, permission) : false;
}
