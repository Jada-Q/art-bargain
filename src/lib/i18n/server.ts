import 'server-only';
import { cookies } from 'next/headers';
import en from './dict/en';
import zh from './dict/zh';
import ja from './dict/ja';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './index';

const DICTS = { en, zh, ja } as const;
export type Dict = typeof en;

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get('locale')?.value;
  if (v && (LOCALES as readonly string[]).includes(v)) return v as Locale;
  return DEFAULT_LOCALE;
}

export async function getDict(): Promise<Dict> {
  const l = await getLocale();
  return DICTS[l];
}
