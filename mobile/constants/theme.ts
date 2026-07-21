/**
 * Agent Lima design system tokens.
 * Light, rounded, premium — Spark / Revolut / Stripe inspired.
 */

export const colors = {
  // Brand
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  primarySoft: "#EFF6FF",

  // Surfaces
  canvas: "#F5F7FA",
  surface: "#FFFFFF",

  // Ink / text
  ink: "#0F172A",
  inkSoft: "#475569",
  inkMuted: "#94A3B8",

  // Lines / borders
  line: "#EDF1F6",
  lineStrong: "#E2E8F0",

  // Accents / status palette
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  violet: "#8B5CF6",
  sky: "#0EA5E9",

  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  pill: 999,
} as const;

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

/** Soft, premium shadows (iOS + Android elevation). */
export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    shadowColor: "#2563EB",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fab: {
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;

/** Deterministic vibrant palette used for initials avatars + accents. */
const AVATAR_PALETTE = [
  colors.primary,
  colors.emerald,
  colors.amber,
  colors.rose,
  colors.violet,
  colors.sky,
] as const;

export function avatarColor(seed: string | null | undefined): string {
  const s = (seed ?? "?").trim() || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function initials(name: string | null | undefined): string {
  const s = (name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type StatusTone = {
  fg: string;
  bg: string;
  label: string;
};

/** Map a thread/draft status string to a colour + friendly label. */
export function statusTone(status: string | null | undefined): StatusTone {
  const key = (status ?? "").toLowerCase();
  const label = (status ?? "unknown").replace(/_/g, " ");
  if (/(sent|approved|done|complete|closed|resolved)/.test(key))
    return { fg: colors.emerald, bg: "#ECFDF5", label };
  if (/(pending|await|review|needs|draft|open)/.test(key))
    return { fg: colors.amber, bg: "#FFFBEB", label };
  if (/(reject|fail|error|blocked|spam)/.test(key))
    return { fg: colors.rose, bg: "#FFF1F2", label };
  if (/(new|unread|active)/.test(key))
    return { fg: colors.primary, bg: colors.primarySoft, label };
  return { fg: colors.inkSoft, bg: "#F1F5F9", label };
}

/** Human-friendly relative time (e.g. "3h", "2d", "Jul 4"). */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
