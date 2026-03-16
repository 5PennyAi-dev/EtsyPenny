import { createClient } from '@supabase/supabase-js';

// Ensure that the environment variables are set
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable VITE_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing environment variable SUPABASE_SERVICE_ROLE_KEY");
}

// Create a singleton Supabase client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
