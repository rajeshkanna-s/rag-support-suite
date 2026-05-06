import axios from 'axios';
import { ChatApiResponse, KnowledgeDocument, Message, SupportCategory } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function apiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseError = error.response?.data as { error?: string; detail?: string } | undefined;
    const message = responseError?.error || responseError?.detail;
    if (message) return new Error(message);

    if (error.code === 'ERR_NETWORK') {
      return new Error(`Backend API is not reachable at ${API_BASE}. Please make sure the backend is running.`);
    }
  }

  return error instanceof Error ? error : new Error('Request failed.');
}

export async function sendMessage(
  message: string,
  category: SupportCategory,
  conversationHistory: Message[],
  customerEmail?: string,
  ticketId?: string
): Promise<ChatApiResponse> {
  const history = conversationHistory.slice(-8).map(item => ({
    role: item.role,
    content: item.content,
  }));

  const response = await axios.post<ChatApiResponse>(`${API_BASE}/api/chat`, {
    message,
    category,
    customerEmail,
    ticketId,
    conversationHistory: history,
  });

  return response.data;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function listKnowledge(accessToken: string): Promise<KnowledgeDocument[]> {
  try {
    const response = await axios.get<{ documents: KnowledgeDocument[] }>(`${API_BASE}/api/knowledge`, {
      headers: authHeaders(accessToken),
    });
    return response.data.documents;
  } catch (error) {
    throw apiError(error);
  }
}

export async function uploadKnowledgeText(input: {
  accessToken: string;
  category: SupportCategory;
  title: string;
  contentText: string;
}) {
  try {
    const response = await axios.post(
      `${API_BASE}/api/knowledge/text`,
      {
        category: input.category,
        title: input.title,
        contentText: input.contentText,
      },
      { headers: authHeaders(input.accessToken) }
    );
    return response.data as { documentId: string; chunks: number };
  } catch (error) {
    throw apiError(error);
  }
}

export async function uploadKnowledgeLink(input: {
  accessToken: string;
  category: SupportCategory;
  title: string;
  url: string;
}) {
  try {
    const response = await axios.post(
      `${API_BASE}/api/knowledge/link`,
      {
        category: input.category,
        title: input.title,
        url: input.url,
      },
      { headers: authHeaders(input.accessToken) }
    );
    return response.data as { documentId: string; chunks: number };
  } catch (error) {
    throw apiError(error);
  }
}

export async function uploadKnowledgeFile(input: {
  accessToken: string;
  category: SupportCategory;
  title: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append('category', input.category);
  formData.append('title', input.title);
  formData.append('file', input.file);

  try {
    const response = await axios.post(`${API_BASE}/api/knowledge/file`, formData, {
      headers: {
        ...authHeaders(input.accessToken),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as { documentId: string; chunks: number };
  } catch (error) {
    throw apiError(error);
  }
}

export async function deleteKnowledgeDocument(accessToken: string, documentId: string) {
  try {
    const response = await axios.delete(`${API_BASE}/api/knowledge/${documentId}`, {
      headers: authHeaders(accessToken),
    });
    return response.data as { ok: boolean };
  } catch (error) {
    throw apiError(error);
  }
}
