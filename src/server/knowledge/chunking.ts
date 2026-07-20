/**
 * Split source text into retrieval-sized chunks. Pure + deterministic so it's unit-testable.
 * Strategy: split on blank lines (paragraphs), then greedily pack paragraphs into chunks up to a
 * target size. A single oversized paragraph is hard-split so no chunk exceeds the max.
 */

const TARGET_CHARS = 900;
const MAX_CHARS = 1200;

/** Hard-split a too-long paragraph on sentence boundaries, then on raw length as a last resort. */
function splitLongParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHARS) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+|\S+$/g) ?? [paragraph];
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > MAX_CHARS && current) {
      out.push(current.trim());
      current = "";
    }
    if (s.length > MAX_CHARS) {
      // A single monster sentence with no punctuation — chop by length.
      for (let i = 0; i < s.length; i += MAX_CHARS) out.push(s.slice(i, i + MAX_CHARS).trim());
    } else {
      current += s;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

export function chunkText(text: string): string[] {
  const normalised = text.replace(/\r\n/g, "\n").trim();
  if (!normalised) return [];

  const paragraphs = normalised
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap(splitLongParagraph);

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > TARGET_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current = current ? `${current}\n\n${p}` : p;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
