-- Add role column to profiles for admin access control
ALTER TABLE public.profiles
ADD COLUMN role text NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin'));
