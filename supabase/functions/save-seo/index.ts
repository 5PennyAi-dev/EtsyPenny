import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validate Custom API Key Security (Ensure only N8N can call this)
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('N8N_WEBHOOK_SECRET');

    // If you haven't set N8N_WEBHOOK_SECRET in Supabase secrets yet, you can hardcode a fallback temporarily for testing, but ENV is safer.
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid x-api-key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse JSON Body from N8N
    const rawPayload = await req.json();
    
    // N8N often wraps the webhook body in an array if it's processing batches.
    const payload = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
    
    const { listing_id, results, trigger_reset_pool } = payload;

    if (!listing_id || !results) {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing listing_id or results' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client with SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Unpack results. N8N might send it wrapped in an array or as a flat object.
    const unwrappedData = Array.isArray(results) ? results[0] : results;
    const modes = ['broad', 'balanced', 'sniper'];

    const STATUS_IDS = {
        SEO_DONE: '35660e24-94bb-4586-aa5a-a5027546b4a1'
    };

    // Keep track of extracted generated title and description if available at the top level
    let generatedTitle = unwrappedData?.title || null;
    let generatedDescription = unwrappedData?.description || null;
    let statusLabelForListing = unwrappedData?.status_label || null;
    let strategicVerdictForListing = unwrappedData?.strategic_verdict || null;
    let fallbackGlobalStrength = unwrappedData?.global_listing_strength || null;

    // 4. Loop over Modes and Upsert Data
    for (const mode of modes) {
        const modeData = unwrappedData[mode];
        if (!modeData) continue; // Skip if mode is missing in the payload

        const globalStrength = modeData.listing_strength ?? modeData.global_strength ?? fallbackGlobalStrength;
        const breakdown = modeData.breakdown || {};
        const stats = modeData.stats || {};
        const seo_parameters= modeData.seo_parameters || {};
        const keywords = modeData.keywords || [];

        // Save status data to use later for the listing update if this is 'balanced' (our default mode)
        if (mode === 'balanced') {
            if (modeData.status_label) statusLabelForListing = modeData.status_label;
            if (modeData.strategic_verdict) strategicVerdictForListing = modeData.strategic_verdict;
        }

        // --- UPSERT GLOBAL EVALUATION ---
        const globalEvalPayload = {
              listing_id,
            seo_mode: mode,
            global_strength: globalStrength,
            listing_strength: globalStrength,
            listing_visibility: breakdown.visibility,
            listing_conversion: breakdown.conversion,
            listing_relevance: breakdown.relevance,
            listing_competition: breakdown.competition,
            listing_profit: breakdown.profit,
            listing_raw_visibility_index: stats.raw_visibility_index,
            listing_avg_cpc:stats.avg_cpc,
            listing_avg_competition:stats.best_opportunity_comp,
            listing_avg_competition_all:stats.avg_competition_all,
            listing_est_market_reach:stats.est_market_reach,
            param_Volume:seo_parameters.Volume,
            param_Competition:seo_parameters.Competition,
            param_Niche:seo_parameters.Niche,
            param_Transaction:seo_parameters.Transaction,
            param_cpc:seo_parameters.CPC,
            status_label: modeData.status_label || null,
            strategic_verdict: modeData.strategic_verdict || null,
            updated_at: new Date().toISOString()
        };

        let evaluationId = null;

        // Check if row exists to perform an update or insert
        const { data: existingRows, error: selectError } = await supabaseClient
            .from('listings_global_eval')
            .select('id')
            .eq('listing_id', listing_id)
            .eq('seo_mode', mode);

        if (selectError) {
             console.error(`Select Global Eval Error (${mode}):`, selectError);
             throw selectError;
        }

        if (existingRows && existingRows.length > 0) {
            evaluationId = existingRows[0].id;
            const { error: updateEvalError } = await supabaseClient
                .from('listings_global_eval')
                .update(globalEvalPayload)
                .eq('id', evaluationId);
            if (updateEvalError) throw updateEvalError;
        } else {
            const { data: newEval, error: insertEvalError } = await supabaseClient
                .from('listings_global_eval')
                .insert(globalEvalPayload)
                .select('id')
                .single();
            if (insertEvalError) throw insertEvalError;
            evaluationId = newEval.id;
        }

        // --- PREPARE AND INSERT KEYWORDS ---
        const statsToInsert = keywords.map((item: any) => ({
        listing_id,
            tag: item.keyword,
            search_volume: item.search_volume || 0,
            competition: String(item.competition), 
            cpc: item.cpc,
            opportunity_score: item.opportunity_score,
            volume_history: (Array.isArray(item.volume_history) ? item.volume_history : []).map((m: any) => m?.search_volume ?? m ?? 0),
           // volume_history: item.monthly_searches 
               // ? item.monthly_searches.map((m: any) => m.search_volume).reverse() 
                //: (item.volumes_history || []),
            is_trending: item.status?.trending || false,
            is_evergreen: item.status?.evergreen || false,
            is_promising: item.status?.promising || false,
            insight: item.insight || null,
            is_top: item.is_top ?? null,
            transactional_score: item.transactional_score || null,
            intent_label: item.intent_label || null,
            niche_score: item.niche_score || null,
            relevance_label: item.relevance_label || null,
            is_selection_ia: item.is_selection_ia || false,
            is_competition: false,
            is_current_eval: item.is_current_eval || false,
            is_current_pool:item.is_current_pool,
            is_user_added:item.is_user_added,
            is_pinned:item.is_pinned,
            evaluation_id: evaluationId
        }));

        // Delete old primary keywords for this listing (by listing_id to catch all cases)
        const { error: delError } = await supabaseClient
            .from('listing_seo_stats')
            .delete()
            .eq('listing_id', listing_id)
            .eq('is_competition', false)
            .or('is_user_added.is.null,is_user_added.eq.false');

        if (delError) {
            console.error(`Delete Stats Error (${mode}):`, delError);
            throw delError;
        }

        if (statsToInsert.length > 0) {
            const { error: insError } = await supabaseClient
                .from('listing_seo_stats')
                .upsert(statsToInsert, { onConflict: 'listing_id,tag' });
            
            if (insError) {
                console.error(`Upsert Stats Error (${mode}):`, insError);
                throw insError;
            }
        }
    } // End modes loop

    // 5. Update The Main Listing Table Status
    // Only update title/desc if they were included
    const updatePayload: any = {
        updated_at: new Date().toISOString(),
    };
    
    // Crucial Loop Prevention: Only set SEO_DONE if we are NOT triggering resetPool
    if (!trigger_reset_pool) {
        updatePayload.status_id = STATUS_IDS.SEO_DONE;
        updatePayload.is_generating_seo = false;
    }
    
    if (generatedTitle) updatePayload.generated_title = generatedTitle;
    if (generatedDescription) updatePayload.generated_description = generatedDescription;
    // strategic_verdict and status_label now live in listings_global_eval only

    const { error: updateListingError } = await supabaseClient
        .from('listings')
        .update(updatePayload)
        .eq('id', listing_id);

    if (updateListingError) throw updateListingError;

    // 6. Trigger resetPool if requested
    if (trigger_reset_pool) {
        try {
            // Get user_id for the listing
            const { data: listingData } = await supabaseClient
                .from('listings')
                .select('user_id')
                .eq('id', listing_id)
                .single();

            if (listingData?.user_id) {
                // Fetch user specific active settings
                const { data: userSettings } = await supabaseClient
                    .from('v_user_seo_active_settings')
                    .select('*')
                    .eq('user_id', listingData.user_id)
                    .single();

                // Construct backend payload mirroring frontend's getSmartBadgePayload and strategy
                const parameters = {
                    Volume: userSettings?.param_volume ?? 5,
                    Competition: userSettings?.param_competition ?? 5,
                    Transaction: userSettings?.param_transaction ?? 5,
                    Niche: userSettings?.param_niche ?? 5,
                    CPC: userSettings?.param_cpc ?? 5,
                    
                    evergreen_stability_ratio: userSettings?.evergreen_stability_ratio ?? 0.5,
                    evergreen_minimum_volume: userSettings?.evergreen_minimum_volume ?? 100,
                    evergreen_avg_volume: userSettings?.evergreen_avg_volume ?? 250,
                    trending_dropping_threshold: userSettings?.trending_dropping_threshold ?? -0.2,
                    trending_current_month_min_volume: userSettings?.trending_current_month_min_volume ?? 100,
                    trending_growth_factor: userSettings?.trending_growth_factor ?? 1.15,
                    promising_min_score: userSettings?.promising_min_score ?? 70,
                    promising_competition: userSettings?.promising_competition ?? 0.4,
                    
                    ai_selection_count: userSettings?.ai_selection_count ?? 13,
                    working_pool_count: userSettings?.working_pool_count ?? 40,
                    concept_diversity_limit: userSettings?.concept_diversity_limit ?? 3,
                };

                // Use N8N_WEBHOOK_URL_RESET_POOL env var (production URL, not test URL)
                const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL_RESET_POOL');
                if (!webhookUrl) {
                    console.error('Missing env var: N8N_WEBHOOK_URL_RESET_POOL. Cannot trigger resetPool.');
                    return;
                }
                
                // Fire and forget fetch to n8n webhook
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'resetPool',
                        listing_id: listing_id,
                        parameters: parameters
                    })
                }).catch(err => console.error("Failed to trigger resetPool webhook:", err));
            }
        } catch (resetPoolErr) {
            console.error("Error initiating resetPool:", resetPoolErr);
            // We don't throw here, we still want to return 200 since SEO was saved
        }
    }

    return new Response(JSON.stringify({ success: true, message: 'SEO Data Saved Successfully', listing_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
