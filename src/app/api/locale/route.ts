import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { LOCALES, type Locale } from '@/lib/i18n/index';

function safePath(raw: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const localeRaw = String(fd.get('locale') ?? '');
  const next = safePath(String(fd.get('next') ?? '/'));
  const target = new URL(next, req.url);

  if (!(LOCALES as readonly string[]).includes(localeRaw)) {
    return NextResponse.redirect(target, { status: 303 });
  }

  const c = await cookies();
  c.set('locale', localeRaw as Locale, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });

  return NextResponse.redirect(target, { status: 303 });
}
