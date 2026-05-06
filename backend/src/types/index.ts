export const SUPPORT_CATEGORIES = [
  'HR',
  'Operation',
  'IT support',
  'Accounts and Finance',
  'Sales',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export interface DocumentChunk {
  id: string;
  text: string;
  source: string;
  metadata: Record<string, string>;
  embedding: number[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  category: SupportCategory;
  customerEmail?: string;
  ticketId?: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}

export interface RetrievedChunk {
  id: string;
  text: string;
  source: string;
  score: number;
  documentId?: string;
  chunkIndex?: number;
}

export interface VectorRecord {
  id: string;
  text: string;
  source: string;
  metadata: Record<string, string>;
  embedding: number[];
}

export interface KnowledgeInput {
  category: SupportCategory;
  title: string;
  sourceType: 'text' | 'pdf' | 'docx' | 'txt' | 'md' | 'link';
  contentText: string;
  sourceUrl?: string;
  originalFilename?: string;
}
