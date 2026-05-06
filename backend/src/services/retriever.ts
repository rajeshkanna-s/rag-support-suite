import { RetrievedChunk, SupportCategory } from '../types';
import { embedText } from './embedder';
import { similaritySearch } from './vectorStore';
import { searchSupabaseKnowledge } from './knowledge';

const MAX_CHUNKS = Number.parseInt(process.env.MAX_RETRIEVED_CHUNKS || '5', 10);
const MIN_SCORE = Number.parseFloat(process.env.MIN_RETRIEVAL_SCORE || '0.05');

const STOP_WORDS = new Set(['what', 'when', 'where', 'which', 'with', 'about', 'policy', 'please']);
const QUERY_ALIASES: Record<string, string[]> = {
  payroll: ['pay', 'paid', 'schedule', 'compensation', 'deposit', 'benefits', 'salary', 'wage'],
  document: ['policy', 'schedule', 'process'],
  details: ['employment', 'employee', 'information'],
};

function tokenize(text: string): string[] {
  const baseTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
  const expanded = new Set(baseTokens);
  baseTokens.forEach(token => {
    QUERY_ALIASES[token]?.forEach(alias => expanded.add(alias));
  });
  return [...expanded];
}

function queryBoost(query: string, text: string): number {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return 0;

  const lowerText = text.toLowerCase();
  const textTokens = new Set(tokenize(text));
  const overlap = queryTokens.filter(token => textTokens.has(token)).length / queryTokens.length;
  const phrase = lowerText.includes(query.toLowerCase().trim()) ? 1 : 0;

  return overlap + phrase;
}

function keepRelevantChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const primary = chunks[0];
  if (!primary || primary.score < MIN_SCORE) {
    return [];
  }

  return chunks.filter(
    chunk => chunk.score >= MIN_SCORE || (!!primary.documentId && chunk.documentId === primary.documentId)
  );
}

function sortChunksForAnswer(query: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
  return chunks.sort((a, b) => {
    const boostDiff = queryBoost(query, b.text) - queryBoost(query, a.text);
    if (boostDiff !== 0) return boostDiff;
    return b.score - a.score;
  });
}

export async function retrieveRelevantChunks(
  query: string,
  category?: SupportCategory
): Promise<RetrievedChunk[]> {
  if (category) {
    const lexicalChunks = await searchSupabaseKnowledge(query, null, category, MAX_CHUNKS);
    const filteredLexicalChunks = sortChunksForAnswer(query, keepRelevantChunks(lexicalChunks));

    if (filteredLexicalChunks.length > 0) {
      return filteredLexicalChunks;
    }

    const queryEmbedding = await embedText(query);
    const semanticChunks = await searchSupabaseKnowledge(query, queryEmbedding, category, MAX_CHUNKS);
    return sortChunksForAnswer(query, keepRelevantChunks(semanticChunks));
  }

  const queryEmbedding = await embedText(query);
  const chunks = await similaritySearch(queryEmbedding, MAX_CHUNKS);

  if (chunks.length === 0 && !category) {
    return [];
  }

  return sortChunksForAnswer(
    query,
    chunks.filter(chunk => chunk.score >= MIN_SCORE)
  );
}

export function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';

  return chunks
    .map((chunk, index) => {
      return `[Source ${index + 1}: ${chunk.source}, relevance ${chunk.score.toFixed(2)}]\n${chunk.text}`;
    })
    .join('\n\n---\n\n');
}
