import { describe, it, expect } from "vitest";
import {
  tokenize,
  cosineSimilarity,
  keywordScore,
  rankChunks,
  assembleContext,
  type RetrievalChunk,
} from "./retrieval";
import { chunkText } from "./chunking";

describe("tokenize", () => {
  it("lowercases, splits, and drops stopwords + short tokens", () => {
    expect(tokenize("What are your Opening Hours on a Sunday?")).toEqual(["opening", "hours", "sunday"]);
  });
  it("returns empty for punctuation-only input", () => {
    expect(tokenize("!!! ... ???")).toEqual([]);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });
  it("is 0 for mismatched lengths or zero vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("keywordScore", () => {
  it("scores by fraction of distinct query terms present", () => {
    const q = tokenize("opening hours sunday");
    expect(keywordScore(q, "Our opening hours on Sunday are 9 to 5")).toBeCloseTo(1);
    expect(keywordScore(q, "We are open on weekdays")).toBe(0);
  });
});

describe("rankChunks", () => {
  const chunks: RetrievalChunk[] = [
    { id: "hours", content: "Opening hours: Monday to Friday 9am to 6pm", priority: 0 },
    { id: "pricing", content: "Airport transfer to Heathrow costs 55 pounds", priority: 0 },
    { id: "core", content: "We are a taxi firm based in Grays Essex", priority: 5 },
  ];

  it("ranks the most keyword-relevant chunk first", () => {
    const ranked = rankChunks("how much is a Heathrow airport transfer", chunks);
    expect(ranked[0]?.id).toBe("pricing");
  });

  it("keeps high-priority core facts even with no keyword overlap", () => {
    const ranked = rankChunks("completely unrelated zzz query", chunks);
    expect(ranked.map((c) => c.id)).toContain("core");
  });

  it("prefers embedding similarity when a query embedding is supplied", () => {
    const embedded: RetrievalChunk[] = [
      { id: "near", content: "alpha", priority: 0, embedding: [1, 0, 0] },
      { id: "far", content: "beta", priority: 0, embedding: [0, 1, 0] },
    ];
    const ranked = rankChunks("no keyword overlap here", embedded, { queryEmbedding: [0.9, 0.1, 0] });
    expect(ranked[0]?.id).toBe("near");
  });

  it("respects the limit", () => {
    expect(rankChunks("taxi", chunks, { limit: 1 }).length).toBeLessThanOrEqual(1);
  });
});

describe("assembleContext", () => {
  it("joins chunks and reports used ids", () => {
    const ranked = rankChunks("opening hours", [
      { id: "a", content: "Opening hours are 9 to 5", priority: 0 },
    ]);
    const { context, usedIds } = assembleContext(ranked);
    expect(context).toContain("Opening hours");
    expect(usedIds).toEqual(["a"]);
  });

  it("stops at the character budget", () => {
    const big: RetrievalChunk[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      content: "x".repeat(500),
      priority: 1,
    }));
    const ranked = rankChunks("x", big);
    const { usedIds } = assembleContext(ranked, { maxContextChars: 1200 });
    expect(usedIds.length).toBeLessThan(10);
    expect(usedIds.length).toBeGreaterThan(0);
  });
});

describe("chunkText", () => {
  it("returns empty for blank input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });
  it("keeps a short document as a single chunk", () => {
    expect(chunkText("Short fact about the business.")).toHaveLength(1);
  });
  it("splits long text into multiple bounded chunks", () => {
    const para = "This is a sentence about the business. ".repeat(60); // ~2300 chars
    const chunks = chunkText(para);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1200);
  });
});
