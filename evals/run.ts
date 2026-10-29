// ─────────────────────────────────────────────────────────────
// RUN THE EXAM: ask every question, check every answer, print the score
// Run: npm run eval
// ─────────────────────────────────────────────────────────────
import { pool } from "../src/db.js";
import { answerQuestion } from "../src/rag/answer.js";
import { cases } from "./cases.js";

let searchPassed = 0;
let searchTotal = 0;
let answersPassed = 0;

for (const testCase of cases) {
  const { text, sources } = await answerQuestion(testCase.question);
  const answer = text.toLowerCase();

  // CHECK 1: is the answer correct?
  const answerOk = testCase.expectRefusal
    ? answer.includes("don't know")
    : (testCase.mustContainAny ?? []).some((word) => answer.includes(word.toLowerCase()));

  if (answerOk) answersPassed++;

  // CHECK 2: did search find the right file?
  let searchNote = "";
  if (testCase.expectedSource) {
    searchTotal++;
    const found = sources.includes(testCase.expectedSource);
    if (found) searchPassed++;
    searchNote = found ? "search ✅" : `search ❌ (expected ${testCase.expectedSource})`;
  }

  console.log(`${answerOk ? "✅" : "❌"} ${testCase.question}`);
  if (searchNote) console.log(`   ${searchNote}`);
  if (!answerOk) console.log(`   answer: ${text}`);
}

const percent = (passed: number, total: number) => `${passed}/${total} (${Math.round((passed / total) * 100)}%)`;

console.log("\n========== RESULTS ==========");
console.log(`Search:  ${percent(searchPassed, searchTotal)}`);
console.log(`Answers: ${percent(answersPassed, cases.length)}`);

await pool.end();
