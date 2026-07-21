import { Feather } from "@expo/vector-icons";
import { colors } from "./theme";

export interface SectionDef {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  /** Route to push. If omitted, routes to the generic coming-soon screen. */
  route?: string;
  built?: boolean;
}

/** The full 15-section menu, grouped sensibly. */
export const MENU_GROUPS: { heading: string; items: SectionDef[] }[] = [
  {
    heading: "Workspace",
    items: [
      { key: "dashboard", title: "Dashboard", subtitle: "Overview & metrics", icon: "home", color: colors.primary },
      { key: "inbox", title: "Inbox", subtitle: "Conversations", icon: "inbox", color: colors.sky, route: "/(app)/inbox", built: true },
      { key: "notifications", title: "Notifications", subtitle: "Alerts & activity", icon: "bell", color: colors.amber },
    ],
  },
  {
    heading: "Actions",
    items: [
      { key: "approvals", title: "Approvals", subtitle: "Review AI drafts", icon: "check-circle", color: colors.emerald, route: "/(app)/approvals", built: true },
      { key: "followups", title: "Follow-ups", subtitle: "Scheduled replies", icon: "clock", color: colors.violet, route: "/(app)/followups", built: true },
      { key: "automation", title: "Automation", subtitle: "Rules & workflows", icon: "zap", color: colors.amber },
    ],
  },
  {
    heading: "Directory",
    items: [
      { key: "contacts", title: "Contacts", subtitle: "People you talk to", icon: "users", color: colors.sky },
      { key: "businesses", title: "Businesses", subtitle: "Connected accounts", icon: "briefcase", color: colors.primary },
      { key: "knowledge", title: "Knowledge", subtitle: "AI training & docs", icon: "book-open", color: colors.violet },
      { key: "mailboxes", title: "Mailboxes", subtitle: "Connected inboxes", icon: "mail", color: colors.rose },
    ],
  },
  {
    heading: "Insights & admin",
    items: [
      { key: "analytics", title: "Analytics", subtitle: "Performance reports", icon: "bar-chart-2", color: colors.emerald },
      { key: "team", title: "Team", subtitle: "Members & roles", icon: "user-plus", color: colors.primary },
      { key: "audit", title: "Audit", subtitle: "Activity log", icon: "file-text", color: colors.inkSoft },
      { key: "system", title: "System health", subtitle: "Status & uptime", icon: "activity", color: colors.emerald },
      { key: "settings", title: "Settings", subtitle: "Preferences", icon: "settings", color: colors.inkSoft },
    ],
  },
];

export const ALL_SECTIONS: SectionDef[] = MENU_GROUPS.flatMap((g) => g.items);

export function findSection(key: string | undefined): SectionDef | undefined {
  return ALL_SECTIONS.find((s) => s.key === key);
}
