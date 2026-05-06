import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { loadVectorStore } from './services/vectorStore';
import chatRouter from './routes/chat';
import knowledgeRouter from './routes/knowledge';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: (
      process.env.FRONTEND_ORIGIN ||
      'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
    )
      .split(',')
      .map(origin => origin.trim()),
  })
);
app.use(express.json({ limit: '10mb' }));

app.use('/api/chat', chatRouter);
app.use('/api/knowledge', knowledgeRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    indexedChunks: loadVectorStore().length,
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Indexed chunks: ${loadVectorStore().length}`);
});
