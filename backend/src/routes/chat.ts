import { Router } from 'express';
import { ChatRequest, SUPPORT_CATEGORIES, SupportCategory } from '../types';
import { generateAnswer } from '../services/ai';
import { buildContext, retrieveRelevantChunks } from '../services/retriever';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';

const router = Router();

function isCategory(category: unknown): category is SupportCategory {
  return typeof category === 'string' && SUPPORT_CATEGORIES.includes(category as SupportCategory);
}

async function saveConversation(input: {
  ticketId?: string;
  category: SupportCategory;
  customerEmail?: string;
  userMessage: string;
  answer: string;
  sources: string[];
}): Promise<string | undefined> {
  if (!isSupabaseConfigured()) {
    return input.ticketId;
  }

  const supabase = getSupabaseClient();
  let ticketId = input.ticketId;

  if (!ticketId) {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        category: input.category,
        customer_email: input.customerEmail || null,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Could not create support ticket:', error.message);
    } else {
      ticketId = data.id as string;
    }
  }

  if (ticketId) {
    const { error } = await supabase.from('conversation_messages').insert([
      {
        ticket_id: ticketId,
        role: 'user',
        content: input.userMessage,
        sources: [],
      },
      {
        ticket_id: ticketId,
        role: 'assistant',
        content: input.answer,
        sources: input.sources,
      },
    ]);

    if (error) {
      console.warn('Could not save conversation messages:', error.message);
    }
  }

  return ticketId;
}

router.post('/', async (req, res) => {
  const {
    message,
    category,
    customerEmail,
    ticketId,
    conversationHistory = [],
  }: ChatRequest = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!isCategory(category)) {
    return res.status(400).json({ error: 'A valid support category is required' });
  }

  try {
    const chunks = await retrieveRelevantChunks(message, category);
    const context = buildContext(chunks);
    const sources = [...new Set(chunks.map(chunk => chunk.source))];
    const result =
      chunks.length === 0
        ? {
            answer:
              'I do not have enough information in the uploaded company documents to answer that. Please add the relevant policy in Admin Studio.',
            sources: [],
          }
        : await generateAnswer(message, context, conversationHistory);
    const savedTicketId = await saveConversation({
      ticketId,
      category,
      customerEmail,
      userMessage: message,
      answer: result.answer,
      sources,
    });

    return res.json({
      ...result,
      ticketId: savedTicketId,
      sources,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
