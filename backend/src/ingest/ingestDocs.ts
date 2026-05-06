import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { embedBatch } from '../services/embedder';
import { DocumentChunk, VectorRecord } from '../types';
import { saveVectorStore } from '../services/vectorStore';

dotenv.config();

const DOCS_DIR = path.join(__dirname, '../../docs');
const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 120;

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  console.warn(`Skipping unsupported file type: ${path.basename(filePath)}`);
  return '';
}

function chunkText(text: string, source: string): Omit<DocumentChunk, 'embedding'>[] {
  const cleaned = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const chunks: Omit<DocumentChunk, 'embedding'>[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const textChunk = cleaned.slice(start, end).trim();

    if (textChunk.length > 40) {
      chunks.push({
        id: `${source}-${index}-${Date.now()}`,
        text: textChunk,
        source,
        metadata: {
          source,
          chunkIndex: String(index),
          createdAt: new Date().toISOString(),
        },
      });
      index += 1;
    }

    if (end === cleaned.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

async function ingest(): Promise<void> {
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const files = fs
    .readdirSync(DOCS_DIR)
    .filter(file => ['.txt', '.md', '.pdf', '.docx'].includes(path.extname(file).toLowerCase()));

  const records: VectorRecord[] = [];

  console.log(`Found ${files.length} document(s) in ${DOCS_DIR}`);

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const text = await extractText(filePath);
    const chunks = chunkText(text, file);
    console.log(`${file}: ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      const embeddings = await embedBatch(batch.map(chunk => chunk.text));

      batch.forEach((chunk, batchIndex) => {
        records.push({
          ...chunk,
          embedding: embeddings[batchIndex],
        });
      });
    }
  }

  saveVectorStore(records);
  console.log(`Ingestion complete. Stored ${records.length} chunk(s).`);
}

ingest().catch(error => {
  console.error(error);
  process.exit(1);
});
