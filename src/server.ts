// ─────────────────────────────────────────────────────────────
// WEB SERVER: the chat page + a small API
// Run: npm start   →   open http://localhost:3000
// ─────────────────────────────────────────────────────────────
import express from "express";
import { createAgent } from "./agent/agent.js";
import { latestSms } from "./agent/sms.js";

const app = express();
app.use(express.json());
app.use(express.static("public")); // serves public/index.html

type Agent = ReturnType<typeof createAgent>;

// One agent per browser chat (each has its own session + history)
const agents = new Map<string, Agent>();

// Chats that are answering RIGHT NOW (one message at a time per chat)
const busy = new Set<string>();

function getAgent(chatId: string): Agent {
  let agent = agents.get(chatId);
  if (!agent) {
    agent = createAgent();
    agents.set(chatId, agent);
  }
  return agent;
}

// Who is the customer, as far as THIS chat's session knows
function sessionStatus(agent: Agent) {
  const { verifiedCustomer, pendingCustomer } = agent.session;
  if (verifiedCustomer) return { state: "verified", name: verifiedCustomer.name };
  if (pendingCustomer) return { state: "pending", name: null };
  return { state: "anonymous", name: null };
}

// ── Send a message to the agent ──
app.post("/api/chat", async (req, res) => {
  const { chatId, message } = req.body ?? {};

  if (typeof chatId !== "string" || typeof message !== "string" || message.trim() === "") {
    res.status(400).json({ error: "chatId and message are required" });
    return;
  }

  // Still answering the last message? Two replies at once would mix up the history.
  if (busy.has(chatId)) {
    res.status(409).json({ error: "Still answering your last message. Please wait." });
    return;
  }

  busy.add(chatId);
  try {
    const agent = getAgent(chatId);
    const toolCalls: { name: string; args: unknown }[] = [];

    const reply = await agent.reply(message, (name, args) => toolCalls.push({ name, args }));

    res.json({ reply, toolCalls, session: sessionStatus(agent) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong. Is Postgres and Ollama running?" });
  } finally {
    busy.delete(chatId); // runs on success AND on error
  }
});

// ── The chat so far (the page calls this after a refresh) ──
app.get("/api/history", (req, res) => {
  const chatId = req.query["chatId"];
  const agent = typeof chatId === "string" ? agents.get(chatId) : undefined;

  // Unknown chat (e.g. the server restarted) → empty, the page starts fresh
  if (typeof chatId !== "string" || !agent) {
    res.json({ messages: [], session: { state: "anonymous", name: null }, thinking: false });
    return;
  }
  res.json({
    messages: agent.transcript(),
    session: sessionStatus(agent),
    thinking: busy.has(chatId), // the page shows "thinking…" and checks again
  });
});

// ── Start a fresh chat ──
app.post("/api/reset", (req, res) => {
  const chatId = req.body?.chatId;
  if (typeof chatId === "string") agents.delete(chatId);
  res.json({ ok: true });
});

// ── DEMO ONLY: the pretend phone's SMS inbox ──
// In a real app the code goes to the customer's phone, never to a web API.
app.get("/api/demo/sms", (_req, res) => {
  res.json(latestSms());
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Chat running on http://localhost:${port}`);
});
