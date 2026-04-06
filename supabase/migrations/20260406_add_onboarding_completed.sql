-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
