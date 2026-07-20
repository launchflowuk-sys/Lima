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
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isOwner: boolean;
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
  thread: (id: string) => request<{ thread: Thread; messages: Message[] }>(`/threads/${id}`),
  approvals: () => request<{ drafts: Draft[] }>("/approvals"),
  approve: (id: string, finalBody?: string) =>
    request<{ ok: boolean }>(`/drafts/${id}/approve`, { method: "POST", body: { finalBody } }),
  reject: (id: string) => request<{ ok: boolean }>(`/drafts/${id}/reject`, { method: "POST" }),
};
