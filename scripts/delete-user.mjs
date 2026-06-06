/**
 * Delete a Supabase user by email (auth + profile cascade).
 * Usage: node scripts/delete-user.mjs user@example.com
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/delete-user.mjs <email>');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Find user by email
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
if (listError) throw listError;

const user = users.find(u => u.email === email);
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`Found user: ${user.id} (${user.email})`);

// Delete from auth (cascade deletes profile via DB trigger)
const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
if (deleteError) throw deleteError;

console.log(`✓ User deleted: ${email}`);
