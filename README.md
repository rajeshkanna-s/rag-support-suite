# RAG AI Customer Support Chatbot

ragsupportsuite.netlify.app

Full-stack customer support chatbot built with Node.js, React, TypeScript, Supabase, and a Supabase AI Edge Function. It ingests your business documents, chunks them, stores the captured text and embeddings in Supabase, retrieves relevant context by support category, and asks the AI model to answer only from that context.

## Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons
- Backend: Node.js, Express, TypeScript
- Chat model: Supabase `functions/v1/ai-chat` endpoint
- Embeddings: OpenAI `text-embedding-3-small` when `OPENAI_API_KEY` is set, otherwise a local deterministic fallback for demos
- Database: Supabase Auth + Postgres
- Vector store: Supabase `knowledge_chunks` table with JSON embeddings, plus a local JSON fallback
- Document parsing: `.txt`, `.md`, `.pdf`, `.docx`

## Setup

```bash
npm run install:all
```

Create `backend/.env` from `backend/.env.example` and `frontend/.env.local` from `frontend/.env.example`.

```bash
SUPABASE_AI_CHAT_URL=https://your-project.supabase.co/functions/v1/ai-chat
SUPABASE_AI_API_KEY=your_supabase_publishable_key
AI_PROVIDER=openrouter
AI_MODEL_ID=your_model_id
AI_TOKEN_SLOT_ID=your_token_slot_id
OPENAI_API_KEY=
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Run [supabase/schema.sql](./supabase/schema.sql) in your Supabase SQL editor. It creates Auth profiles, the five support categories, knowledge tables, ticket tables, and row-level security policies. The first user who signs up after the schema is installed becomes `admin` automatically.

Then run:

```bash
npm run dev
```

Open `http://localhost:5173` or run the frontend on `http://localhost:5174`:

```bash
npm run dev --prefix frontend -- --port 5174
```

## Important Files

- `backend/src/ingest/ingestDocs.ts`: reads documents, chunks them, embeds them, and stores vectors
- `backend/src/services/ai.ts`: calls the Supabase AI Edge Function
- `backend/src/services/embedder.ts`: OpenAI embeddings or local fallback
- `backend/src/routes/knowledge.ts`: authenticated admin upload endpoints
- `supabase/schema.sql`: Supabase DB schema and RLS policies
- `backend/src/services/vectorStore.ts`: local vector database
- `backend/src/routes/chat.ts`: `POST /api/chat`
- `frontend/src/components/CustomerChat.tsx`: customer ticket chat by category
- `frontend/src/components/AdminDashboard.tsx`: admin data update dashboard

## API

`POST http://localhost:3001/api/chat`

```json
{
  "message": "What is your refund policy?",
  "category": "Accounts and Finance",
  "customerEmail": "customer@example.com",
  "conversationHistory": []
}
```

Response:

```json
{
  "answer": "You can request a return within 30 days...",
  "sources": ["sample-faq.txt"]
}
```
