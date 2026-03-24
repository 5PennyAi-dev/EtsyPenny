import { createClient } from '@supabase/supabase-js';
import { applySEOFilter, KeywordInput, FilterParameters } from '../lib/seo/filter-logic';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testSupabaseIntegration() {
  const listing_id = '407773d8-6f60-4f10-9cdd-c58aedd16624';
  console.log(`Testing reset-pool logic with listing_id: ${listing_id}\n`);

  try {
    console.log('1. Fetching keywords...');
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id);

    if (keywordsError) throw keywordsError;
    if (!keywords || keywords.length === 0) {
      console.log('❌ No keywords found for this listing.');
      return;
    }
    console.log(`✅ Fetched ${keywords.length} keywords.`);

    console.log('2. Fetching listing owner...');
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw listingError || new Error("Listing not found");
    console.log(`✅ Fetched owner: ${listing.user_id}`);

    console.log('3. Fetching user settings...');
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw settingsError || new Error("Settings not found");

    const params: FilterParameters = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.10,
      Transaction: settings.param_transaction ?? 0.25,
      Niche: settings.param_niche ?? 0.20,
      CPC: settings.param_cpc ?? 0.20,
      evergreen_stability_ratio: settings.evergreen_stability_ratio ?? 4,
      evergreen_minimum_volume: settings.evergreen_minimum_volume ?? 0.3,
      evergreen_avg_volume: settings.evergreen_avg_volume ?? 50,
      trending_dropping_threshold: settings.trending_dropping_threshold ?? 0.8,
      trending_current_month_min_volume: settings.trending_current_month_min_volume ?? 150,
      trending_growth_factor: settings.trending_growth_factor ?? 1.5,
      promising_min_score: settings.promising_min_score ?? 55,
      promising_competition: settings.promising_competition ?? settings.promosing_competition ?? 0.4,
      ai_selection_count: settings.ai_selection_count || 13,
      working_pool_count: settings.working_pool_count || 40,
      concept_diversity_limit: settings.concept_diversity_limit || 5
    };
    console.log('✅ Fetched settings mapped to params:', JSON.stringify(params, null, 2));

    console.log('4. Analyzing and applying SEO filter...');
    const keywordInputs: KeywordInput[] = keywords.map(kw => ({
      ...kw,
      keyword: kw.tag,
      competition: kw.competition ? parseFloat(kw.competition) : null,
    }));

    const processedKeywords = applySEOFilter(keywordInputs, params);
    const selectedKeywords = processedKeywords.filter(k => k.is_selection_ia);
    console.log(`✅ Filtered ${keywordInputs.length} down to top ${selectedKeywords.length} IA selections.`);

    console.log('\n--- Final Top Results ---');
    selectedKeywords.forEach(k => {
      console.log(`- ${k.keyword} (Score: ${k.opportunity_score}) [T:${k.status.trending} E:${k.status.evergreen}]`);
    });

  } catch (error) {
    console.error('❌ Error during test run:', error);
  }
}

testSupabaseIntegration();
