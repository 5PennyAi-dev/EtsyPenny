import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkView() {
  const { data, error } = await supabase.from('v_combined_product_types').select('*').limit(1);
  console.log("View Data:", data, "Error:", error?.message);
}

checkView();
