// ─────────────────────────────────────────────────────────────
// ONE DATABASE CONNECTION, shared by the whole app
// ─────────────────────────────────────────────────────────────
import pg from "pg";
import { config } from "./config.js";

// Keep DATE columns as plain text ("2026-09-03"), so no timezone shifts the day
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
