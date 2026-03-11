import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cpzbipqceavfeoiqkenz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwemJpcHFjZWF2ZmVvaXFrZW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MTc1NywiZXhwIjoyMDg2MjQ3NzU3fQ.O2OTX8vwp1Tb7S0y5U_tIfaDtAglbXPWY4SATm9wwWo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data: cols1, error: e1 } = await supabase.from('user_custom_product_types').select('*').limit(0);
  console.log('user_custom_product_types read error:', e1?.message);

  const { data: cols2, error: e2 } = await supabase.from('user_custom_product_type').select('*').limit(0);
  console.log('user_custom_product_type read error:', e2?.message);
}

testInsert();
