const COMPANY_NAME_KEY = 'supportai.companyName';
const DISPATCH_EMAIL_KEY = 'supportai.dispatchEmail';
const CUSTOM_DOMAIN_KEY = 'supportai.customDomain';
const BRAND_COLOR_KEY = 'supportai.brandColor';

export interface WorkspaceSettings {
  companyName: string;
  dispatchEmail: string;
  customDomain: string;
  brandColor: string;
}

export function getWorkspaceSettings(): WorkspaceSettings {
  return {
    companyName: window.localStorage.getItem(COMPANY_NAME_KEY) || 'Acme Global Services',
    dispatchEmail: window.localStorage.getItem(DISPATCH_EMAIL_KEY) || 'support@company.com',
    customDomain: window.localStorage.getItem(CUSTOM_DOMAIN_KEY) || 'support.company.com',
    brandColor: window.localStorage.getItem(BRAND_COLOR_KEY) || '#0d9488',
  };
}

export function setWorkspaceSettings(settings: Partial<WorkspaceSettings>) {
  if (settings.companyName !== undefined) {
    window.localStorage.setItem(COMPANY_NAME_KEY, settings.companyName);
  }
  if (settings.dispatchEmail !== undefined) {
    window.localStorage.setItem(DISPATCH_EMAIL_KEY, settings.dispatchEmail);
  }
  if (settings.customDomain !== undefined) {
    window.localStorage.setItem(CUSTOM_DOMAIN_KEY, settings.customDomain);
  }
  if (settings.brandColor !== undefined) {
    window.localStorage.setItem(BRAND_COLOR_KEY, settings.brandColor);
  }
  window.dispatchEvent(new CustomEvent('supportai:workspace'));
}

export function subscribeWorkspace(callback: () => void) {
  const handler = () => callback();
  window.addEventListener('storage', handler);
  window.addEventListener('supportai:workspace', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('supportai:workspace', handler);
  };
}
