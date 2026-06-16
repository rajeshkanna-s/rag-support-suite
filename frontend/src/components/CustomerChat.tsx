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
import { Message, SUPPORT_CATEGORIES, SupportCategory } from '../types';

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
  onCategoryChange?: (category: SupportCategory) => void;
}

// React-based Markdown rendering helper for beautiful structured content
function FormattedMessage({ content, isUser = false }: { content: string; isUser?: boolean }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = 0;
    let remaining = text;
    
    while (remaining) {
      const boldIdx = remaining.indexOf('**');
      const codeIdx = remaining.indexOf('`');
      
      if (boldIdx === -1 && codeIdx === -1) {
        parts.push(...parseItalics(remaining, key));
        break;
      }
      
      if (boldIdx !== -1 && (codeIdx === -1 || boldIdx < codeIdx)) {
        if (boldIdx > 0) {
          parts.push(...parseItalics(remaining.substring(0, boldIdx), key));
        }
        const endBoldIdx = remaining.indexOf('**', boldIdx + 2);
        if (endBoldIdx !== -1) {
          const boldText = remaining.substring(boldIdx + 2, endBoldIdx);
          parts.push(
            <strong 
              key={`b-${key++}`} 
              className={`font-semibold ${isUser ? 'text-white font-bold' : 'text-slate-900'}`}
            >
              {boldText}
            </strong>
          );
          remaining = remaining.substring(endBoldIdx + 2);
        } else {
          parts.push(<span key={`t-${key++}`}>**</span>);
          remaining = remaining.substring(boldIdx + 2);
        }
      } else {
        if (codeIdx > 0) {
          parts.push(...parseItalics(remaining.substring(0, codeIdx), key));
        }
        const endCodeIdx = remaining.indexOf('`', codeIdx + 1);
        if (endCodeIdx !== -1) {
          const codeText = remaining.substring(codeIdx + 1, endCodeIdx);
          parts.push(
            <code 
              key={`c-${key++}`} 
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isUser 
                  ? 'bg-indigo-700/60 border border-indigo-500/20 text-white' 
                  : 'bg-slate-100 border border-slate-200/60 text-indigo-600'
              }`}
            >
              {codeText}
            </code>
          );
          remaining = remaining.substring(endCodeIdx + 1);
        } else {
          parts.push(<span key={`t-${key++}`}>`</span>);
          remaining = remaining.substring(codeIdx + 1);
        }
      }
    }
    
    return parts;
  };

  const parseItalics = (text: string, baseKey: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = baseKey;
    let remaining = text;
    
    while (remaining) {
      const italicIdx = remaining.indexOf('*');
      if (italicIdx === -1) {
        parts.push(<span key={`text-${key++}`}>{remaining}</span>);
        break;
      }
      
      if (italicIdx > 0) {
        parts.push(<span key={`text-${key++}`}>{remaining.substring(0, italicIdx)}</span>);
      }
      
      const endItalicIdx = remaining.indexOf('*', italicIdx + 1);
      if (endItalicIdx !== -1) {
        const italicText = remaining.substring(italicIdx + 1, endItalicIdx);
        parts.push(
          <em 
            key={`em-${key++}`} 
            className={`italic ${isUser ? 'text-indigo-100' : 'text-slate-600'}`}
          >
            {italicText}
          </em>
        );
        remaining = remaining.substring(endItalicIdx + 1);
      } else {
        parts.push(<span key={`text-${key++}`}>*</span>);
        remaining = remaining.substring(italicIdx + 1);
      }
    }
    return parts;
  };

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul 
          key={`list-${listKey++}`} 
          className={`list-none pl-0 my-3 space-y-2.5 ${isUser ? 'text-white/95' : 'text-slate-700'}`}
        >
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      const headerText = trimmed.substring(4);
      elements.push(
        <h4 
          key={`h3-${i}`} 
          className={`text-sm font-bold mt-4 mb-2 first:mt-0 font-display flex items-center gap-2 border-b pb-1.5 ${
            isUser ? 'text-white border-white/10' : 'text-indigo-950 border-slate-100'
          }`}
        >
          {parseInline(headerText)}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      const headerText = trimmed.substring(3);
      elements.push(
        <h3 
          key={`h2-${i}`} 
          className={`text-base font-bold mt-4 mb-2.5 first:mt-0 font-display border-b pb-1.5 ${
            isUser ? 'text-white border-white/10' : 'text-indigo-950 border-slate-100'
          }`}
        >
          {parseInline(headerText)}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      const headerText = trimmed.substring(2);
      elements.push(
        <h2 
          key={`h1-${i}`} 
          className={`text-lg font-bold mt-5 mb-3 first:mt-0 font-display border-b pb-2 ${
            isUser ? 'text-white border-white/10' : 'text-slate-900 border-slate-200/80'
          }`}
        >
          {parseInline(headerText)}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const listContent = trimmed.substring(2).trim();
      const firstChar = listContent.charAt(0);
      const isEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(listContent.substring(0, 2)) || 
                      /[\u2600-\u27BF]/.test(firstChar) ||
                      (firstChar >= '\u2000' && firstChar <= '\u32FF');
      
      if (isEmoji) {
        let emojiLength = 2;
        if (/[\u2600-\u27BF]/.test(firstChar) || (firstChar >= '\u2000' && firstChar <= '\u32FF')) {
          emojiLength = 1;
        }
        const matches = listContent.match(/^(\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udd00-\udfff]|[\u2600-\u27bf])\s*(.*)/i);
        if (matches) {
          const emoji = matches[1];
          const rest = matches[2];
          currentList.push(
            <li key={`li-${i}`} className="flex items-start gap-2.5 pl-1 text-[13.5px]">
              <span className="text-base shrink-0 select-none mt-0.5">{emoji}</span>
              <span className="flex-1 leading-relaxed">{parseInline(rest)}</span>
            </li>
          );
        } else {
          const emoji = listContent.substring(0, emojiLength);
          const rest = listContent.substring(emojiLength).trim();
          currentList.push(
            <li key={`li-${i}`} className="flex items-start gap-2.5 pl-1 text-[13.5px]">
              <span className="text-base shrink-0 select-none mt-0.5">{emoji}</span>
              <span className="flex-1 leading-relaxed">{parseInline(rest)}</span>
            </li>
          );
        }
      } else {
        currentList.push(
          <li key={`li-${i}`} className="flex items-start gap-2.5 pl-1 text-[13.5px]">
            <span 
              className={`h-1.5 w-1.5 rounded-full shrink-0 select-none mt-2 ${
                isUser ? 'bg-white/80' : 'bg-indigo-500'
              }`} 
            />
            <span className="flex-1 leading-relaxed">{parseInline(listContent)}</span>
          </li>
        );
      }
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        const num = match[1];
        const content = match[2];
        elements.push(
          <div 
            key={`ol-${i}`} 
            className={`flex items-start gap-2.5 my-2.5 pl-1 text-[13.5px] ${isUser ? 'text-white/95' : 'text-slate-700'}`}
          >
            <span 
              className={`font-bold min-w-[1.25rem] text-center text-[10px] px-1.5 py-0.5 rounded mt-0.5 ${
                isUser ? 'bg-indigo-700/80 text-white' : 'bg-indigo-50 text-indigo-600 font-bold'
              }`}
            >
              {num}
            </span>
            <span className="flex-1 leading-relaxed">{parseInline(content)}</span>
          </div>
        );
      }
    } else if (trimmed === '') {
      flushList();
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
    } else {
      flushList();
      elements.push(
        <p 
          key={`p-${i}`} 
          className={`leading-relaxed my-2 first:mt-0 last:mb-0 text-[13.5px] ${
            isUser ? 'text-white/95' : 'text-slate-700'
          }`}
        >
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

export function CustomerChat({ fixedCategory, onCategoryChange }: CustomerChatProps) {
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

  const isActive = enabledDepartments.includes(category);

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
  }, [fixedCategory]);

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
    <section className="flex-1 w-full max-w-none flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100/50 overflow-hidden animate-fade-in-up">
      
      {/* Redesigned Header - Premium Helpdesk Style */}
      <header className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/10 px-5 py-4.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-50 to-violet-50 border border-indigo-100/80 text-indigo-600 shadow-sm transition-transform hover:scale-105">
            <Sparkles size={18} className="animate-pulse text-indigo-500" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-slate-800 font-display uppercase">{category} Operations</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
                Live Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">RAG chatbot answers grounded in company knowledge base</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {SUPPORT_CATEGORIES.length > 1 ? (
            <select
              value={category}
              onChange={event => {
                const newCategory = event.target.value as SupportCategory;
                setCategory(newCategory);
                if (onCategoryChange) {
                  onCategoryChange(newCategory);
                }
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition cursor-pointer shadow-sm"
            >
              {SUPPORT_CATEGORIES.map(item => {
                const isItemActive = enabledDepartments.includes(item);
                return (
                  <option key={item} value={item} className="bg-white text-slate-700">
                    {item} {!isItemActive ? '(Inactive)' : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-indigo-600 uppercase shadow-sm">
              {category} Console
            </span>
          )}
        </div>
      </header>

      {/* Chat Messages Frame */}
      <div className="flex-1 overflow-y-auto px-5 py-6 bg-slate-50/20">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map(message => {
            const isUser = message.role === 'user';
            return (
              <article key={message.id} className={`group flex gap-4 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar indicator */}
                <div
                  className={`mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-200 shadow-md ${
                    isUser 
                      ? 'bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300/60 text-slate-700 shadow-slate-200/50' 
                      : 'bg-gradient-to-tr from-indigo-500 to-violet-500 border border-indigo-400/20 text-white shadow-indigo-100/50'
                  }`}
                >
                  {isUser ? <UserRound size={16} /> : <Bot size={16} />}
                </div>
                
                <div className={`min-w-0 flex-1 ${isUser ? 'text-right' : ''}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isUser ? 'Client Operator' : 'RAG Agent'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Bubble styling */}
                  <div className={`inline-block p-4 rounded-2xl border text-[13.5px] leading-relaxed text-left max-w-full ${
                    isUser
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-700/30 text-white rounded-tr-none shadow-md shadow-indigo-500/10'
                      : 'bg-white border-slate-100 text-slate-800 rounded-tl-none shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-indigo-500'
                  }`}>
                    <FormattedMessage content={message.content} isUser={isUser} />
                  </div>

                  {/* Citations / Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs justify-start px-1">
                      {message.sources.map(source => (
                        <span key={source} className="inline-flex items-center gap-1.5 rounded-lg badge-indigo px-2.5 py-1 text-[10px] font-bold tracking-tight shadow-sm hover:bg-indigo-100/60 transition">
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 border border-indigo-400/20 text-white shadow-md shadow-indigo-100/50">
                <Bot size={16} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Searching RAG Index...</span>
                </div>
                <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-none border border-indigo-50 bg-indigo-50/30 px-4.5 py-3 text-xs font-semibold text-indigo-700 shadow-sm">
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
      <div className="border-t border-slate-100 bg-white px-5 py-4.5">
        <div className="mx-auto max-w-3xl">
          {!isActive ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-center text-xs font-semibold text-amber-800 shadow-md flex flex-col items-center justify-center gap-2 animate-fade-in-up">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-900 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Channel Suspended
              </div>
              <p className="text-[12px] text-amber-700 font-semibold">Admin is inactive for this support channel</p>
              <p className="text-[10px] text-amber-600 font-medium">Please check back later or contact your portal administrator.</p>
            </div>
          ) : (
            <>
              {/* Quick Prompts */}
              <div className="mb-3.5 flex flex-wrap gap-2">
                {quickPrompts[category].map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitMessage(prompt)}
                    className="rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 hover:shadow-indigo-50/40 transition-all duration-150 transform hover:scale-[1.02] shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={11} className="text-indigo-400" />
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Unified chat form field */}
              <form 
                onSubmit={handleSubmit} 
                className="flex items-end gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 p-2.5 shadow-md shadow-slate-100/30 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all duration-200"
              >
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
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
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-800 placeholder-slate-400 outline-none focus:outline-none"
                />
                
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200/50 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-150 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send size={13} aria-hidden="true" />
                </button>
              </form>
            </>
          )}

          {/* Ticket metadata footer */}
          <div className="mt-3.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
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
