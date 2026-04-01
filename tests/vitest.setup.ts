/**
 * Vitest global setup — runs before any test file is imported.
 * Sets dummy env vars to prevent server.mjs from calling process.exit(1).
 */
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-google-key';
process.env.N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'test-n8n-secret';
process.env.DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || 'test-dataforseo-login';
process.env.DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || 'test-dataforseo-password';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake';
process.env.API_PORT = '0';
