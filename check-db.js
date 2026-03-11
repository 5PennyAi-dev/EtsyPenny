import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkView() {
  console.log("Fetching View Columns...");
  const { data, error } = await supabase.from('v_combined_product_types').select('*').limit(2);
  if (error) {
    console.error("Error fetching view:", error);
  } else {
    console.log("View Data:", data);
  }

  const { data: d2, error: e2 } = await supabase.from('user_custom_product_type').select('id, name').limit(1);
  if (e2) {
    console.log('Error user_custom_product_type:', e2.message);
  } else {
    console.log('user_custom_product_type data:', d2);
  }
}

checkView();
