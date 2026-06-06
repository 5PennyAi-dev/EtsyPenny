-- Admin function: list all users (profiles + email from auth.users)
-- Only callable by users with role = 'admin' in profiles.
-- SECURITY DEFINER allows access to auth.users which is otherwise restricted.

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  subscription_plan text,
  subscription_status text,
  tokens_monthly_balance integer,
  tokens_bonus_balance integer,
  add_custom_used integer,
  add_favorite_used integer,
  stripe_customer_id text,
  is_blocked boolean,
  tokens_reset_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email,
    p.subscription_plan,
    p.subscription_status,
    p.tokens_monthly_balance,
    p.tokens_bonus_balance,
    p.add_custom_used,
    p.add_favorite_used,
    p.stripe_customer_id,
    p.is_blocked,
    p.tokens_reset_at,
    p.updated_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
