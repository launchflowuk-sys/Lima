import { useMemo } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import RenderHtml, { type MixedStyleDeclaration } from "react-native-render-html";
import { colors, font } from "@/constants/theme";

interface HtmlBodyProps {
  html?: string | null;
  text?: string | null;
  /** Width the content renders into (defaults to window width minus generous gutters). */
  width?: number;
  /** Text colour override (e.g. white on a tinted outbound bubble). */
  color?: string;
  muted?: string;
}

const BASE_FONT_SIZE = 15;
const LINE_HEIGHT = 23;

/**
 * Renders a real email body: prefers sanitized HTML (so formatting, links and
 * images actually render), and falls back to plain text split into paragraphs.
 * No raw tags are ever shown.
 */
export function HtmlBody({ html, text, width, color = colors.ink, muted = colors.inkMuted }: HtmlBodyProps) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.max(200, width ?? windowWidth - 96);

  const hasHtml = typeof html === "string" && html.trim().length > 0;

  const tagsStyles = useMemo<Record<string, MixedStyleDeclaration>>(
    () => ({
      body: { color, fontFamily: font.regular, fontSize: BASE_FONT_SIZE, lineHeight: LINE_HEIGHT },
      p: { marginTop: 0, marginBottom: 12, color, fontFamily: font.regular, fontSize: BASE_FONT_SIZE, lineHeight: LINE_HEIGHT },
      a: { color: colors.primary, textDecorationLine: "underline" },
      strong: { fontFamily: font.bold },
      b: { fontFamily: font.bold },
      em: { fontStyle: "italic" },
      h1: { color, fontFamily: font.bold, fontSize: 20, marginBottom: 10, lineHeight: 26 },
      h2: { color, fontFamily: font.bold, fontSize: 18, marginBottom: 10, lineHeight: 24 },
      h3: { color, fontFamily: font.semibold, fontSize: 16, marginBottom: 8, lineHeight: 22 },
      li: { color, fontFamily: font.regular, fontSize: BASE_FONT_SIZE, lineHeight: LINE_HEIGHT, marginBottom: 6 },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: colors.lineStrong,
        paddingLeft: 12,
        marginLeft: 0,
        marginBottom: 12,
        color: muted,
      },
      img: { marginVertical: 8 },
      hr: { marginVertical: 14, height: 1, backgroundColor: colors.line },
      table: { marginBottom: 12 },
    }),
    [color, muted],
  );

  if (hasHtml) {
    // Drop any <img> without a real http(s) source (about:blank, cid: inline attachments,
    // relative/tracking pixels) — RN's image loader crashes on those ("No suitable URL request
    // handler"). Keep genuine remote images.
    const safeHtml = (html as string).replace(/<img\b[^>]*>/gi, (tag) =>
      /\bsrc\s*=\s*["']https?:\/\/[^"']+["']/i.test(tag) ? tag : "",
    );
    return (
      <RenderHtml
        contentWidth={contentWidth}
        source={{ html: safeHtml }}
        tagsStyles={tagsStyles}
        defaultTextProps={{ selectable: true }}
        // Constrain any inline/remote image so it never blows out the bubble width.
        computeEmbeddedMaxWidth={(availableWidth) => Math.min(availableWidth, contentWidth)}
        enableExperimentalMarginCollapsing
      />
    );
  }

  // Fallback — split plain text into cleanly spaced paragraphs (never show tags).
  const paragraphs = (text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return (
      <Text style={{ fontFamily: font.regular, fontSize: BASE_FONT_SIZE, color: muted, lineHeight: LINE_HEIGHT }}>
        (no content)
      </Text>
    );
  }

  return (
    <View>
      {paragraphs.map((p, i) => (
        <Text
          key={i}
          style={{
            fontFamily: font.regular,
            fontSize: BASE_FONT_SIZE,
            color,
            lineHeight: LINE_HEIGHT,
            marginBottom: i === paragraphs.length - 1 ? 0 : 12,
          }}
        >
          {p}
        </Text>
      ))}
    </View>
  );
}
