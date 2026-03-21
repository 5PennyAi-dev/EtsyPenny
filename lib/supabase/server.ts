import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized singleton — avoids crashing at import time in serverless
let _client: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url) throw new Error('Missing environment variable VITE_SUPABASE_URL');
      if (!key) throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
      _client = createClient(url, key);
    }
    return (_client as unknown as Record<string, unknown>)[prop as string];
  },
});
