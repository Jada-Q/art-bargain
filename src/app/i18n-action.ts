'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALES, type Locale } from '@/lib/i18n/index';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocaleAction(formData: FormData) {
  const value = String(formData.get('locale') ?? '');
  if (!(LOCALES as readonly string[]).includes(value)) return;

  const c = await cookies();
  c.set('locale', value as Locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
