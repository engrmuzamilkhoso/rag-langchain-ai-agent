// ─────────────────────────────────────────────────────────────
// THE VECTOR STORE: where chunks + their numbers live (Postgres + pgvector)
// ─────────────────────────────────────────────────────────────
import { OllamaEmbeddings } from "@langchain/ollama";
import { PGVectorStore } from "@langchain/pgvector";
import { config } from "../config.js";
import { pool } from "../db.js";

// Turns text into 768 numbers
const embeddings = new OllamaEmbeddings({ model: config.embedModel });

// Connects to Postgres. Creates the table "lc_documents" the first time.
export function getStore(): Promise<PGVectorStore> {
  return PGVectorStore.initialize(embeddings, {
    pool, // reuse the app's one connection
    tableName: "lc_documents",
    distanceStrategy: "cosine",
    dimensions: 768,
    scoreNormalization: "similarity", // higher score = more similar (0 to 1)
  });
}
