import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { applySEOFilter, KeywordInput, FilterParameters } from '@/lib/seo/filter-logic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listing_id } = body;

    if (!listing_id) {
      return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 });
    }

    // 1. Fetch keywords for the listing
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id);

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords found for this listing' }, { status: 404 });
    }

    // 2. Fetch the listing to get the user_id
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      console.error('Error fetching listing:', listingError);
      return NextResponse.json({ error: 'Failed to fetch listing owner' }, { status: 500 });
    }

    // 3. Fetch user settings from the specialized view
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching settings:', settingsError);
      return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
    }

    const params: FilterParameters = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.15,
      Transaction: settings.param_transaction ?? 0.35,
      Niche: settings.param_niche ?? 0.25,
      CPC: settings.param_cpc ?? 0,
      
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

    // 4. Transform keywords to KeywordInput and apply the filter
    const keywordInputs: KeywordInput[] = keywords.map(kw => ({
      keyword: kw.tag,
      search_volume: kw.search_volume,
      competition: kw.competition ? parseFloat(kw.competition) : null,
      cpc: kw.cpc,
      niche_score: kw.niche_score,
      transactional_score: kw.transactional_score,
      volume_history: kw.volume_history,
      is_pinned: kw.is_pinned,
      ...kw // Include rest for tracking
    }));

    const processedKeywords = applySEOFilter(keywordInputs, params);

    // 5. Update Keywords in Supabase
    // Reset selection flags for all keywords first, or map them out.
    // To be safe and avoid multi-step updates, we can update them in a batch or loop.
    // For performance, we'll map all the processed keywords to an upsert array.
    
    // First, map the original rows to set flags to false
    const allUpdates = keywords.map(originalKw => {
      // Find if this keyword was selected by the filter
      const processed = processedKeywords.find(p => p.id === originalKw.id);
      
      if (processed) {
        return {
          id: originalKw.id,
          listing_id: originalKw.listing_id,
          tag: originalKw.tag,
          opportunity_score: processed.opportunity_score,
          is_trending: processed.status.trending,
          is_evergreen: processed.status.evergreen,
          is_promising: processed.status.promising,
          is_selection_ia: processed.is_selection_ia,
          is_current_eval: processed.is_current_eval,
          is_current_pool: processed.is_current_pool
        };
      } else {
        // Did not make it to the pool
        return {
          id: originalKw.id,
          listing_id: originalKw.listing_id,
          tag: originalKw.tag,
          // Could zero out opportunity_score or keep it as is, standard is to update or ignore.
          // Let's ensure flags are removed.
          is_selection_ia: false,
          is_current_eval: false,
          is_current_pool: false
        };
      }
    });

    // Execute batch upsert
    const { error: upsertError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(allUpdates, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error updating keywords:', upsertError);
      return NextResponse.json({ error: 'Failed to update keyword stats' }, { status: 500 });
    }

    // 6. Recalculate listing strength (Approximation based on n8n logic for fast return)
    // The prompt asks to recalculate listing strength. We'll implement a fast version of the JS logic from n8n.
    const selectedKeywords = processedKeywords.filter(k => k.is_selection_ia);
    let finalLSI = 0;

    if (selectedKeywords.length > 0) {
      let totalMarketReach = 0;
      
      selectedKeywords.forEach(kw => {
        const vol = kw.search_volume || 0;
        const nS = kw.niche_score ?? 5;
        const tS = kw.transactional_score ?? 5;
        const dynamicWeight = 0.8 + (nS / 20) + (tS / 20);
        totalMarketReach += (vol * dynamicWeight);
      });

      const visibilityCeiling = 10000000;
      const visibilityScore = Math.min(100, Math.round(
        (Math.log10(Math.max(1, totalMarketReach)) / Math.log10(visibilityCeiling)) * 100
      ));

      const avgTransactional = selectedKeywords.reduce((acc, kw) => acc + (kw.transactional_score || 5), 0) / selectedKeywords.length;
      const avgCPC = selectedKeywords.reduce((acc, kw) => acc + (kw.cpc || 0), 0) / selectedKeywords.length;
      const cpcScore = Math.min(10, (avgCPC / 2.5) * 10);
      const conversionScore = (avgTransactional * 5) + (cpcScore * 5);
      
      const avgNiche = selectedKeywords.reduce((acc, kw) => acc + (kw.niche_score || 5), 0) / selectedKeywords.length;
      const relevanceScore = avgNiche * 10;
      
      const sortedByComp = [...selectedKeywords].sort((a, b) => (a.competition || 1) - (b.competition || 1));
      const topOpportunities = sortedByComp.slice(0, 5);
      const avgBestComp = topOpportunities.reduce((acc, kw) => acc + (kw.competition || 0.9), 0) / topOpportunities.length;
      const competitionScore = Math.round(Math.pow(1 - Math.min(0.99, avgBestComp), 0.3) * 100);

      finalLSI = Math.round(
        (visibilityScore * 0.25) + 
        (conversionScore * 0.35) + 
        (relevanceScore * 0.25) +
        (competitionScore * 0.15)
      );

      // Update the listing with the new strength
      await supabaseAdmin
        .from('listings')
        .update({ listing_strength: finalLSI })
        .eq('id', listing_id);
    }

    return NextResponse.json({
      success: true,
      listing_strength: finalLSI,
      top_keywords: selectedKeywords.map(k => ({
        tag: k.keyword,
        opportunity_score: k.opportunity_score,
        is_trending: k.status.trending,
        is_evergreen: k.status.evergreen,
        is_promising: k.status.promising
      }))
    });

  } catch (err: any) {
    console.error('Reset pool error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
