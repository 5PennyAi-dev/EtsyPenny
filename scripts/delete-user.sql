-- Delete a user by email (auth + all related data via cascade)
-- Run in Supabase SQL Editor

DELETE FROM auth.users
WHERE email = 'user@example.com';
