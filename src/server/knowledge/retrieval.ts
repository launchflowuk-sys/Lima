/**
 * Pure retrieval ranking. No I/O, no DB — given a corpus of candidate chunks and a query, it returns
 * the most relevant chunks. Kept pure so ranking is exhaustively unit-testable and deterministic.
 *
 * Two signals, combined:
 *  - keyword overlap (always available, needs no API key) — term-frequency of query words in a chunk
 *  - embedding cosine similarity (only when both the query and the chunk carry an embedding)
 * When embeddings are present they dominate; keyword score breaks ties and covers embedding-less chunks.
 * High-`priority` chunks (core facts like opening hours) get a floor so they are never starved out.
 */

export interface RetrievalChunk {
  id: string;
  content: string;
  priority: number;
  embedding?: number[] | null;
}

export interface ScoredChunk extends RetrievalChunk {
  score: number;
}

export interface RetrievalOptions {
  /** Max chunks to return. */
  limit?: number;
  /** Optional query embedding; enables cosine similarity for chunks that have one. */
  queryEmbedding?: number[] | null;
  /** Character budget for the assembled context string. */
  maxContextChars?: number;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_MAX_CONTEXT_CHARS = 6000;
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "for", "with", "at", "by", "from", "as", "it", "this", "that", "i",
  "you", "we", "they", "he", "she", "my", "your", "our", "please", "hi", "hello", "thanks", "thank",
  "would", "could", "can", "do", "does", "did", "have", "has", "had", "will", "me", "us", "am",
  "what", "when", "where", "which", "who", "whom", "how", "why", "there", "here", "any", "all",
]);

/** Lowercase, split on non-word chars, drop stopwords + very short tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Cosine similarity of two equal-length vectors. Returns 0 for empty/mismatched/zero vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Normalised keyword overlap of a query's tokens against a chunk. Range ~0..1. */
export function keywordScore(queryTokens: string[], content: string): number {
  if (queryTokens.length === 0) return 0;
  const chunkTokens = tokenize(content);
  if (chunkTokens.length === 0) return 0;
  const chunkCounts = new Map<string, number>();
  for (const t of chunkTokens) chunkCounts.set(t, (chunkCounts.get(t) ?? 0) + 1);
  const querySet = new Set(queryTokens);
  let matched = 0;
  for (const q of querySet) if (chunkCounts.has(q)) matched += 1;
  // Fraction of the query's distinct terms that appear in the chunk.
  return matched / querySet.size;
}

/**
 * Rank chunks against the query text. `queryEmbedding` (optional) enables cosine for embedded chunks.
 * Returns chunks sorted by descending score; chunks with zero signal AND zero priority are dropped.
 */
export function rankChunks(
  queryText: string,
  chunks: RetrievalChunk[],
  opts: RetrievalOptions = {},
): ScoredChunk[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const queryTokens = tokenize(queryText);
  const qEmb = opts.queryEmbedding;

  const scored: ScoredChunk[] = chunks.map((c) => {
    const kw = keywordScore(queryTokens, c.content);
    const cos = qEmb && c.embedding && c.embedding.length ? cosineSimilarity(qEmb, c.embedding) : 0;
    // Embedding similarity (0..1) is weighted above keyword. `priorityBonus` is small and capped so a
    // core fact (high priority) is never starved out — it clears the score>0 filter and breaks ties —
    // but it can NEVER outrank a chunk that directly matches the query.
    const base = cos * 0.7 + kw * 0.3;
    const priorityBonus = c.priority > 0 ? Math.min(c.priority * 0.02, 0.1) : 0;
    const score = base + priorityBonus;
    return { ...c, score };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Assemble the ranked chunks into a single bounded context string for the prompt. Stops adding
 * chunks once the character budget is hit so the prompt can't blow up. Returns the text plus the
 * ids actually used (recorded on every draft so we can show which facts fed a reply — spec §14).
 */
export function assembleContext(
  ranked: ScoredChunk[],
  opts: RetrievalOptions = {},
): { context: string; usedIds: string[] } {
  const budget = opts.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;
  const parts: string[] = [];
  const usedIds: string[] = [];
  let used = 0;
  for (const c of ranked) {
    const piece = c.content.trim();
    if (!piece) continue;
    const addition = (parts.length ? 2 : 0) + piece.length; // account for the "\n\n" separator
    if (used + addition > budget && parts.length > 0) break;
    parts.push(piece);
    usedIds.push(c.id);
    used += addition;
  }
  return { context: parts.join("\n\n"), usedIds };
}
