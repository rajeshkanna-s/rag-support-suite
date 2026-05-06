import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  FileText,
  Paperclip,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { sendMessage } from '../services/api';
import {
  getEnabledDepartments,
  subscribeDepartments,
} from '../services/departmentSettings';
import { Message, SupportCategory } from '../types';

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

const quickPrompts: Record<SupportCategory, string[]> = {
  HR: ['Leave policy', 'Payroll document', 'Employee details'],
  Operation: ['Shipment status', 'Process exception', 'Vendor update'],
  'IT support': ['Login issue', 'Device problem', 'VPN not working'],
  'Accounts and Finance': ['Invoice status', 'Refund issue', 'Payment confirmation'],
  Sales: ['Pricing details', 'Product availability', 'Schedule a demo'],
};

interface CustomerChatProps {
  fixedCategory?: SupportCategory;
}

export function CustomerChat({ fixedCategory }: CustomerChatProps) {
  const [enabledDepartments, setEnabledDepartments] = useState<SupportCategory[]>(getEnabledDepartments);
  const [category, setCategory] = useState<SupportCategory>(fixedCategory ?? enabledDepartments[0] ?? 'HR');
  const [customerEmail, setCustomerEmail] = useState('');
  const [ticketId, setTicketId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: createId(),
      role: 'assistant',
      content: 'Hi. Ask your support question and I will answer from the company knowledge base.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sourceList = useMemo(() => {
    return [...new Set(messages.flatMap(message => message.sources ?? []))];
  }, [messages]);

  useEffect(() => {
    return subscribeDepartments(() => {
      const next = getEnabledDepartments();
      setEnabledDepartments(next);
      if (fixedCategory) return;
      if (!next.includes(category)) {
        setCategory(next[0] ?? 'HR');
      }
    });
  }, [category, fixedCategory]);

  useEffect(() => {
    if (fixedCategory && fixedCategory !== category) {
      setCategory(fixedCategory);
      setTicketId(undefined);
      setMessages([
        {
          id: createId(),
          role: 'assistant',
          content: `Hi. You are chatting with ${fixedCategory} support. Ask your question below.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [category, fixedCategory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function submitMessage(nextInput = input) {
    const trimmed = nextInput.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(trimmed, category, messages, customerEmail, ticketId);
      setTicketId(response.ticketId);
      setMessages(previous => [
        ...previous,
        {
          id: createId(),
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(previous => [
        ...previous,
        {
          id: createId(),
          role: 'assistant',
          content: 'The support service is not available right now. Please try again shortly.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-132px)] max-w-5xl flex-col rounded-md border border-zinc-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ocean text-white">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{category} Support</h2>
            <p className="text-xs text-zinc-500">AI answers grounded in company data</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!fixedCategory && enabledDepartments.length > 1 ? (
            <select
              value={category}
              onChange={event => setCategory(event.target.value as SupportCategory)}
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-ocean"
            >
              {enabledDepartments.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm">
              {category}
            </span>
          )}
          <input
            value={customerEmail}
            onChange={event => setCustomerEmail(event.target.value)}
            type="email"
            placeholder="email optional"
            className="h-9 w-44 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-ocean"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map(message => (
            <article key={message.id} className="group flex gap-4">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                  message.role === 'user' ? 'bg-zinc-200 text-zinc-700' : 'bg-ocean text-white'
                }`}
              >
                {message.role === 'user' ? <UserRound size={17} /> : <Bot size={17} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold">{message.role === 'user' ? 'You' : 'Support AI'}</span>
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                    {message.sources.map(source => (
                      <span key={source} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1">
                        <FileText size={13} aria-hidden="true" />
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}

          {loading && (
            <article className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ocean text-white">
                <Bot size={17} aria-hidden="true" />
              </div>
              <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
                Searching {category} knowledge...
              </div>
            </article>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts[category].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitMessage(prompt)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-ocean hover:text-ocean"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-md border border-zinc-300 bg-white p-2 shadow-sm focus-within:border-ocean focus-within:ring-2 focus-within:ring-ocean/15">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
              aria-label="Attach file"
              title="Attach file"
            >
              <Paperclip size={19} aria-hidden="true" />
            </button>
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={`Message ${category} support`}
              className="max-h-32 min-h-10 flex-1 resize-none px-1 py-2 text-[15px] leading-6 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ocean text-white transition hover:bg-teal-800 disabled:bg-zinc-200 disabled:text-zinc-400"
              aria-label="Send message"
              title="Send message"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{ticketId ? `Ticket ${ticketId}` : 'Ticket will be created after the first response'}</span>
            <span>{sourceList.length} source(s)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
