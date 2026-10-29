// ─────────────────────────────────────────────────────────────
// THE AGENT: one chat, with its own session, tools and history
//
// For each user message:
//   AI decides → (tool? run it → give result back → AI again) → answer
// ─────────────────────────────────────────────────────────────
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { config } from "../config.js";
import { agentInstructions } from "./prompt.js";
import { createSession } from "./session.js";
import { createTools } from "./tools.js";

type ToolRequest = { name: string; args: Record<string, unknown>; id?: string };

// One chat bubble, as the web page shows it
export type ChatItem = {
  role: "user" | "bot";
  text: string;
  toolCalls: { name: string; args: unknown }[];
};

const MAX_STEPS = 5; // stop a confused AI from looping forever

export function createAgent() {
  // ── 1. This chat's session + tools ──
  const session = createSession();
  const tools = createTools(session);

  // ── 2. The AI, with its tool menu ──
  const model = new ChatOllama({ model: config.agentModel, temperature: 0 }).bindTools([
    tools.searchPolicy,
    tools.startVerification,
    tools.verifyCode,
    tools.getStatement,
  ]);

  // ── 3. The conversation (the AI has no memory, so we keep it) ──
  const today = new Date().toISOString().slice(0, 10); // "2026-10-23"
  const history: BaseMessage[] = [new SystemMessage(agentInstructions(today))];

  // ── 4. Run the tool the AI asked for (match by NAME) ──
  async function runTool(request: ToolRequest): Promise<ToolMessage> {
    const call = { ...request, id: request.id ?? "", type: "tool_call" as const };

    try {
      switch (request.name) {
        case "searchPolicy":
          return await tools.searchPolicy.invoke(call);
        case "startVerification":
          return await tools.startVerification.invoke(call);
        case "verifyCode":
          return await tools.verifyCode.invoke(call);
        case "getStatement":
          return await tools.getStatement.invoke(call);
        default:
          return new ToolMessage({ content: `Unknown tool: ${request.name}`, tool_call_id: call.id });
      }
    } catch (error) {
      // Bad arguments (Zod said no) → tell the AI, so it can ask the customer instead of crashing
      const reason = error instanceof Error ? error.message : String(error);
      return new ToolMessage({ content: `Tool error: ${reason}`, tool_call_id: call.id });
    }
  }

  // ── 5. Answer one user message ──
  async function reply(userText: string, onToolCall?: (name: string, args: unknown) => void): Promise<string> {
    history.push(new HumanMessage(userText));
    session.userMessages.push(userText); // the real words, for the tools' checks

    for (let step = 0; step < MAX_STEPS; step++) {
      // Ask the AI: answer, or a tool?
      const aiMessage = await model.invoke(history);
      history.push(aiMessage);

      // No tool requested → this is the final answer
      if (!aiMessage.tool_calls?.length) {
        return aiMessage.text;
      }

      // Tool(s) requested → run each one, add the result to the conversation
      for (const request of aiMessage.tool_calls) {
        onToolCall?.(request.name, request.args);
        history.push(await runTool(request));
      }
      // ...then loop: the AI reads the results and decides again
    }

    return "Sorry, I couldn't finish that. Please contact support.";
  }

  // ── 6. The chat so far, as bubbles (for the page after a refresh) ──
  // Skips the system prompt and raw tool results; tool calls become chips.
  function transcript(): ChatItem[] {
    const items: ChatItem[] = [];
    let toolCalls: ChatItem["toolCalls"] = [];

    for (const message of history) {
      if (message instanceof HumanMessage) {
        items.push({ role: "user", text: message.text, toolCalls: [] });
      } else if (message instanceof AIMessage) {
        if (message.tool_calls?.length) {
          // A tool request → remember it as chips for the next answer
          toolCalls.push(...message.tool_calls.map((call) => ({ name: call.name, args: call.args })));
        } else {
          items.push({ role: "bot", text: message.text, toolCalls });
          toolCalls = [];
        }
      }
    }
    return items;
  }

  return { reply, session, transcript };
}
