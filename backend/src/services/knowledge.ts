import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { KnowledgeInput, RetrievedChunk, SupportCategory } from '../types';
import { embedBatch } from './embedder';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 160;
const QUERY_ALIASES: Record<string, string[]> = {
  payroll: ['pay', 'paid', 'schedule', 'compensation', 'deposit', 'benefits', 'salary', 'wage'],
  document: ['policy', 'schedule', 'process'],
  details: ['employment', 'employee', 'information'],
};

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tokenize(text: string): string[] {
  const baseTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
  const expanded = new Set(baseTokens);
  baseTokens.forEach(token => {
    QUERY_ALIASES[token]?.forEach(alias => expanded.add(alias));
  });
  return [...expanded];
}

function lexicalScore(query: string, text: string): number {
  const queryTokens = [...new Set(tokenize(query))];
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const payrollScore =
    lowerQuery.includes('payroll') &&
    (lowerText.includes('pay schedule') ||
      lowerText.includes('compensation') ||
      lowerText.includes('paid on a bi-weekly') ||
      lowerText.includes('direct deposit'))
      ? 0.9
      : 0;

  if (queryTokens.length === 0) return payrollScore;

  const textTokens = new Set(tokenize(text));
  const matches = queryTokens.filter(token => textTokens.has(token)).length;
  const overlapScore = matches / queryTokens.length;
  const phraseScore = lowerText.includes(query.toLowerCase().trim()) ? 0.35 : 0;

  return Math.min(1, overlapScore + phraseScore + payrollScore);
}

export function normalizeText(text: string): string {
  return text.replace(/\r/g, '').replace(/\t/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function chunkKnowledgeText(text: string): string[] {
  const cleaned = normalizeText(text);
  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();

    if (chunk.length > 40) {
      chunks.push(chunk);
    }

    if (end === cleaned.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function storeKnowledgeDocument(
  supabase: SupabaseClient,
  input: KnowledgeInput,
  uploadedBy: string
): Promise<{ documentId: string; chunks: number }> {
  const contentText = normalizeText(input.contentText);
  const documentId = randomUUID();

  const { error: documentError } = await supabase.from('knowledge_documents').insert({
    id: documentId,
    category: input.category,
    title: input.title,
    source_type: input.sourceType,
    source_url: input.sourceUrl ?? null,
    original_filename: input.originalFilename ?? null,
    content_text: contentText,
    uploaded_by: uploadedBy,
    char_count: contentText.length,
  });

  if (documentError) {
    throw new Error(`Could not save knowledge document: ${documentError.message}`);
  }

  const chunks = chunkKnowledgeText(contentText);
  const embeddings = await embedBatch(chunks);

  if (chunks.length > 0) {
    const { error: chunkError } = await supabase.from('knowledge_chunks').insert(
      chunks.map((chunk, index) => ({
        id: randomUUID(),
        document_id: documentId,
        category: input.category,
        chunk_index: index,
        content: chunk,
        embedding: embeddings[index],
        metadata: {
          title: input.title,
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl,
          originalFilename: input.originalFilename,
        },
      }))
    );

    if (chunkError) {
      throw new Error(`Could not save knowledge chunks: ${chunkError.message}`);
    }
  }

  return { documentId, chunks: chunks.length };
}

export async function searchSupabaseKnowledge(
  query: string,
  queryEmbedding: number[] | null,
  category: SupportCategory,
  topK: number
): Promise<RetrievedChunk[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('id, document_id, chunk_index, content, embedding, metadata')
    .eq('category', category)
    .limit(300);

  if (error) {
    console.warn('Supabase knowledge search failed:', error.message);
    return [];
  }

  const scored = (data ?? [])
    .map(row => {
      const embedding = Array.isArray(row.embedding) ? (row.embedding as number[]) : [];
      const metadata = (row.metadata ?? {}) as Record<string, string>;
      const content = row.content as string;
      const semantic = queryEmbedding?.length ? cosineSimilarity(queryEmbedding, embedding) : 0;
      const lexical = lexicalScore(query, content);

      return {
        id: row.id as string,
        text: content,
        source:
          metadata.originalFilename ||
          metadata.sourceUrl ||
          metadata.title ||
          `${category} knowledge base`,
        score: lexical > 0 ? 1 + lexical : semantic,
        documentId: row.document_id as string,
        chunkIndex: row.chunk_index as number,
      };
    })
    .sort((a, b) => b.score - a.score);

  const primary = scored[0];
  if (!primary?.documentId) {
    return scored.slice(0, topK);
  }

  const sameDocument = scored
    .filter(chunk => chunk.documentId === primary.documentId)
    .sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
  const otherMatches = scored.filter(chunk => chunk.documentId !== primary.documentId).slice(0, topK);

  return [
    primary,
    ...sameDocument.filter(chunk => chunk.id !== primary.id),
    ...otherMatches,
  ].slice(0, Math.max(topK, 12));
}
