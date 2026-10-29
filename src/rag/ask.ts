// ─────────────────────────────────────────────────────────────
// ASK ONE QUESTION from the command line
// Run: npm run ask -- "Why is my merchant payout stuck?"
// ─────────────────────────────────────────────────────────────
import { pool } from "../db.js";
import { answerQuestion } from "./answer.js";

const question = process.argv[2] ?? "How long do card refunds take?";
const result = await answerQuestion(question);

console.log(`Question: ${question}`);
console.log(`Answer:   ${result.text}`);
console.log(`Sources:  ${result.sources.join(", ") || "none"}`);

await pool.end();
