'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { LOCALES, type Locale } from '@/lib/i18n/index';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocaleAction(formData: FormData) {
  const value = String(formData.get('locale') ?? '');
  if (!(LOCALES as readonly string[]).includes(value)) {
    redirect('/');
  }

  const c = await cookies();
  c.set('locale', value as Locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  });

  // Bust the RSC cache for every segment that reads getDict().
  revalidatePath('/', 'layout');

  // Force a fresh navigation to the page the user clicked from — without
  // this, Next.js 16 may keep the prior RSC payload for the current view
  // even though the cookie has been updated.
  const h = await headers();
  const referer = h.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      redirect(url.pathname + url.search);
    } catch {
      // Malformed referer — fall through to root.
    }
  }
  redirect('/');
}
