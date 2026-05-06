import { RetrievedChunk } from '../types';

const STOP_WORDS = new Set([
  'what',
  'when',
  'where',
  'which',
  'with',
  'about',
  'policy',
  'please',
  'tell',
  'show',
  'give',
  'info',
]);

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

function cleanText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isHeading(line: string): boolean {
  return /^\d+(\.\d+)?\.\s+/.test(line) || /^\d+\.\d+\s+/.test(line) || /^\d+\.\s+/.test(line);
}

function isMajorHeading(line: string): boolean {
  return /^\d+\.\s+/.test(line);
}

function isMinorHeading(line: string): boolean {
  return /^\d+\.\d+\s+/.test(line);
}

function paragraphScore(paragraph: string, queryTokens: string[], query: string): number {
  const lower = paragraph.toLowerCase();
  const paragraphTokens = new Set(tokenize(paragraph));
  const tokenMatches = queryTokens.filter(token => paragraphTokens.has(token)).length;
  const phraseBoost = lower.includes(query.toLowerCase().trim()) ? 2 : 0;
  return tokenMatches + phraseBoost;
}

function stitchChunks(chunks: RetrievedChunk[]): string {
  const top = chunks[0];
  const sameDocument = chunks
    .filter(chunk => chunk.documentId && chunk.documentId === top.documentId)
    .sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));

  if (sameDocument.length <= 1) return top.text;

  return sameDocument.reduce((merged, chunk) => {
    const next = chunk.text.trim();
    if (!merged) return next;

    const maxOverlap = Math.min(260, merged.length, next.length);
    for (let size = maxOverlap; size >= 40; size -= 1) {
      if (merged.slice(-size) === next.slice(0, size)) {
        return `${merged}${next.slice(size)}`;
      }
    }

    return `${merged}\n${next}`;
  }, '');
}

function extractRelevantText(query: string, chunks: RetrievedChunk[]): string {
  const cleaned = cleanText(stitchChunks(chunks));
  const lines = cleaned.split('\n').map(item => item.trim()).filter(Boolean);
  const queryTokens = tokenize(query);

  if (lines.length === 0 || queryTokens.length === 0) {
    return cleaned.slice(0, 1800);
  }

  let bestIndex = 0;
  let bestScore = -1;

  lines.forEach((line, index) => {
    const score = paragraphScore(line, queryTokens, query);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  let start = bestIndex;
  for (let i = bestIndex; i >= 0; i -= 1) {
    if (isMinorHeading(lines[i])) {
      start = i;
      break;
    }
    if (isMajorHeading(lines[i])) {
      start = i;
      break;
    }
  }

  if (start > 0 && isMinorHeading(lines[start])) {
    for (let i = start - 1; i >= 0; i -= 1) {
      if (isMajorHeading(lines[i])) {
        start = i;
        break;
      }
    }
  }

  let end = lines.length;
  for (let i = Math.max(start + 1, bestIndex + 1); i < lines.length; i += 1) {
    if (isMajorHeading(lines[i])) {
      end = i;
      break;
    }
  }

  const selected = lines.slice(start, end);
  return selected.join('\n').slice(0, 2200);
}

function humanizeExcerpt(excerpt: string): string {
  return excerpt
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function canUseFastAnswer(chunks: RetrievedChunk[]): boolean {
  return process.env.RAG_FAST_MODE !== 'false' && chunks.length > 0 && chunks[0].score >= 0.05;
}

export function generateFastAnswer(query: string, chunks: RetrievedChunk[]): string {
  const topChunk = chunks[0];
  const excerpt = extractRelevantText(query, chunks);
  const source = topChunk.source;

  return `Based on ${source}:\n\n${humanizeExcerpt(excerpt)}`;
}
