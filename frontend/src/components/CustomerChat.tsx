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
    <section className="mx-auto flex h-[calc(100vh-140px)] max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden animate-fade-in-up">
      
      {/* Redesigned Header - Helpdesk Style */}
      <header className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-800 font-display uppercase">{category} Operations</h2>
            <p className="text-[11px] text-slate-500">RAG chatbot answers grounded in company knowledge base</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!fixedCategory && enabledDepartments.length > 1 ? (
            <select
              value={category}
              onChange={event => setCategory(event.target.value as SupportCategory)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition cursor-pointer"
            >
              {enabledDepartments.map(item => (
                <option key={item} className="bg-white text-slate-700">{item}</option>
              ))}
            </select>
          ) : (
            <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-indigo-600 uppercase">
              {category} Console
            </span>
          )}
          <input
            value={customerEmail}
            onChange={event => setCustomerEmail(event.target.value)}
            type="email"
            placeholder="Operator email (optional)"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
          />
        </div>
      </header>

      {/* Chat Messages Frame */}
      <div className="flex-1 overflow-y-auto px-5 py-6 bg-slate-50/30">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map(message => {
            const isUser = message.role === 'user';
            return (
              <article key={message.id} className={`group flex gap-4 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar indicator */}
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-200 shadow-sm ${
                    isUser 
                      ? 'bg-slate-100 border border-slate-200 text-slate-600' 
                      : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                  }`}
                >
                  {isUser ? <UserRound size={16} /> : <Bot size={16} />}
                </div>
                
                <div className={`min-w-0 flex-1 ${isUser ? 'text-right' : ''}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isUser ? 'Client Operator' : 'RAG Agent'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Bubble styling */}
                  <div className={`inline-block p-3.5 rounded-2xl border text-sm leading-relaxed text-left max-w-full ${
                    isUser
                      ? 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none'
                      : 'bg-white border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Citations / Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs justify-start">
                      {message.sources.map(source => (
                        <span key={source} className="inline-flex items-center gap-1 rounded-lg badge-indigo px-2.5 py-1 text-[10px] font-semibold tracking-tight">
                          <FileText size={11} aria-hidden="true" className="text-indigo-600" />
                          {source}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {/* Neural Engine processing loader */}
          {loading && (
            <article className="flex gap-4 animate-pulse">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                <Bot size={16} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Searching RAG Index...</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-2.5 text-xs font-semibold text-indigo-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 pulse-dot" />
                  Extracting context chunks from {category} vector storage...
                </div>
              </div>
            </article>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input controls panel */}
      <div className="border-t border-slate-100 bg-white px-5 py-4">
        <div className="mx-auto max-w-3xl">
          {/* Quick Prompts */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {quickPrompts[category].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitMessage(prompt)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/40 transition duration-150 transform hover:scale-[1.02] shadow-sm"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Unified chat form field */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Attach file reference"
              title="Attach file reference"
            >
              <Paperclip size={16} aria-hidden="true" />
            </button>
            
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={`Query ${category} knowledge index...`}
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-800 placeholder-slate-400 outline-none"
            />
            
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              aria-label="Send message"
              title="Send message"
            >
              <Send size={13} aria-hidden="true" />
            </button>
          </form>

          {/* Ticket metadata footer */}
          <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              {ticketId ? `Active Ticket ID: ${ticketId}` : 'A secure support ticket will be created on submit'}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={11} className="text-indigo-500" />
              {sourceList.length} indexed resource(s) cited
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
