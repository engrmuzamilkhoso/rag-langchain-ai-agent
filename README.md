# rag-langchain

A support assistant for a payment company, built with LangChain.js, PostgreSQL + pgvector and Ollama.

- **RAG**: answers policy questions (refunds, settlements, API rules) from Markdown documents, with sources
- **Agent**: verifies the customer with an OTP, then shows their own statement from the database
- **Evals**: a 15-question exam that measures search and answer accuracy

## How it works

```
INGEST (once)    docs/*.md → split into chunks → embed → Postgres (pgvector)

RAG              question → search Postgres → prompt with the chunks → AI → answer + sources

AGENT            message → AI decides → tool? → your code runs it → result back to AI → answer
                 tools: searchPolicy · startVerification · verifyCode · getStatement
```

## Folders

```
public/
  index.html         the web chat page
src/
  server.ts          web server: the chat page + /api/chat
  config.ts          all settings (models, URLs, numbers)
  db.ts              one Postgres connection
  rag/
    store.ts         the vector store (pgvector)
    ingest.ts        docs → chunks → Postgres
    search.ts        find related chunks
    answer.ts        the RAG chain: search → prompt → AI
    ask.ts           ask one question from the command line
  agent/
    otp.ts           find customer, send code, check code (no AI)
    session.ts       who is talking, are they verified
    format.ts        money formatting (DEBIT / CREDIT)
    sms.ts           pretend SMS provider (feeds the demo phone)
    tools.ts         the 4 tools + security checks
    grounding.ts     checks the AI's tool arguments against what the customer really typed
    prompt.ts        the agent's instructions
    agent.ts         the agent loop
    chat.ts          chat in the terminal
evals/
  cases.ts           the questions + expected answers
  run.ts             runs the exam, prints the score
sql/
  schema.sql         tables + sample data for the agent
docs/                the policy documents
```

## Run it

Copy `.env.example` to `.env` and set `OTP_SECRET` (or set it in your environment).

Needs Docker (Postgres + pgvector on port 5433) and Ollama with `nomic-embed-text`, `llama3:latest` and `qwen2.5:7b`.

```bash
npm install
npm run ingest                                    # load the docs (once)
npm start                                         # web chat → http://localhost:3000
npm run dev                                       # same, restarts when you save a file
npm run ask -- "How long do card refunds take?"   # one RAG question in the terminal
npm run eval                                      # the exam
npm run chat                                      # talk to the agent in the terminal
```

The web chat shows which tools the agent called, the session state (not verified / code sent / verified),
and a **demo phone** that receives the simulated OTP SMS.

## Security decisions

- The OTP code is **never** returned to the AI. It's hashed (HMAC-SHA256), expires in 5 minutes, and allows 3 attempts.
- Verification is stored in the **session, in code**. The AI cannot mark anyone as verified.
- `getStatement` takes only a month. The customer ID always comes from the session, so the AI can't request another customer's data.
- Money stays as exact text from Postgres (`NUMERIC`), and statements show DEBIT/CREDIT explicitly.
- **Tool arguments are never trusted.** Zod checks the format, and `grounding.ts` checks the value:
  the OTP code must appear in the customer's last message, and the month must have been mentioned.
  (In testing, the model invented a code and guessed a month. A prompt didn't fix that; code did.)
- One chat answers one message at a time (HTTP 409 otherwise), so the history can't get mixed up.

## Database setup

```bash
docker run -d --name rag-db -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rag pgvector/pgvector:pg16
docker exec -i rag-db psql -U postgres -d rag < sql/schema.sql
```

The `lc_documents` table is created automatically by LangChain on the first ingest.

## Not production-ready yet

- Sessions live in memory: a server restart clears every chat (production: Redis, with expiry)
- The chat id is kept in `sessionStorage` (production: an httpOnly cookie)
- No rate limiting, streaming, tracing, or log masking yet
- Evals cover RAG answers, not the agent flow
- Runs on local models via Ollama (cloud deployment needs a hosted model API)
- Next: a LangGraph version of the agent

