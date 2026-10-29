// ─────────────────────────────────────────────────────────────
// ALL SETTINGS IN ONE PLACE
// Change a model, a URL or a number here, nowhere else.
// ─────────────────────────────────────────────────────────────

export const config = {
  // Postgres (the Docker container "rag-db")
  databaseUrl: "postgres://postgres:postgres@localhost:5433/rag",

  // Ollama models
  embedModel: "nomic-embed-text", // text → 768 numbers
  ragModel: "llama3:latest", // answers policy questions (100% on our evals)
  agentModel: "qwen2.5:7b", // the agent (must support tool calling)

  // Documents
  docsFolder: "docs",
  chunkSize: 300, // max characters per chunk
  chunkOverlap: 30, // characters repeated between chunks

  // Search
  topK: 4, // how many chunks to fetch
  minScore: 0.8, // ignore chunks below this (LangChain's 0–1 similarity scale)

  // OTP
  otpSecret: process.env.OTP_SECRET ?? "dev-only-secret-change-me",
  otpMinutes: 5, // code expires after 5 minutes
  otpMaxAttempts: 3, // wrong tries before the code is blocked
};
