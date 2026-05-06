export const SUPPORT_CATEGORIES = [
  'HR',
  'Operation',
  'IT support',
  'Accounts and Finance',
  'Sales',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_PATHS: Record<SupportCategory, string> = {
  HR: 'HR',
  Operation: 'Operation',
  'IT support': 'IT-support',
  'Accounts and Finance': 'Accounts-and-Finance',
  Sales: 'Sales',
};

export function categoryToPath(category: SupportCategory): string {
  return `/${SUPPORT_CATEGORY_PATHS[category]}`;
}

export function pathToSupportCategory(pathname: string): SupportCategory | undefined {
  const cleanPath = decodeURIComponent(pathname.replace(/^\/+|\/+$/g, ''));
  const normalizedPath = cleanPath.toLowerCase();

  return SUPPORT_CATEGORIES.find(category => {
    return (
      SUPPORT_CATEGORY_PATHS[category].toLowerCase() === normalizedPath ||
      category.toLowerCase() === normalizedPath
    );
  });
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface ChatApiResponse {
  answer: string;
  sources: string[];
  ticketId?: string;
}

export interface KnowledgeDocument {
  id: string;
  category: SupportCategory;
  title: string;
  source_type: string;
  source_url?: string | null;
  original_filename?: string | null;
  char_count: number;
  created_at: string;
}
