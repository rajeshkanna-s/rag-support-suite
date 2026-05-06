import { Router } from 'express';
import mammoth from 'mammoth';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { KnowledgeInput, SUPPORT_CATEGORIES, SupportCategory } from '../types';
import { requireAdmin } from '../services/supabase';
import { normalizeText, storeKnowledgeDocument } from '../services/knowledge';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

function getToken(authHeader?: string): string {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new Error('Login is required.');
  }
  return token;
}

function parseCategory(category: unknown): SupportCategory {
  if (typeof category === 'string' && SUPPORT_CATEGORIES.includes(category as SupportCategory)) {
    return category as SupportCategory;
  }

  throw new Error('Invalid support category.');
}

async function textFromFile(file: Express.Multer.File): Promise<{ text: string; sourceType: KnowledgeInput['sourceType'] }> {
  const lowerName = file.originalname.toLowerCase();

  if (lowerName.endsWith('.txt')) {
    return { text: file.buffer.toString('utf-8'), sourceType: 'txt' };
  }

  if (lowerName.endsWith('.md')) {
    return { text: file.buffer.toString('utf-8'), sourceType: 'md' };
  }

  if (lowerName.endsWith('.pdf')) {
    const parsed = await pdfParse(file.buffer);
    return { text: parsed.text, sourceType: 'pdf' };
  }

  if (lowerName.endsWith('.docx')) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return { text: parsed.value, sourceType: 'docx' };
  }

  throw new Error('Supported files are .txt, .md, .pdf, and .docx.');
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

router.get('/', async (req, res) => {
  try {
    const token = getToken(req.headers.authorization);
    const { supabase } = await requireAdmin(token);
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('id, category, title, source_type, source_url, original_filename, char_count, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return res.json({ documents: data ?? [] });
  } catch (error) {
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const token = getToken(req.headers.authorization);
    const { supabase } = await requireAdmin(token);
    const documentId = String(req.params.id ?? '').trim();

    if (!documentId) {
      throw new Error('Document id is required.');
    }

    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw new Error(error.message);

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not delete document.' });
  }
});

router.post('/text', async (req, res) => {
  try {
    const token = getToken(req.headers.authorization);
    const { user, supabase } = await requireAdmin(token);
    const category = parseCategory(req.body.category);
    const contentText = normalizeText(String(req.body.contentText ?? ''));
    const title = String(req.body.title ?? `${category} pasted knowledge`).trim();

    if (!contentText) throw new Error('Text content is required.');
    if (contentText.length > 50000) throw new Error('Text content cannot exceed 50000 characters.');

    const result = await storeKnowledgeDocument(
      supabase,
      { category, title, sourceType: 'text', contentText },
      user.id
    );

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not save text.' });
  }
});

router.post('/file', upload.single('file'), async (req, res) => {
  try {
    const token = getToken(req.headers.authorization);
    const { user, supabase } = await requireAdmin(token);
    const category = parseCategory(req.body.category);
    const file = req.file;

    if (!file) throw new Error('File is required.');

    const extracted = await textFromFile(file);
    const title = String(req.body.title || file.originalname).trim();
    const result = await storeKnowledgeDocument(
      supabase,
      {
        category,
        title,
        sourceType: extracted.sourceType,
        contentText: extracted.text,
        originalFilename: file.originalname,
      },
      user.id
    );

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not save file.' });
  }
});

router.post('/link', async (req, res) => {
  try {
    const token = getToken(req.headers.authorization);
    const { user, supabase } = await requireAdmin(token);
    const category = parseCategory(req.body.category);
    const url = String(req.body.url ?? '').trim();

    if (!/^https?:\/\//i.test(url)) throw new Error('A valid http or https link is required.');

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not fetch link: ${response.status}`);

    const html = await response.text();
    const contentText = htmlToText(html).slice(0, 50000);
    const title = String(req.body.title || url).trim();
    const result = await storeKnowledgeDocument(
      supabase,
      { category, title, sourceType: 'link', sourceUrl: url, contentText },
      user.id
    );

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not save link.' });
  }
});

export default router;
