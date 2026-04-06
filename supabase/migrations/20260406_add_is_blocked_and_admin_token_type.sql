-- Add is_blocked column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- Add admin_adjustment to token_transactions type check
ALTER TABLE public.token_transactions
DROP CONSTRAINT IF EXISTS token_transactions_type_check;

ALTER TABLE public.token_transactions
ADD CONSTRAINT token_transactions_type_check
CHECK (type = ANY (ARRAY['subscription_credit','pack_purchase','deduction','reset','refund','admin_adjustment']));

-- RLS: Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- RLS: Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
