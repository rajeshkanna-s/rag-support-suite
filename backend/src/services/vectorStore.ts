import fs from 'fs';
import path from 'path';
import { RetrievedChunk, VectorRecord } from '../types';

const STORE_PATH = path.join(__dirname, '../../storage/vector-store.json');

function ensureStorageDir(): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

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

export function saveVectorStore(records: VectorRecord[]): void {
  ensureStorageDir();
  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify({ createdAt: new Date().toISOString(), records }, null, 2),
    'utf-8'
  );
}

export function loadVectorStore(): VectorRecord[] {
  if (!fs.existsSync(STORE_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(STORE_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as { records?: VectorRecord[] };
  return parsed.records ?? [];
}

export async function similaritySearch(
  queryEmbedding: number[],
  topK = 5
): Promise<RetrievedChunk[]> {
  return loadVectorStore()
    .map(record => ({
      id: record.id,
      text: record.text,
      source: record.source,
      score: cosineSimilarity(queryEmbedding, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
