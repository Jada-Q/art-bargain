import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableSalesSource, ComparableSale } from './tool-executor';

// Production adapter: turns a SupabaseClient into a ComparableSalesSource.
// In tests we substitute an in-memory stub via dependency injection.
export function supabaseComparableSalesSource(supabase: SupabaseClient): ComparableSalesSource {
  return {
    async list({ category, filters, limit }) {
      let query = supabase
        .from('comparable_sales')
        .select('sold_price, meta, sold_at, notes')
        .eq('category', category)
        .order('sold_at', { ascending: false })
        .limit(limit);

      if (filters && Object.keys(filters).length > 0) {
        query = query.contains('meta', filters);
      }

      const { data, error } = await query;
      if (error) {
        // Logged; downstream agent reasons without anchor.
        console.error('[comparable_sales] query failed:', error.message);
        return [];
      }
      return (data ?? []) as ComparableSale[];
    },
  };
}
