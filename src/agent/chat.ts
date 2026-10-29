// ─────────────────────────────────────────────────────────────
// CHAT IN THE TERMINAL
// Run: npm run chat
// ─────────────────────────────────────────────────────────────
import * as readline from "node:readline/promises";
import { pool } from "../db.js";
import { createAgent } from "./agent.js";

const agent = createAgent();
const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(`Bot: Hi! How can I help you today? (type "exit" to quit)\n`);

while (true) {
  const userText = await terminal.question("You: ");
  if (userText.trim().toLowerCase() === "exit") break;

  const answer = await agent.reply(userText, (name, args) => {
    console.log(`   🔧 ${name}(${JSON.stringify(args)})`); // show which tool the AI chose
  });

  console.log(`Bot: ${answer}\n`);
}

terminal.close();
await pool.end();
