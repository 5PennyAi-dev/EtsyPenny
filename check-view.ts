import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  process.exit(1);
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkView() {
  const { data, error } = await supabaseAdmin.from('v_user_seo_active_settings').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

checkView();
