/**
 * Vitest global setup — runs before any test file is imported.
 * Sets dummy env vars to prevent server.mjs from calling process.exit(1).
 */
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'test-publishable-key';
process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'test-supabase-secret-key';
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-google-key';
process.env.DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || 'test-dataforseo-login';
process.env.DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || 'test-dataforseo-password';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake';
process.env.API_PORT = '0';
