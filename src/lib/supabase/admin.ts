// Service-role Supabase client. Use ONLY in trusted server-side code paths
// (route handlers, server actions). Bypasses RLS — caller must validate
// authorization themselves before performing any write.

import { createClient as createSbClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[supabase/admin] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.',
    );
  }
  return createSbClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
