// ─────────────────────────────────────────────────────────────
// RAG ANSWER: question → search → prompt → AI → answer
// Run one question: npm run ask -- "How long do card refunds take?"
// ─────────────────────────────────────────────────────────────
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama } from "@langchain/ollama";
import { config } from "../config.js";
import { chunksToText, searchDocs } from "./search.js";

export const REFUSAL = "I don't know, please contact support.";

// The prompt template: {context} and {question} are filled in later
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a support assistant for a payment company.
Answer using ONLY the documents below. Keep the answer short.
The user may use different words than the documents (for example "stuck" may mean "held"). Match their situation to the closest rule.
If a document describes a possible reason for the user's problem, explain that reason.
If nothing in the documents is related to the question, say: "${REFUSAL}"

DOCUMENTS:
{context}`,
  ],
  ["human", "{question}"],
]);

const model = new ChatOllama({ model: config.ragModel, temperature: 0 });

// The chain: prompt → AI → plain text
const chain = prompt.pipe(model).pipe(new StringOutputParser());

export async function answerQuestion(question: string): Promise<{ text: string; sources: string[] }> {
  // 1. RETRIEVE
  const chunks = await searchDocs(question);

  // Nothing related → refuse without calling the AI
  if (chunks.length === 0) {
    return { text: REFUSAL, sources: [] };
  }

  // 2. AUGMENT + 3. GENERATE
  const text = await chain.invoke({ context: chunksToText(chunks), question });

  // Unique file names, e.g. ["refunds.md"]
  const sources = [...new Set(chunks.map((chunk) => chunk.source))];

  return { text, sources };
}
