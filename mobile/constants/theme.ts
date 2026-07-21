/**
 * Agent Lima design tokens — Modernist / editorial direction.
 *
 * Sharp corners (radius 0), flat fills (no gradients / glossy buttons / soft
 * glows), heavy Archivo typography, thin dividers + 2px section borders.
 *
 * Colour system: BLUE is the dominant accent (`primary`) — buttons, active
 * nav/tab, links, the logo mark, primary tags, default left-border stripes.
 * RED (`danger`) is the sparing contrast accent — urgent/escalated statuses,
 * destructive actions and errors only.
 *
 * Two palettes (light default + dark) share the same keys so the token flip is
 * symmetrical. Components read the active palette from `useTheme()`; the static
 * `colors` export mirrors the light palette for module-level defaults.
 */

export interface Palette {
  // Ground
  bg: string;
  surface: string;
  surfaceAlt: string;
  // Ink
  text: string;
  textSoft: string;
  textMuted: string;
  // Rules
  divider: string;
  dividerStrong: string;
  // Primary (MAIN — blue)
  primary: string;
  primaryStrong: string;
  primaryTint: string;
  primaryFg: string;
  // Danger (contrast accent — red, used sparingly)
  danger: string;
  dangerTint: string;
  dangerFg: string;
  // Semantic (subtle)
  success: string;
  successTint: string;
  successFg: string;
  warning: string;
  warningTint: string;
  warningFg: string;
  // Neutral tag
  neutralTagBg: string;
  neutralTagFg: string;
  // Utility
  white: string;
}

export const lightColors: Palette = {
  bg: "#F3F2F2",
  surface: "#EAE9E9",
  surfaceAlt: "#E2E1E1",

  text: "#201E1D",
  textSoft: "rgba(32,30,29,0.70)",
  textMuted: "rgba(32,30,29,0.50)",

  divider: "rgba(32,30,29,0.16)",
  dividerStrong: "rgba(32,30,29,0.40)",

  primary: "#2563EB",
  primaryStrong: "#1D4ED8",
  primaryTint: "#EAF0FE",
  primaryFg: "#FFFFFF",

  danger: "#EC3013",
  dangerTint: "#FDECE9",
  dangerFg: "#B0210B",

  success: "#1F7A4D",
  successTint: "#E7F2EC",
  successFg: "#185C3A",

  warning: "#B45309",
  warningTint: "#FBF1E3",
  warningFg: "#8A3F07",

  neutralTagBg: "rgba(32,30,29,0.06)",
  neutralTagFg: "rgba(32,30,29,0.72)",

  white: "#FFFFFF",
};

export const darkColors: Palette = {
  bg: "#1A1918",
  surface: "#242220",
  surfaceAlt: "#2C2A28",

  text: "#F4F2F1",
  textSoft: "rgba(244,242,241,0.70)",
  textMuted: "rgba(244,242,241,0.50)",

  divider: "rgba(244,242,241,0.16)",
  dividerStrong: "rgba(244,242,241,0.40)",

  primary: "#2563EB",
  primaryStrong: "#1D4ED8",
  primaryTint: "rgba(37,99,235,0.20)",
  primaryFg: "#FFFFFF",

  danger: "#EC3013",
  dangerTint: "rgba(236,48,19,0.20)",
  dangerFg: "#FF9783",

  success: "#1F7A4D",
  successTint: "rgba(31,122,77,0.22)",
  successFg: "#7FD3A6",

  warning: "#B45309",
  warningTint: "rgba(180,83,9,0.24)",
  warningFg: "#E8B57A",

  neutralTagBg: "rgba(244,242,241,0.08)",
  neutralTagFg: "rgba(244,242,241,0.72)",

  white: "#FFFFFF",
};

/** Default (light) palette for module-level defaults and non-reactive callers. */
export const colors = lightColors;

/** Archivo family — loaded in the root layout via @expo-google-fonts/archivo. */
export const fonts = {
  body: "Archivo_400Regular",
  medium: "Archivo_600SemiBold",
  heading: "Archivo_800ExtraBold",
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

/** Sharp corners everywhere — this is the whole point of the aesthetic. */
export const radius = {
  none: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  "2xl": 0,
  full: 999,
} as const;

/** Tag visual kinds mapped onto the palette. */
export type TagVariant = "primary" | "neutral" | "danger" | "success" | "warning" | "outline";

export interface StatusMeta {
  variant: TagVariant;
  label: string;
}

/**
 * Maps a thread/draft status to a tag variant + label.
 * needs_reply -> blue, drafted -> neutral, escalated/urgent -> red,
 * sent -> green, waiting -> amber. Reserve blue-fill for primary emphasis and
 * red strictly for urgent/escalated so the contrast accent stays rare.
 */
const STATUS_VARIANTS: Record<string, TagVariant> = {
  // Primary (blue) — active / needs attention
  needs_reply: "primary",
  needsreply: "primary",
  unread: "primary",
  new: "primary",
  open: "primary",

  // Neutral — drafted / informational
  drafted: "neutral",
  draft: "neutral",
  info: "neutral",

  // Danger (red) — urgent / escalated only
  escalated: "danger",
  urgent: "danger",
  complaint: "danger",
  blocked: "danger",
  failed: "danger",

  // Success (green) — sent / resolved
  sent: "success",
  replied: "success",
  resolved: "success",
  closed: "success",

  // Warning (amber) — waiting / pending
  waiting: "warning",
  pending: "warning",
  awaiting_approval: "warning",
  scheduled: "warning",
};

export function statusMeta(status: string | null | undefined): StatusMeta {
  if (!status) return { variant: "neutral", label: "—" };
  const key = status.toLowerCase().trim().replace(/\s+/g, "_");
  const variant = STATUS_VARIANTS[key] ?? "neutral";
  const label = status.replace(/_/g, " ").trim().toLowerCase();
  return { variant, label };
}

export interface TagColors {
  bg: string;
  fg: string;
  border: string;
}

/** Resolve a tag variant to concrete fill/text/border colours on a palette. */
export function tagColors(variant: TagVariant, c: Palette): TagColors {
  switch (variant) {
    case "primary":
      return { bg: c.primary, fg: c.primaryFg, border: c.primary };
    case "danger":
      // Outline treatment keeps red as a rare, deliberate accent.
      return { bg: "transparent", fg: c.danger, border: c.danger };
    case "success":
      return { bg: c.successTint, fg: c.successFg, border: c.successTint };
    case "warning":
      return { bg: c.warningTint, fg: c.warningFg, border: c.warningTint };
    case "outline":
      return { bg: "transparent", fg: c.text, border: c.dividerStrong };
    case "neutral":
    default:
      return { bg: c.neutralTagBg, fg: c.neutralTagFg, border: c.neutralTagBg };
  }
}

/**
 * Left-border accent stripe colour for list items: blue by default,
 * red for escalated/urgent threads.
 */
export function statusAccent(status: string | null | undefined, c: Palette): string {
  return statusMeta(status).variant === "danger" ? c.danger : c.primary;
}
