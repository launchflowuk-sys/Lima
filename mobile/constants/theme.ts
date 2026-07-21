/**
 * Agent Lima design tokens.
 * Single source of truth for colours, gradients, spacing, radii and
 * status -> colour maps so screens never hardcode hex values.
 */

export const colors = {
  // Brand
  primary: "#2563EB",
  primaryFg: "#FFFFFF",
  indigo: "#4F46E5",
  violet: "#7C3AED",

  // Vibrant semantic accents
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  sky: "#0EA5E9",
  accentViolet: "#8B5CF6",

  // Warm neutrals
  canvas: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F5F4",
  ink: "#1C1917",
  inkSoft: "#44403C",
  inkMuted: "#78716C",
  hairline: "#E7E5E4",

  // Utility
  white: "#FFFFFF",
  danger: "#DC2626",
} as const;

/** Gradient stops as arrays ready for expo-linear-gradient `colors`. */
export const gradients = {
  brand: ["#2563EB", "#4F46E5", "#7C3AED"] as const,
  primaryButton: ["#2563EB", "#4F46E5"] as const,
  header: ["#2563EB", "#4F46E5", "#7C3AED"] as const,
  violet: ["#7C3AED", "#8B5CF6"] as const,
  sky: ["#0EA5E9", "#2563EB"] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  full: 999,
} as const;

export type StatusTone = {
  /** Solid accent colour (icons, dots, borders). */
  color: string;
  /** Soft tinted background for pill/badge fills. */
  bg: string;
  /** Readable text colour on the tinted background. */
  fg: string;
  label: string;
};

/**
 * Maps a thread/draft status string to a vibrant accent tone.
 * Keys are normalised (lowercase) so unknown statuses fall back to neutral.
 */
export const statusTones: Record<string, StatusTone> = {
  sent: { color: colors.emerald, bg: "#ECFDF5", fg: "#047857", label: "Sent" },
  replied: { color: colors.emerald, bg: "#ECFDF5", fg: "#047857", label: "Replied" },
  resolved: { color: colors.emerald, bg: "#ECFDF5", fg: "#047857", label: "Resolved" },
  closed: { color: colors.emerald, bg: "#ECFDF5", fg: "#047857", label: "Closed" },

  pending: { color: colors.amber, bg: "#FFFBEB", fg: "#B45309", label: "Pending" },
  waiting: { color: colors.amber, bg: "#FFFBEB", fg: "#B45309", label: "Waiting" },
  awaiting_approval: { color: colors.amber, bg: "#FFFBEB", fg: "#B45309", label: "Awaiting approval" },
  draft: { color: colors.amber, bg: "#FFFBEB", fg: "#B45309", label: "Draft" },

  urgent: { color: colors.rose, bg: "#FFF1F2", fg: "#BE123C", label: "Urgent" },
  complaint: { color: colors.rose, bg: "#FFF1F2", fg: "#BE123C", label: "Complaint" },
  blocked: { color: colors.rose, bg: "#FFF1F2", fg: "#BE123C", label: "Blocked" },

  new: { color: colors.sky, bg: "#F0F9FF", fg: "#0369A1", label: "New" },
  open: { color: colors.sky, bg: "#F0F9FF", fg: "#0369A1", label: "Open" },
  info: { color: colors.sky, bg: "#F0F9FF", fg: "#0369A1", label: "Info" },

  automated: { color: colors.accentViolet, bg: "#F5F3FF", fg: "#6D28D9", label: "Automated" },
  ai: { color: colors.accentViolet, bg: "#F5F3FF", fg: "#6D28D9", label: "AI" },
  agent: { color: colors.accentViolet, bg: "#F5F3FF", fg: "#6D28D9", label: "Agent" },
};

const neutralTone: StatusTone = {
  color: colors.inkMuted,
  bg: colors.surfaceAlt,
  fg: colors.inkSoft,
  label: "",
};

/** Resolve a status string to a tone, humanising the label if unknown. */
export function toneForStatus(status: string | null | undefined): StatusTone {
  if (!status) return { ...neutralTone, label: "—" };
  const key = status.toLowerCase().trim();
  const tone = statusTones[key];
  if (tone) return tone;
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { ...neutralTone, label };
}
