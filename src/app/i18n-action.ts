'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { LOCALES, type Locale } from '@/lib/i18n/index';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function safePath(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  // Reject protocol-relative URLs to avoid open-redirect.
  if (raw.startsWith('//')) return '/';
  return raw;
}

export async function setLocaleAction(formData: FormData) {
  const value = String(formData.get('locale') ?? '');
  const nextField = formData.get('next');
  const next = safePath(typeof nextField === 'string' ? nextField : null);

  if (!(LOCALES as readonly string[]).includes(value)) {
    redirect(next);
  }

  const c = await cookies();
  c.set('locale', value as Locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');

  // Prefer the explicit `next` field from the form (set client-side from
  // window.location). Fall back to the Referer header if the field is missing
  // (older cached client bundle).
  if (next !== '/') {
    redirect(next);
  }
  const h = await headers();
  const referer = h.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      redirect(safePath(url.pathname + url.search));
    } catch {
      // Malformed referer — fall through to root.
    }
  }
  redirect('/');
}
