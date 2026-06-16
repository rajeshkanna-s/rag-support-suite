import { SUPPORT_CATEGORIES, SupportCategory } from '../types';

const STORAGE_KEY = 'supportai.enabledDepartments';

function parse(value: string | null): SupportCategory[] {
  if (value === null) return [...SUPPORT_CATEGORIES];

  try {
    const parsed = JSON.parse(value) as string[];
    const valid = parsed.filter(item => SUPPORT_CATEGORIES.includes(item as SupportCategory)) as SupportCategory[];
    return valid;
  } catch {
    return [...SUPPORT_CATEGORIES];
  }
}

export function getEnabledDepartments(): SupportCategory[] {
  return parse(window.localStorage.getItem(STORAGE_KEY));
}

export function setEnabledDepartments(categories: SupportCategory[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  window.dispatchEvent(new CustomEvent('supportai:departments'));
}

export function subscribeDepartments(callback: () => void) {
  const handler = () => callback();
  window.addEventListener('storage', handler);
  window.addEventListener('supportai:departments', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('supportai:departments', handler);
  };
}
