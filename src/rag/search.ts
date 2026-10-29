// ─────────────────────────────────────────────────────────────
// SEARCH: find the chunks most related to a question
// Used by the RAG answer AND by the agent's searchPolicy tool.
// ─────────────────────────────────────────────────────────────
import { config } from "../config.js";
import { getStore } from "./store.js";

export type Chunk = {
  text: string;
  source: string; // file name, e.g. "refunds.md"
  score: number; // 0 to 1, higher = more related
};

// Connect on first use (not at import), then reuse the same store
let storePromise: ReturnType<typeof getStore> | undefined;

export async function searchDocs(question: string): Promise<Chunk[]> {
  storePromise ??= getStore();
  const store = await storePromise;

  // Postgres finds the closest chunks
  const results = await store.similaritySearchWithScore(question, config.topK);

  // Turn LangChain's [document, score] pairs into simple objects
  const chunks = results.map(([doc, score]) => ({
    text: doc.pageContent,
    source: String(doc.metadata["source"]),
    score,
  }));

  // Keep only the related ones
  return chunks.filter((chunk) => chunk.score >= config.minScore);
}

// Chunks → one text block for a prompt: "- [refunds.md] Card refunds take..."
export function chunksToText(chunks: Chunk[]): string {
  return chunks.map((chunk) => `- [${chunk.source}] ${chunk.text}`).join("\n");
}
