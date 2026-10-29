// ─────────────────────────────────────────────────────────────
// THE AGENT'S TOOLS
//
// Each tool has 2 parts:
//   ① the function → what YOUR CODE runs
//   ② the config   → what the AI reads (name, description, inputs)
//
// Security lives HERE, in code — not in the prompt.
// ─────────────────────────────────────────────────────────────
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pool } from "../db.js";
import { chunksToText, searchDocs } from "../rag/search.js";
import { formatAmount } from "./format.js";
import { userMentionedMonth, userTypedCode } from "./grounding.js";
import { checkCode, findCustomerByPhone, sendCode } from "./otp.js";
import type { Session } from "./session.js";

type Transaction = { txn_date: string; description: string; amount: string };

// The tools are made for ONE session (one chat)
export function createTools(session: Session) {
  // ── TOOL 1: search the policy documents (no verification needed) ──
  const searchPolicy = tool(
    async ({ query }) => {
      const chunks = await searchDocs(query);
      if (chunks.length === 0) {
        return 'No related policy found. Reply exactly: "I don\'t know, please contact support."';
      }

      // The customer's REAL words (the AI's query is only search keywords)
      const question = session.userMessages.at(-1) ?? query;

      // The instruction sits right next to the facts: small models follow the LAST thing they read
      return [
        `The customer asked: "${question}"`,
        "Answer ONLY that question, briefly. Leave out facts about other topics.",
        "If they ask why or what the reasons are, list ALL the reasons in the notes.",
        "These are general policies, not the customer's account: say what CAN cause it, never what DID.",
        "",
        "Policy notes:",
        chunksToText(chunks),
      ].join("\n");
    },
    {
      name: "searchPolicy",
      description: "Search the company's policy documents about refunds, settlements and API rules. Use it for general questions.",
      schema: z.object({
        query: z.string().describe("What to search for"),
      }),
    },
  );

  // ── TOOL 2: phone number → find the customer → send a code ──
  const startVerification = tool(
    async ({ phone }) => {
      const customer = await findCustomerByPhone(phone.trim());
      if (!customer) return "No customer found with that phone number.";

      session.pendingCustomer = customer;
      await sendCode(customer);

      // Only the last 4 digits, and NEVER the code itself
      return `A 6-digit code was sent by SMS to the number ending in ${customer.phone.slice(-4)}.`;
    },
    {
      name: "startVerification",
      description: "Start identity verification: find the customer by phone number and send them a one-time code by SMS.",
      schema: z.object({
        phone: z.string().describe("The customer's phone number, e.g. 03001234567"),
      }),
    },
  );

  // ── TOOL 3: check the code the customer typed ──
  const verifyCode = tool(
    async ({ code }) => {
      const customer = session.pendingCustomer;
      if (!customer) return "No verification in progress. Ask for the phone number first.";

      // 🛡️ The AI must not invent a code. Checked BEFORE checkCode, so no attempt is wasted.
      const lastMessage = session.userMessages.at(-1) ?? "";
      if (!userTypedCode(lastMessage, code)) {
        return "The customer has not typed a 6-digit code yet. Ask them for the code from their SMS.";
      }

      const result = await checkCode(customer.id, code);
      if (!result.ok) return result.reason;

      // 🔓 Verified — stored in CODE
      session.verifiedCustomer = customer;
      session.pendingCustomer = null;
      return `Verified. The customer's name is ${customer.name}.`;
    },
    {
      name: "verifyCode",
      description: "Check the 6-digit code the customer received by SMS.",
      schema: z.object({
        code: z.string().regex(/^\d{6}$/, "Code must be 6 digits").describe("The 6-digit code exactly as the customer typed it"),
      }),
    },
  );

  // ── TOOL 4: the statement — ONLY for a verified customer ──
  const getStatement = tool(
    async ({ month }) => {
      // 🔒 The security gate
      const customer = session.verifiedCustomer;
      if (!customer) return "NOT ALLOWED: the customer is not verified. Ask them to verify with their phone number first.";

      // 🛡️ The AI must not guess the month
      if (!userMentionedMonth(session.userMessages, month)) {
        return "MONTH NOT GIVEN: the customer has not said which month. Ask them which month they want.";
      }

      // customer.id comes from the SESSION — the AI only chooses the month
      const result = await pool.query<Transaction>(
        `SELECT txn_date, description, amount
         FROM transactions
         WHERE customer_id = $1 AND to_char(txn_date, 'YYYY-MM') = $2
         ORDER BY txn_date`,
        [customer.id, month],
      );
      if (result.rows.length === 0) return `No transactions found for ${month}.`;

      const lines = result.rows.map((row) => {
        const money = formatAmount(row.amount);
        return `${row.txn_date} | ${row.description} | ${money.type} | ${money.amount}`;
      });

      return `Statement for ${customer.name}, ${month}:\n${lines.join("\n")}`;
    },
    {
      name: "getStatement",
      description: "Get the verified customer's transactions for one month.",
      schema: z.object({
        month: z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM")
          .describe("The month the customer asked for, in YYYY-MM format. Ask the customer if they did not say."),
      }),
    },
  );

  return { searchPolicy, startVerification, verifyCode, getStatement };
}
