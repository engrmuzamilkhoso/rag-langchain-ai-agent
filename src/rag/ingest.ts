// ─────────────────────────────────────────────────────────────
// INGEST: run ONCE (and again whenever the docs change)
// docs/*.md → Documents → chunks → numbers → Postgres
// Run: npm run ingest
// ─────────────────────────────────────────────────────────────
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "../config.js";
import { pool } from "../db.js";
import { getStore } from "./store.js";

// STEP 1: LOAD — one Document per .md file
const files = readdirSync(config.docsFolder).filter((file) => file.endsWith(".md"));

const documents = files.map(
  (file) =>
    new Document({
      pageContent: readFileSync(join(config.docsFolder, file), "utf8"),
      metadata: { source: file },
    }),
);

// STEP 2: SPLIT — cut each document into small chunks
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: config.chunkSize,
  chunkOverlap: config.chunkOverlap,
});
const chunks = await splitter.splitDocuments(documents);

console.log(`Loaded ${files.length} files → ${chunks.length} chunks`);

// STEP 3: EMBED + SAVE — clear old rows, then add the new chunks
const store = await getStore();
await pool.query("DELETE FROM lc_documents");
await store.addDocuments(chunks);

console.log("Saved to Postgres.");
await pool.end();
