import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerConfig } from './config.js';

// Lazy-initialized singleton — avoids crashing at import time in serverless
let _client: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const { url, secretKey } = getSupabaseServerConfig();
      _client = createClient(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return (_client as unknown as Record<string, unknown>)[prop as string];
  },
});
