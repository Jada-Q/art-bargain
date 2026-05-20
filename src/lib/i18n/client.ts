// Client-safe dict lookup. Use this in client components instead of
// receiving the dict as a prop — RSC can't serialize functions across
// the server→client boundary, but client components can import the
// dict module directly.

import en from './dict/en';
import zh from './dict/zh';
import ja from './dict/ja';
import type { Locale } from './index';

const DICTS = { en, zh, ja } as const;
export type Dict = typeof en;

export function dictFor(locale: Locale): Dict {
  return DICTS[locale];
}
