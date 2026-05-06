import dotenv from 'dotenv';
import { ChatMessage, ChatResponse } from '../types';

dotenv.config();

const SYSTEM_PROMPT = `You are a NotebookLM-style RAG customer support assistant.

First understand the customer's question, then synthesize a clear answer using ONLY the provided documentation context.

Rules:
- If the context is empty or does not answer the question, say you do not have enough information and suggest contacting a human support agent.
- Do not invent policies, prices, delivery estimates, or legal/billing details.
- Do not copy long raw chunks. Rewrite the answer naturally from the relevant source content.
- Be concise, friendly, and professional.
- For short questions, answer directly in 2-5 bullets or a short paragraph.
- Include key numbers, dates, limits, and conditions from the source.
- Do not create markdown tables.
- End with a short source citation using the document name when possible.`;

interface SupabaseAiResponse {
  content?: string;
  error?: string | { message?: string };
}

function fallbackAnswer(context: string): ChatResponse {
  return {
    answer: context
      ? 'I found relevant documentation, but the Supabase AI function is not configured yet. Add SUPABASE_AI_CHAT_URL, SUPABASE_AI_API_KEY, AI_MODEL_ID, and AI_TOKEN_SLOT_ID in backend/.env.'
      : 'I could not find enough information in the uploaded documents. Please contact a human support agent.',
    sources: [],
  };
}

function buildPrompt(userMessage: string, context: string, conversationHistory: ChatMessage[]): string {
  const recentHistory = conversationHistory
    .slice(-4)
    .map(message => `${message.role === 'assistant' ? 'Assistant' : 'Customer'}: ${message.content}`)
    .join('\n');

  return `${SYSTEM_PROMPT}

Recent conversation:
${recentHistory || 'No previous conversation.'}

Documentation context:
${context || 'No relevant documentation found.'}

Customer question:
${userMessage}

Write the final customer support answer now.`;
}

export async function generateAnswer(
  userMessage: string,
  context: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  const functionUrl =
    process.env.SUPABASE_AI_CHAT_URL ||
    (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/functions/v1/ai-chat` : '');
  const apiKey = process.env.SUPABASE_AI_API_KEY || process.env.SUPABASE_ANON_KEY;
  const modelId = process.env.AI_MODEL_ID;
  const tokenSlotId = process.env.AI_TOKEN_SLOT_ID;

  if (!functionUrl || !apiKey || !modelId || !tokenSlotId) {
    return fallbackAnswer(context);
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      provider: process.env.AI_PROVIDER || 'openrouter',
      modelId,
      tokenSlotId,
      prompt: buildPrompt(userMessage, context, conversationHistory),
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: Number.parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
      attempt_timeout_ms: Number.parseInt(process.env.AI_ATTEMPT_TIMEOUT_MS || '10000', 10),
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase AI function failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as SupabaseAiResponse;
  if (data.error) {
    const errorMessage = typeof data.error === 'string' ? data.error : data.error.message;
    throw new Error(errorMessage || 'Supabase AI function returned an error.');
  }

  const answer = data.content?.trim() || '';

  return {
    answer: answer || 'I do not have enough information to answer that from the available documentation.',
    sources: [],
  };
}
