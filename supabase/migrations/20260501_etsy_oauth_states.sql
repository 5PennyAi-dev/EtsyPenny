-- Etsy OAuth Phase 1: transient PKCE/state storage
--
-- Stores PKCE verifiers and CSRF state tokens during the authorization flow,
-- between the /authorize redirect and the /callback return. Rows are
-- short-lived (10-minute TTL) and only ever read/written by API routes
-- using the service-role Supabase client. No RLS policies are exposed to
-- authenticated/anon roles on purpose — this table must remain
-- service-role-only.

CREATE TABLE public.etsy_oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  scopes TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_etsy_oauth_states_state ON public.etsy_oauth_states (state);
CREATE INDEX idx_etsy_oauth_states_expires_at ON public.etsy_oauth_states (expires_at);

ALTER TABLE public.etsy_oauth_states ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies for authenticated/anon: service-role only.

-- Cleanup helper for expired rows. Callable from a scheduled job
-- (pg_cron / Supabase scheduled function) under the service_role.
CREATE OR REPLACE FUNCTION public.cleanup_expired_etsy_oauth_states()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.etsy_oauth_states WHERE expires_at < now();
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_etsy_oauth_states() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_etsy_oauth_states() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_etsy_oauth_states() TO service_role;
