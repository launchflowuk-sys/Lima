import Constants from "expo-constants";
import { getToken } from "./token";

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:3000";

export interface Thread {
  id: string;
  subject: string | null;
  status: string;
  businessName: string;
  isRead: boolean;
  lastMessageAt: string | null;
}
export interface Message {
  id: string;
  direction: "inbound" | "outbound";
  fromName: string | null;
  fromAddress: string | null;
  bodyText: string | null;
  bodyHtmlSanitized: string | null;
  snippet: string | null;
  sentAt: string | null;
}
export interface Draft {
  id: string;
  threadId: string;
  threadSubject: string | null;
  subject: string | null;
  bodyText: string;
  autoSendBlockedReason: string | null;
}

/** The AI's pending suggested reply attached to a thread (from GET /threads/:id). */
export interface ThreadDraft {
  id: string;
  bodyText: string;
  status: string;
  autoSendBlockedReason: string | null;
}
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isOwner: boolean;
}

/** Minimal { id, name } business reference used across list endpoints. */
export interface BusinessRef {
  id: string;
  name: string;
}

export interface DashboardStats {
  hasBusiness: boolean;
  emailsReceivedToday: number;
  repliesSentToday: number;
  awaitingApproval: number;
  needsAttention: number;
  autoSentToday: number;
  autoSendRate: number | null;
  escalated: number;
  followUpsDueToday: number;
}
export interface AnalyticsReport {
  hasBusiness: boolean;
  windowDays: number;
  totalReceived: number;
  totalSent: number;
  autoSentCount: number;
  autoSendRate: number | null;
  intentBreakdown: Array<{ intent: string; count: number }>;
  sentimentBreakdown: Array<{ sentiment: string; count: number }>;
  estimatedAiCostUsd: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  isRead: boolean;
  createdAt: string | null;
}

export interface Contact {
  id: string;
  businessId: string;
  email: string;
  name: string | null;
  messageCount: number;
  notes: string | null;
  lastSeenAt: string | null;
}

export interface FollowUp {
  id: string;
  businessId: string;
  threadId: string | null;
  threadSubject: string | null;
  dueAt: string | null;
  reason: string | null;
}

export interface KnowledgeEntry {
  id: string;
  businessId: string;
  title: string;
  content: string;
  kind: string;
  priority: number;
  isActive: boolean;
}

export interface AutomationRule {
  id: string;
  businessId: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditions: unknown;
  actions: unknown;
  stopOnMatch: boolean;
}

async function request<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request<{ user: User }>("/auth/me"),

  inbox: () => request<{ threads: Thread[] }>("/inbox"),
  thread: (id: string) =>
    request<{ thread: Thread; messages: Message[]; draft: ThreadDraft | null }>(`/threads/${id}`),
  generateDraft: (threadId: string) =>
    request<{ draft: ThreadDraft }>(`/threads/${threadId}/draft`, { method: "POST" }),

  approvals: () => request<{ drafts: Draft[] }>("/approvals"),
  approve: (id: string, finalBody?: string) =>
    request<{ ok: boolean }>(`/drafts/${id}/approve`, { method: "POST", body: { finalBody } }),
  reject: (id: string) => request<{ ok: boolean }>(`/drafts/${id}/reject`, { method: "POST" }),

  analytics: () => request<{ stats: DashboardStats; report: AnalyticsReport }>("/analytics"),

  notifications: () => request<{ unread: number; notifications: NotificationItem[] }>("/notifications"),
  markNotification: (id: string) =>
    request<{ ok: boolean }>("/notifications", { method: "POST", body: { id } }),
  markAllNotifications: () =>
    request<{ ok: boolean }>("/notifications", { method: "POST", body: { all: true } }),

  contacts: () => request<{ businesses: BusinessRef[]; contacts: Contact[] }>("/contacts"),

  followUps: () => request<{ followUps: FollowUp[] }>("/follow-ups"),

  knowledge: () => request<{ businesses: BusinessRef[]; entries: KnowledgeEntry[] }>("/knowledge"),

  automation: () => request<{ businesses: BusinessRef[]; rules: AutomationRule[] }>("/automation"),
};
