// Client-safe exports only. For server-side getLocale/getDict, import from
// '@/lib/i18n/server' — that module pulls next/headers which is server-only.

export const LOCALES = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export const DEFAULT_LOCALE: Locale = 'en';
