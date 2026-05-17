import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    // Touches Supabase auth endpoint; succeeds even without an authenticated user.
    const { error } = await supabase.auth.getUser();

    // `error` here is expected when no user session — we just want to verify the
    // request reached Supabase. Network/auth misconfigs surface as throws.
    if (error && error.message !== 'Auth session missing!') {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
